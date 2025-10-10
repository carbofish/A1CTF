package k8stool

import (
	redistool "a1ctf/src/utils/redis_tool"
	"a1ctf/src/utils/zaphelper"
	"context"
	"database/sql/driver"
	"errors"
	"flag"
	"fmt"
	"net"

	"github.com/bytedance/sonic"
	"github.com/go-playground/validator/v10"
	"github.com/spf13/viper"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/apimachinery/pkg/util/validation"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

var clientset *kubernetes.Clientset
var globalConfig *rest.Config
var NodeAddressMap map[string]string = make(map[string]string)

func InitNodeAddressMap() {

	var nodeIPMaps []map[string]interface{}
	if err := viper.UnmarshalKey("k8s.node-ip-map", &nodeIPMaps); err != nil {
		panic(fmt.Errorf("failed to unmarshal node-ip-map: %v", err))
	}

	for _, nodeIPMap := range nodeIPMaps {
		NodeAddressMap[nodeIPMap["name"].(string)] = nodeIPMap["address"].(string)
	}
}

var NodePortMap map[string]*Allocator = make(map[string]*Allocator)

func InitNodePortRangeMap() {

	var nodePortRangeMaps []map[string]interface{}
	if err := viper.UnmarshalKey("k8s.manual-port-assignments.port-range-map", &nodePortRangeMaps); err != nil {
		panic(fmt.Errorf("failed to unmarshal k8s.manual-port-assignments.port-range-map: %v", err))
	}

	nodePortRanges := make(map[string][]PortRange)

	for _, nodeIPMap := range nodePortRangeMaps {
		nodePort := PortRange{
			NodeName: nodeIPMap["name"].(string),
			Start:    nodeIPMap["start"].(int),
			End:      nodeIPMap["end"].(int),
		}
		nodePortRanges[nodePort.NodeName] = append(nodePortRanges[nodePort.NodeName], nodePort)
	}

	for nodeName, nodePortRange := range nodePortRanges {
		ownerName := fmt.Sprintf("node-port-map-%s", nodeName)
		NodePortMap[nodeName] = NewAllocator(redistool.RedisClient, ownerName, ownerName, nodePortRange)
	}
}

type PortName struct {
	Name string `json:"name" validate:"required,portname" label:"PortName" message:"Port name must be a DNS_LABEL"`
	Port int32  `json:"port" validate:"min=1,max=65535" label:"Port" message:"Port must be between 1 and 65535"`
}

type A1Container struct {
	Name         string          `json:"name" validate:"required,dns_label" label:"ContainerName" message:"Container must be a DNS_LABEL"`
	Image        string          `json:"image" validate:"required" label:"ContainerImage"`
	Command      []string        `json:"command" validate:"-"`
	Env          []corev1.EnvVar `json:"env" validate:"-"`
	ExposePorts  []PortName      `json:"expose_ports" validate:"dive"`
	CPULimit     int64           `json:"cpu_limit" validate:"min=0" label:"CPULimit" message:"CPU limit must be greater than 0"`
	MemoryLimit  int64           `json:"memory_limit" validate:"min=0" label:"MemoryLimit" message:"Memory limit must be greater than 0"`
	StorageLimit int64           `json:"storage_limit" validate:"min=0" label:"StorageLimit" message:"Storage limit must be greater than 0"`
}

// 自定义验证函数 - 验证DNS标签格式
func validateDNSLabel(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	return len(validation.IsDNS1123Label(value)) == 0
}

// 自定义验证函数 - 验证端口名称格式
func validatePortName(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	return len(validation.IsValidPortName(value)) == 0
}

func ValidContainerConfig(containers []A1Container) error {
	validate := validator.New()

	// 注册自定义验证函数
	_ = validate.RegisterValidation("dns_label", validateDNSLabel)
	_ = validate.RegisterValidation("portname", validatePortName)

	for _, container := range containers {
		err := validate.Struct(container)
		if err != nil {
			// 处理验证错误
			if validationErrors, ok := err.(validator.ValidationErrors); ok {
				for _, fieldErr := range validationErrors {
					return fmt.Errorf("field %s failed validation with tag %s value %s",
						fieldErr.Field(),
						fieldErr.Tag(),
						fieldErr.Value(),
					)
				}
			} else {
				return fmt.Errorf("validation error: %v", err)
			}
		}
	}
	return nil
}

type A1Containers []A1Container

func (e A1Containers) Value() (driver.Value, error) {
	return sonic.Marshal(e)
}

func (e *A1Containers) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return sonic.Unmarshal(b, e)
}

type PodInfo struct {
	Name       string
	TeamHash   string
	Labels     map[string]string
	Containers []A1Container
	Flag       string
	AllowWAN   bool
	AllowDNS   bool
}

func GetClient() (*kubernetes.Clientset, error) {

	if clientset != nil {
		return clientset, nil
	}

	kubeconfig := flag.String("kubeconfig", viper.GetString("k8s.k8s-config-file"), "absolute path to the kubeconfig file")
	flag.Parse()

	config, err := clientcmd.BuildConfigFromFlags("", *kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("error building kubeconfig: %v", err)
	}

	globalConfig = config

	clientsetLocal, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("error creating clientset: %v", err)
	}

	clientset = clientsetLocal

	return clientsetLocal, nil
}

func GetClientConfig() *rest.Config {
	return globalConfig
}

func ListPods() (*corev1.PodList, error) {
	clientset, err := GetClient()
	if err != nil {
		return nil, err
	}
	namespace := "a1ctf-challenges"

	podList, err := clientset.CoreV1().Pods(namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("error listing pods: %v", err)
	}

	return podList, nil
}

func IsIPv6(addr string) bool {
	ip := net.ParseIP(addr)
	if ip == nil {
		return false
	}
	return ip.To4() == nil
}

func CreatePod(podInfo *PodInfo) error {
	clientset, err := GetClient()
	if err != nil {
		return err
	}
	namespace := "a1ctf-challenges"

	// 构造 Pod 中的容器列表
	var containers []corev1.Container
	for _, c := range podInfo.Containers {
		containerName := c.Name
		container := corev1.Container{
			Name:  containerName,
			Image: c.Image,
			Env:   []corev1.EnvVar{},
		}
		if len(c.Command) > 0 {
			container.Command = c.Command
		}
		if len(c.Env) > 0 {
			container.Env = c.Env
		}

		// add the flag env
		container.Env = append(container.Env, corev1.EnvVar{
			Name:  "A1CTF_FLAG",
			Value: podInfo.Flag,
		})

		if len(c.ExposePorts) > 0 {
			var containerPorts []corev1.ContainerPort
			for _, port := range c.ExposePorts {
				containerPorts = append(containerPorts, corev1.ContainerPort{
					ContainerPort: port.Port,
					Name:          port.Name,
				})
			}
			container.Ports = containerPorts
		}

		// 只限制资源，不申请资源
		limits := corev1.ResourceList{
			corev1.ResourceCPU:              *resource.NewMilliQuantity(c.CPULimit, resource.DecimalSI),         // 100m = 0.1 CPU
			corev1.ResourceMemory:           *resource.NewQuantity(c.MemoryLimit*1024*1024, resource.BinarySI),  // 64Mi
			corev1.ResourceEphemeralStorage: *resource.NewQuantity(c.StorageLimit*1024*1024, resource.BinarySI), // 128Mi
		}

		// 明确设置资源请求为 0
		requests := corev1.ResourceList{
			corev1.ResourceCPU:              *resource.NewMilliQuantity(0, resource.DecimalSI),
			corev1.ResourceMemory:           *resource.NewQuantity(0, resource.BinarySI),
			corev1.ResourceEphemeralStorage: *resource.NewQuantity(0, resource.BinarySI),
		}

		container.Resources = corev1.ResourceRequirements{
			Limits:   limits,
			Requests: requests,
		}

		containers = append(containers, container)
	}

	fastVal := false

	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:   podInfo.Name,
			Labels: podInfo.Labels,
		},
		Spec: corev1.PodSpec{
			Containers:         containers,
			EnableServiceLinks: &fastVal,
		},
	}

	if viper.GetBool("k8s.custom-dns-server.enabled") {
		pod.Spec.DNSPolicy = corev1.DNSNone
		pod.Spec.DNSConfig = &corev1.PodDNSConfig{}
		pod.Spec.DNSConfig.Nameservers = viper.GetStringSlice("k8s.custom-dns-server.nameservers")
	}

	secretNames := viper.GetStringSlice("k8s.pull-secret-names")
	if len(secretNames) > 0 {
		secrets := make([]corev1.LocalObjectReference, len(secretNames))
		for i, secretName := range secretNames {
			secrets[i] = corev1.LocalObjectReference{Name: secretName}
		}
		pod.Spec.ImagePullSecrets = secrets
	}

	// 创建 Pod
	_, err = clientset.CoreV1().Pods(namespace).Create(context.Background(), pod, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("error creating pod: %v", err)
	}

	if !viper.GetBool("k8s.manual-port-assignments.enabled") {
		// 构造 Service 的端口配置
		var servicePorts []corev1.ServicePort
		for c_index, c := range podInfo.Containers {
			if len(c.ExposePorts) > 0 {
				for _, port := range c.ExposePorts {
					servicePort := corev1.ServicePort{
						Name:       fmt.Sprintf("%d-%s", c_index, port.Name), // 可根据需要自定义 ServicePort 名称
						Port:       port.Port,
						TargetPort: intstr.FromInt(int(port.Port)),
					}
					servicePorts = append(servicePorts, servicePort)
				}
			}
		}

		if len(servicePorts) > 0 {
			service := &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{
					Name: podInfo.Name,
				},
				Spec: corev1.ServiceSpec{
					Type:     corev1.ServiceTypeNodePort,
					Selector: podInfo.Labels,
					Ports:    servicePorts,
				},
			}

			_, err = clientset.CoreV1().Services(namespace).Create(context.Background(), service, metav1.CreateOptions{})
			if err != nil {
				return fmt.Errorf("error creating service: %v", err)
			}
		}
	}

	allowedPorts := []networkingv1.NetworkPolicyPort{}
	for _, c := range podInfo.Containers {
		for _, port := range c.ExposePorts {
			allowedPorts = append(allowedPorts, networkingv1.NetworkPolicyPort{
				// all the protocols
				// Protocol: func() *v1.Protocol {
				// 	p := v1.ProtocolTCP
				// 	return &p
				// }(),
				Port: &intstr.IntOrString{IntVal: port.Port},
			})
		}
	}

	if !podInfo.AllowWAN {
		// 创建 network-policy
		networkPolicy := &networkingv1.NetworkPolicy{
			ObjectMeta: metav1.ObjectMeta{
				Name: podInfo.Name,
			},
			Spec: networkingv1.NetworkPolicySpec{
				PodSelector: metav1.LabelSelector{
					MatchLabels: podInfo.Labels,
				},
				PolicyTypes: []networkingv1.PolicyType{
					networkingv1.PolicyTypeIngress,
					networkingv1.PolicyTypeEgress,
				},
				Ingress: []networkingv1.NetworkPolicyIngressRule{
					{
						From: []networkingv1.NetworkPolicyPeer{
							{
								// forbid all traffic to 10.0.0.0/8
								IPBlock: &networkingv1.IPBlock{
									CIDR: "0.0.0.0/0",
									Except: []string{
										"10.0.0.0/8",
									},
								},
							},
						},
						Ports: allowedPorts,
					},
				},
				Egress: []networkingv1.NetworkPolicyEgressRule{},
			},
		}

		if podInfo.AllowDNS {
			dnsEgressRule := networkingv1.NetworkPolicyEgressRule{
				To: []networkingv1.NetworkPolicyPeer{
					// clear
				},
				Ports: []networkingv1.NetworkPolicyPort{
					{
						Protocol: func() *corev1.Protocol {
							p := corev1.ProtocolUDP
							return &p
						}(),
						Port: &intstr.IntOrString{IntVal: 53},
					},
					{
						Protocol: func() *corev1.Protocol {
							p := corev1.ProtocolTCP
							return &p
						}(),
						Port: &intstr.IntOrString{IntVal: 53},
					},
				},
			}

			// 处理自定义 pod dns 服务器情况下的 dns出网, 处理某些奇怪的集群默认 dns 是坏的 ?()
			if !viper.GetBool("k8s.custom-dns-server.enabled") {
				// 如果是默认使用 ClusterFirst, 需要添加 k8s 内部 dns 服务的匹配
				dnsEgressRule.To = append(dnsEgressRule.To, networkingv1.NetworkPolicyPeer{
					NamespaceSelector: &metav1.LabelSelector{
						MatchLabels: map[string]string{
							"kubernetes.io/metadata.name": "kube-system",
						},
					},
					PodSelector: &metav1.LabelSelector{
						MatchLabels: map[string]string{
							"k8s-app": "kube-dns",
						},
					},
				})
			} else {
				// 否则就为每一个 ns 添加出站规则
				for _, ns := range viper.GetStringSlice("k8s.custom-dns-server.nameservers") {
					if IsIPv6(ns) {
						dnsEgressRule.To = append(dnsEgressRule.To, networkingv1.NetworkPolicyPeer{
							IPBlock: &networkingv1.IPBlock{
								CIDR: fmt.Sprintf("%s/128", ns),
							},
						})
					} else {
						dnsEgressRule.To = append(dnsEgressRule.To, networkingv1.NetworkPolicyPeer{
							IPBlock: &networkingv1.IPBlock{
								CIDR: fmt.Sprintf("%s/32", ns),
							},
						})
					}
				}
			}

			networkPolicy.Spec.Egress = append(networkPolicy.Spec.Egress, dnsEgressRule)
		}

		_, err = clientset.NetworkingV1().NetworkPolicies(namespace).Create(context.Background(), networkPolicy, metav1.CreateOptions{})
		if err != nil {
			return fmt.Errorf("error creating network policy: %v", err)
		}
	}

	return nil
}

type PodPort struct {
	Name     string `json:"name"`
	Port     int32  `json:"port"`
	NodePort int32  `json:"node_port"`
	NodeName string `json:"node_name"`
}

type PodPorts []PodPort

func GetPodPorts(podInfo *PodInfo) (*PodPorts, error) {
	clientset, err := GetClient()
	if err != nil {
		return nil, err
	}
	namespace := "a1ctf-challenges"

	// 获取 Pod，检查其所在的 Node
	pod, err := clientset.CoreV1().Pods(namespace).Get(context.Background(), podInfo.Name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("error getting pod: %v", err)
	}
	if pod.Spec.NodeName == "" {
		return nil, fmt.Errorf("pod %s not scheduled on a node yet", podInfo.Name)
	}
	nodeName := pod.Spec.NodeName

	// 获取对应 Service 信息
	if !viper.GetBool("k8s.manual-port-assignments.enabled") {
		service, err := clientset.CoreV1().Services(namespace).Get(context.Background(), podInfo.Name, metav1.GetOptions{})
		if err != nil {
			return nil, fmt.Errorf("error getting service: %v", err)
		}

		result := make(PodPorts, 0)
		for _, port := range service.Spec.Ports {
			result = append(result, PodPort{
				Name:     port.Name,
				Port:     port.Port,
				NodePort: port.NodePort,
				NodeName: nodeName,
			})
		}

		return &result, nil
	} else {
		portAlloc, exists := NodePortMap[nodeName]
		if !exists {
			return nil, fmt.Errorf("node %s not found in port range map", nodeName)
		}

		result := make(PodPorts, 0)
		var servicePorts []corev1.ServicePort
		for c_index, c := range podInfo.Containers {
			if len(c.ExposePorts) > 0 {
				for _, port := range c.ExposePorts {

					availablePort, err := portAlloc.Get()
					if err != nil {
						return nil, err
					}

					servicePort := corev1.ServicePort{
						Name:       fmt.Sprintf("%d-%s", c_index, port.Name), // 可根据需要自定义 ServicePort 名称
						Port:       port.Port,
						TargetPort: intstr.FromInt(int(port.Port)),
						NodePort:   int32(availablePort),
					}
					servicePorts = append(servicePorts, servicePort)

					result = append(result, PodPort{
						Name:     fmt.Sprintf("%d-%s", c_index, port.Name),
						Port:     port.Port,
						NodePort: int32(availablePort),
						NodeName: nodeName,
					})
				}
			}
		}

		if len(servicePorts) > 0 {
			service := &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{
					Name: podInfo.Name,
				},
				Spec: corev1.ServiceSpec{
					Type:     corev1.ServiceTypeNodePort,
					Selector: podInfo.Labels,
					Ports:    servicePorts,
				},
			}

			_, err = clientset.CoreV1().Services(namespace).Create(context.Background(), service, metav1.CreateOptions{})
			if err != nil {
				return nil, fmt.Errorf("failed creating service with manual port assignment: %v", err)
			}
		}

		return &result, nil
	}
}

func DeletePod(podInfo *PodInfo, ports []int32) error {
	for _, port := range ports {
		for _, allocator := range NodePortMap {
			allocator.Release(int(port))
		}
	}

	return forceDeletePod(podInfo.Name)
}

func forceDeletePod(podName string) error {
	clientset, err := GetClient()
	if err != nil {
		return err
	}
	namespace := "a1ctf-challenges"

	// 忽略所有错误，删除三个组件，防止出问题

	// 删除 Pod
	_ = clientset.CoreV1().Pods(namespace).Delete(context.Background(), podName, metav1.DeleteOptions{
		GracePeriodSeconds: func(i int64) *int64 { return &i }(0),
	})
	// if err != nil {
	// 	return fmt.Errorf("error deleting pod: %v", err)
	// }

	// 删除 Service
	_ = clientset.CoreV1().Services(namespace).Delete(context.Background(), podName, metav1.DeleteOptions{})
	// if err != nil {
	// 	return fmt.Errorf("error deleting service: %v", err)
	// }

	// 删除 NetworkPolicy
	_ = clientset.NetworkingV1().NetworkPolicies(namespace).Delete(context.Background(), podName, metav1.DeleteOptions{})
	// if err != nil {
	// 	return fmt.Errorf("error deleting network policy: %v", err)
	// }

	return nil
}

func InitNamespace() error {
	clientset, err := GetClient()
	if err != nil {
		return err
	}
	namespace := "a1ctf-challenges"

	_, err = clientset.CoreV1().Namespaces().Get(context.Background(), namespace, metav1.GetOptions{})
	if err != nil {
		// 若获取出错则认为该命名空间不存在（实际使用中可判断错误类型）
		ns := &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Name: namespace,
			},
		}
		_, err = clientset.CoreV1().Namespaces().Create(context.Background(), ns, metav1.CreateOptions{})
		if err != nil {
			return fmt.Errorf("error creating namespace: %v", err)
		}
		zaphelper.Logger.Info("K8s namespace created")
	} else {
		zaphelper.Logger.Info("K8s namespace already exists")
	}

	return nil
}
