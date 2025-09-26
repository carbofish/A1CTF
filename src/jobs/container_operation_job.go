package jobs

import (
	"a1ctf/src/db/models"
	"a1ctf/src/tasks"
	dbtool "a1ctf/src/utils/db_tool"
	k8stool "a1ctf/src/utils/k8s_tool"
	"fmt"
	"log"
	"strconv"
	"time"

	"a1ctf/src/utils/zaphelper"

	"go.uber.org/zap"
	v1 "k8s.io/api/core/v1"
)

func findExistContainer(containers []models.Container, teamHash string, inGameID int64) *models.Container {
	for _, container := range containers {
		if container.TeamHash == teamHash && container.InGameID == inGameID {
			return &container
		}
	}
	return nil
}

func findExistPod(podList []v1.Pod, teamHash string, inGameID int64) *v1.Pod {
	for _, pod := range podList {
		if pod.Labels["team_hash"] == teamHash && pod.Labels["ingame_id"] == fmt.Sprintf("%d", inGameID) {
			return &pod
		}
	}
	return nil
}

func getContainerPorts(podInfo k8stool.PodInfo, task *models.Container) error {
	ports, err := k8stool.GetPodPorts(&podInfo)
	if err != nil {
		return fmt.Errorf("getContainerPorts error: %w", err)
	} else {
		for index, container := range task.ContainerConfig {
			for _, expose_port := range container.ExposePorts {
				port_name := fmt.Sprintf("%d-%s", index, expose_port.Name)

				expose_ports := make([]models.ExposePort, 0)

				for _, port := range *ports {
					if port.Name == port_name {

						address, ok := k8stool.NodeAddressMap[port.NodeName]
						if !ok {
							address = port.NodeName
						}

						expose_ports = append(expose_ports, models.ExposePort{
							PortName: expose_port.Name,
							Port:     port.NodePort,
							IP:       address,
						})
					}
				}

				task.ContainerExposeInfos = append(task.ContainerExposeInfos, models.ContainerExposeInfo{
					ContainerName: container.Name,
					ExposePorts:   expose_ports,
				})
			}
		}

		if err := dbtool.DB().Model(&task).Updates(map[string]interface{}{
			"container_status": models.ContainerRunning,
			"expose_ports":     task.ContainerExposeInfos,
		}).Error; err != nil {
			return fmt.Errorf("failed to update container status: %v", err)
		}

		tasks.LogContainerOperation(nil, nil, models.ActionContainerStarted, task.ContainerID, map[string]interface{}{
			"game_id":               task.GameID,
			"team_id":               task.TeamID,
			"team_hash":             task.TeamHash,
			"challenge_name":        task.ChallengeName,
			"ingame_id":             task.InGameID,
			"pod_name":              podInfo.Name,
			"container_id":          task.ContainerID,
			"container_expose_info": task.ContainerExposeInfos,
		}, nil)
	}

	return nil
}

func UpdateLivingContainers() {

	// log.Println("UpdateLivingContainers")

	var containers []models.Container
	if err := dbtool.DB().Where("container_status != ? AND container_status != ?", models.ContainerError, models.ContainerStopped).Preload("Challenge").Preload("TeamFlag").Find(&containers).Error; err != nil {
		log.Fatalf("Failed to find queued containers: %v\n", err)
	}

	// 没有容器信息就跳过，减少 k8s 请求
	if len(containers) == 0 {
		return
	}

	podList, err := k8stool.ListPods()
	if err != nil {
		zaphelper.Logger.Error("Failed to list pods", zap.Error(err))
		return
	}

	for _, pod := range podList.Items {
		podLabels := pod.Labels
		teamHash, exists1 := podLabels["team_hash"]
		inGameID, exists2 := podLabels["ingame_id"]

		if !exists1 || !exists2 {
			continue
		}

		inGameIDInt, err := strconv.ParseInt(inGameID, 10, 64)
		if err != nil {
			continue
		}

		container := findExistContainer(containers, teamHash, inGameIDInt)
		if container == nil {
			// zaphelper.Logger.Info("Stopping container that not found in database", zap.Any("container", container))
			// k8stool.ForceDeletePod(pod.Name)
			continue
		}

		podInfo := k8stool.PodInfo{
			Name:       fmt.Sprintf("cl-%d-%s", container.InGameID, container.TeamHash),
			TeamHash:   container.TeamHash,
			Containers: container.ContainerConfig,
			Labels: map[string]string{
				"team_hash": container.TeamHash,
				"ingame_id": fmt.Sprintf("%d", container.InGameID),
			},
			Flag:     container.TeamFlag.FlagContent,
			AllowWAN: container.Challenge.AllowWAN,
			AllowDNS: container.Challenge.AllowDNS,
		}

		podStatus, _ := k8stool.CheckPodStatus(&pod)
		// zaphelper.Logger.Info("pod status", zap.Any("podStatus", podStatus))

		if podStatus.Status == k8stool.CustomPodRunning {
			if container.ContainerStatus == models.ContainerStarting {
				// 如果远程服务器Pod已经是Running状态，就获取端口并且更新数据库
				zaphelper.Logger.Info("Getting container port", zap.Any("container", container))
				err := getContainerPorts(podInfo, container)
				if err != nil {
					zaphelper.Logger.Error("Failed to get container ports", zap.Error(err), zap.Any("container", container))
					tasks.NewContainerStopTask(*container)
				}
			}

			// 下面会处理
			// if time.Now().UTC().After(container.ExpireTime) {
			// 	// 如果远程服务器Pod已经是Running状态，并且已经超时，就删除Pod并且更新数据库
			// 	zaphelper.Logger.Info("Stopping container for life over", zap.Any("container", container))
			// 	tasks.NewContainerStopTask(*container)
			// }

			if container.ContainerStatus == models.ContainerStopped {
				zaphelper.Logger.Info("Stopping deaded container", zap.Any("container", container))
				tasks.NewContainerStopTask(*container)
			}
		} else if podStatus.Status == k8stool.CustomPodFailed {
			zaphelper.Logger.Info("Stopping failed container", zap.Any("container", container), zap.Any("pod_status", podStatus))
			tasks.NewContainerFailedTask(*container, podStatus)
		} else {
			// 等待中的容器
		}
	}

	for _, container := range containers {
		// 处理队列中的容器
		if container.ContainerStatus == models.ContainerQueueing {
			if err := dbtool.DB().Model(&container).Update("container_status", models.ContainerStarting).Error; err != nil {
				zaphelper.Logger.Error("failed to update container status", zap.Error(err), zap.Any("container", container))
				continue
			}
			zaphelper.Logger.Info("Starting container", zap.Any("container", container))
			tasks.NewContainerStartTask(container)
		}

		// 到期容器处理
		if time.Now().UTC().After(container.ExpireTime) &&
			container.ContainerStatus != models.ContainerStopping {
			zaphelper.Logger.Info("Deleting expired container", zap.Any("container", container))
			if err := dbtool.DB().Model(&container).Update("container_status", models.ContainerStopping).Error; err != nil {
				zaphelper.Logger.Error("failed to update container status", zap.Error(err), zap.Any("container", container))
				continue
			} else {
				container.ContainerStatus = models.ContainerStopping
			}
		}

		// 处理超时的容器 启动时间超过 10 分钟的
		if time.Now().UTC().Sub(container.StartTime) > 10*time.Minute &&
			container.ContainerStatus == models.ContainerStarting {
			zaphelper.Logger.Info("Deleting timeout starting container", zap.Any("container", container))
			if err := dbtool.DB().Model(&container).Update("container_status", models.ContainerStopping).Error; err != nil {
				zaphelper.Logger.Error("failed to update container status", zap.Error(err), zap.Any("container", container))
				continue
			} else {
				container.ContainerStatus = models.ContainerStopping
			}
		}

		// 上面更新了一次 到期/超时容器 的状态，在一次for循环中直接关闭该容器
		// 处理要求关闭的容器
		if container.ContainerStatus == models.ContainerStopping {
			if err := dbtool.DB().Model(&container).Update("container_status", models.ContainerStopped).Error; err != nil {
				zaphelper.Logger.Error("failed to update container status", zap.Error(err), zap.Any("container", container))
				continue
			}
			zaphelper.Logger.Info("Stopping container", zap.Any("container", container))
			tasks.NewContainerStopTask(container)
		}
	}
}
