import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from "components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "components/ui/dialog";
import { Input } from "components/ui/input";
import { Label } from "components/ui/label";
import { ScrollArea } from "components/ui/scroll-area";
import { Badge } from "components/ui/badge";
import { format } from "date-fns";
import { Clock, Edit, Trash2, GripVertical, PlusCircle } from "lucide-react";
import { challengeCategoryIcons } from "utils/ClientAssets";
import { EditGameFormSchema } from './game/EditGameSchema';
import { UseFormReturn, useWatch } from 'react-hook-form';

import * as z from 'zod';
import { DateTimePicker24h } from 'components/ui/data-time-picker';
import AlertConformer from 'components/modules/AlertConformer';
import { useTranslation } from 'react-i18next';

interface TimePoint {
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
}

interface ChallengeBlock {
    id: number;
    name: string;
    category: string;
    score: number;
    belongStage: string | null;
}

interface GameTimelineEditorProps {
    form: UseFormReturn<z.infer<typeof EditGameFormSchema>>;
}

interface DraggedChallenge {
    challenge: ChallengeBlock;
    dragStartX: number;
    dragStartY: number;
}

export function GameTimelineEditor({
    form,
}: GameTimelineEditorProps) {

    const { t } = useTranslation("game_edit")
    const { t: commonT } = useTranslation()

    const gameStartTime = form.getValues("start_time") || new Date();
    const gameEndTime = form.getValues("end_time") || new Date();

    // 时间线编辑器相关函数
    const handleTimePointsChange = (timePoints: any[]) => {
        // 检查是否有时间段被删除
        const currentStages = form.getValues("stages") || [];
        const deletedStageNames = currentStages
            .filter(oldStage => !timePoints.find(newStage => newStage.name === oldStage.stage_name))
            .map(stage => stage.stage_name);

        // 将删除时间段的题目移回全局
        if (deletedStageNames.length > 0) {
            const currentChallenges = form.getValues("challenges") || [];
            currentChallenges.forEach((challenge, index) => {
                if (challenge.belong_stage && deletedStageNames.includes(challenge.belong_stage)) {
                    form.setValue(`challenges.${index}.belong_stage`, null);
                }
            });
        }

        const stages = timePoints.map(tp => ({
            stage_name: tp.name,
            start_time: tp.startTime,
            end_time: tp.endTime,
        }));

        form.setValue("stages", stages);
    };

    const handleChallengeAssignmentChange = (challengeId: number, stageId: string | null) => {

        // 使用实时的 challenges 数据而不是静态的 challengeFields
        const currentChallenges = form.getValues("challenges") || [];
        const challengeIndex = currentChallenges.findIndex(c => c.challenge_id === challengeId);

        if (challengeIndex !== -1) {
            // 如果 stageId 是 null，则设置为全局
            if (stageId === null) {
                form.setValue(`challenges.${challengeIndex}.belong_stage`, null);
                return;
            }

            // 从当前的时间点数据中找到对应的stage_name
            const currentStages = form.getValues("stages") || [];
            const stageIndex = parseInt(stageId.replace('stage_', ''));

            if (stageIndex >= 0 && stageIndex < currentStages.length) {
                const stageName = currentStages[stageIndex].stage_name;
                form.setValue(`challenges.${challengeIndex}.belong_stage`, stageName);
            } else {
                console.error(`${t("timeline.invalid.index")}: ${stageIndex}`);
            }
        } else {
            console.error(`${t("timeline.invalid.id")}: ${challengeId}`);
        }
    };

    // 使用 useWatch 监听 stages 字段的变化，确保 timePoints 实时更新
    const watchedStages = useWatch({
        control: form.control,
        name: "stages"
    });

    // 使用 useWatch 监听 challenges 字段的变化，确保 challengeBlocks 实时更新
    const watchedChallenges = useWatch({
        control: form.control,
        name: "challenges"
    });

    // 转换数据格式给时间线编辑器
    const timePoints = (watchedStages || []).map((stage, index) => ({
        id: `stage_${index}`,
        name: stage.stage_name,
        startTime: stage.start_time,
        endTime: stage.end_time,
    }));

    const challenges = (watchedChallenges || []).map(challenge => {
        // 将belong_stage转换为对应的ID
        let belongStageId = null;
        if (challenge.belong_stage) {
            const stages = watchedStages || [];
            const stageIndex = stages.findIndex(stage => stage.stage_name === challenge.belong_stage);
            if (stageIndex !== -1) {
                belongStageId = `stage_${stageIndex}`;
            }
        }

        return {
            id: challenge.challenge_id || 0,
            name: challenge.challenge_name || "",
            category: challenge.category || "misc",
            score: challenge.total_score || 0,
            belongStage: belongStageId,
        };
    });


    const [draggedChallenge, setDraggedChallenge] = useState<DraggedChallenge | null>(null);
    const [isEditingTimePoint, setIsEditingTimePoint] = useState<string | null>(null);
    const [isCreatingTimePoint, setIsCreatingTimePoint] = useState(false);
    const [newTimePoint, setNewTimePoint] = useState({
        name: '',
        startTime: (() => {
            const now = new Date();
            now.setHours(9, 0, 0, 0); // 默认上午9点
            return now;
        })(),
        endTime: (() => {
            const now = new Date();
            now.setHours(17, 0, 0, 0); // 默认下午5点
            return now;
        })(),
    });
    const [editingTimePoint, setEditingTimePoint] = useState({
        name: '',
        startTime: (() => {
            const now = new Date();
            now.setHours(9, 0, 0, 0);
            return now;
        })(),
        endTime: (() => {
            const now = new Date();
            now.setHours(17, 0, 0, 0);
            return now;
        })(),
    });

    const timelineRef = useRef<HTMLDivElement>(null);
    const challengeIcons = challengeCategoryIcons;

    // 计算时间轴的总持续时间（毫秒）
    const totalDuration = useMemo(() => {
        return gameEndTime.getTime() - gameStartTime.getTime();
    }, [gameStartTime, gameEndTime]);

    // 将时间转换为时间轴上的位置百分比
    const timeToPosition = useCallback((time: Date) => {
        const timeOffset = time.getTime() - gameStartTime.getTime();
        return Math.max(0, Math.min(100, (timeOffset / totalDuration) * 100));
    }, [gameStartTime, totalDuration]);

    // 将位置百分比转换为时间
    const positionToTime = useCallback((position: number) => {
        const timeOffset = (position / 100) * totalDuration;
        return new Date(gameStartTime.getTime() + timeOffset);
    }, [gameStartTime, totalDuration]);

    // 处理拖拽开始
    const handleDragStart = (e: React.DragEvent, challenge: ChallengeBlock) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setDraggedChallenge({
            challenge,
            dragStartX: e.clientX - rect.left,
            dragStartY: e.clientY - rect.top,
        });
        e.dataTransfer.effectAllowed = 'move';
    };

    // 处理拖拽结束
    const handleDragEnd = () => {
        setDraggedChallenge(null);
    };

    // 处理时间轴上的drop
    const handleTimelineDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedChallenge || !timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const dropX = e.clientX - rect.left;
        const position = (dropX / rect.width) * 100;
        const dropTime = positionToTime(position);

        // 查找落在哪个时间段
        let targetStage: string | null = null;
        for (const timePoint of timePoints) {
            if (dropTime >= timePoint.startTime && dropTime <= timePoint.endTime) {
                targetStage = timePoint.id;
                break;
            }
        }

        handleChallengeAssignmentChange(draggedChallenge.challenge.id, targetStage);
        setDraggedChallenge(null);
    };

    // 处理时间轴拖拽悬停
    const handleTimelineDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // 添加新时间点
    const handleAddTimePoint = () => {
        const newId = `stage_${Date.now()}`;
        const newPoint: TimePoint = {
            id: newId,
            name: newTimePoint.name,
            startTime: newTimePoint.startTime,
            endTime: newTimePoint.endTime,
        };
        handleTimePointsChange([...timePoints, newPoint]);

        // 重置表单
        setNewTimePoint({
            name: '',
            startTime: (() => {
                const now = new Date();
                now.setHours(9, 0, 0, 0);
                return now;
            })(),
            endTime: (() => {
                const now = new Date();
                now.setHours(17, 0, 0, 0);
                return now;
            })(),
        });
        setIsCreatingTimePoint(false);
    };

    // 开始编辑时间点
    const handleStartEditTimePoint = (id: string) => {
        const timePoint = timePoints.find(tp => tp.id === id);
        if (timePoint) {
            setEditingTimePoint({
                name: timePoint.name,
                startTime: timePoint.startTime,
                endTime: timePoint.endTime,
            });
            setIsEditingTimePoint(id);
        }
    };

    // 保存编辑的时间点
    const handleSaveEditTimePoint = () => {
        if (!isEditingTimePoint) return;

        const updatedTimePoints = timePoints.map(tp =>
            tp.id === isEditingTimePoint
                ? {
                    ...tp,
                    name: editingTimePoint.name,
                    startTime: editingTimePoint.startTime,
                    endTime: editingTimePoint.endTime,
                }
                : tp
        );
        handleTimePointsChange(updatedTimePoints);
        setIsEditingTimePoint(null);
    };

    // 删除时间点
    const handleDeleteTimePoint = (id: string) => {
        // 先将属于这个时间段的题目重置为全局
        challenges.forEach(challenge => {
            if (challenge.belongStage === id) {
                handleChallengeAssignmentChange(challenge.id, null);
            }
        });

        // 然后删除时间点
        const updatedTimePoints = timePoints.filter(tp => tp.id !== id);
        handleTimePointsChange(updatedTimePoints);
    };

    // 根据归属分组题目
    const groupedChallenges = useMemo(() => {
        const global: ChallengeBlock[] = [];
        const staged: { [key: string]: ChallengeBlock[] } = {};

        challenges.forEach(challenge => {
            if (challenge.belongStage === null) {
                global.push(challenge);
            } else {
                if (!staged[challenge.belongStage]) {
                    staged[challenge.belongStage] = [];
                }
                staged[challenge.belongStage].push(challenge);
            }
        });

        return { global, staged };
    }, [challenges]);

    return (
        <div className="w-full space-y-6">
            {/* 时间轴区域 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{t("timeline.title")}</CardTitle>
                        <Dialog open={isCreatingTimePoint} onOpenChange={setIsCreatingTimePoint}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <PlusCircle className="h-4 w-4" />
                                    {t("timeline.add.button")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t("timeline.add.title")}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <div className='h-[30px] flex items-center'>
                                            <Label htmlFor="stageName">{t("timeline.name")}</Label>
                                        </div>
                                        <Input
                                            id="stageName"
                                            value={newTimePoint.name}
                                            onChange={(e) => setNewTimePoint(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder={t("timeline.placeholder")}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className='h-[30px] flex items-center'>
                                                <Label>{t("timeline.start")}</Label>
                                            </div>
                                            <DateTimePicker24h
                                                date={newTimePoint.startTime}
                                                onDateSelect={(date) => {
                                                    setNewTimePoint(prev => ({ ...prev, startTime: date }))
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <div className='h-[30px] flex items-center'>
                                                <Label>{t("timeline.end")}</Label>
                                            </div>
                                            <DateTimePicker24h
                                                date={newTimePoint.endTime}
                                                onDateSelect={(date) => {
                                                    setNewTimePoint(prev => ({ ...prev, endTime: date }))
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => setIsCreatingTimePoint(false)}>
                                            {commonT("cancel")}
                                        </Button>
                                        <Button onClick={handleAddTimePoint} disabled={!newTimePoint.name.trim()}>
                                            {commonT("confirm")}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* 时间轴 */}
                    <div className="relative">
                        {/* 时间标签 */}
                        <div className="flex justify-between mb-2 text-sm text-muted-foreground">
                            <span>{format(gameStartTime, "MM/dd HH:mm")}</span>
                            <span>{format(gameEndTime, "MM/dd HH:mm")}</span>
                        </div>

                        {/* 主时间轴 */}
                        <div
                            ref={timelineRef}
                            className="relative h-12 bg-muted rounded-lg border-2 border-dashed border-muted-foreground/20"
                            onDrop={handleTimelineDrop}
                            onDragOver={handleTimelineDragOver}
                        >
                            {/* 时间段显示 */}
                            {timePoints.map((timePoint) => {
                                const startPos = timeToPosition(timePoint.startTime);
                                const endPos = timeToPosition(timePoint.endTime);
                                const width = endPos - startPos;

                                return (
                                    <div
                                        key={timePoint.id}
                                        className="absolute top-1 bottom-1 bg-primary/20 border border-primary/40 rounded-md flex items-center justify-center text-xs font-medium px-2"
                                        style={{
                                            left: `${startPos}%`,
                                            width: `${width}%`,
                                        }}
                                        data-tooltip-id="my-tooltip"
                                        data-tooltip-place="top"
                                        data-tooltip-content={`${timePoint.name}(${challenges.filter(c => c.belongStage === timePoint.id).length}) ${format(timePoint.startTime, "MM/dd HH:mm")} - ${format(timePoint.endTime, "MM/dd HH:mm")}`}
                                    >
                                        <span className="truncate px-1">{timePoint.name}({challenges.filter(c => c.belongStage === timePoint.id).length})</span>
                                        <div className="flex gap-1 ml-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                type='button'
                                                className="h-4 w-4 p-0 hover:bg-transparent text-primary/60 hover:text-primary"
                                                onClick={() => handleStartEditTimePoint(timePoint.id)}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <AlertConformer
                                                title={t("timeline.delete.title")}
                                                description={t("timeline.delete.description")}
                                                type="danger"
                                                onConfirm={() => handleDeleteTimePoint(timePoint.id)}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    type='button'
                                                    className="h-4 w-4 p-0 hover:bg-transparent text-primary/60 hover:text-primary"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </AlertConformer>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* 拖拽提示 */}
                            {timePoints.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
                                    {t("timeline.drag")}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 编辑时间段对话框 */}
            <Dialog open={isEditingTimePoint !== null} onOpenChange={() => setIsEditingTimePoint(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("timeline.edit")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <div className='h-[30px] flex items-center'>
                                <Label htmlFor="editStageName">{t("timeline.name")}</Label>
                            </div>
                            <Input
                                id="editStageName"
                                value={editingTimePoint.name}
                                onChange={(e) => setEditingTimePoint(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={t("timeline.placeholder")}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className='h-[30px] flex items-center'>
                                    <Label>{t("timeline.start")}</Label>
                                </div>
                                <DateTimePicker24h
                                    date={editingTimePoint.startTime}
                                    onDateSelect={(date) => {
                                        setEditingTimePoint(prev => ({ ...prev, startTime: date }))
                                    }}
                                />
                            </div>
                            <div>
                                <div className='h-[30px] flex items-center'>
                                    <Label>{t("timeline.end")}</Label>
                                </div>
                                <DateTimePicker24h
                                    date={editingTimePoint.endTime}
                                    onDateSelect={(date) => {
                                        setEditingTimePoint(prev => ({ ...prev, endTime: date }))
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsEditingTimePoint(null)}>
                                {commonT("cancel")}
                            </Button>
                            <Button onClick={handleSaveEditTimePoint} disabled={!editingTimePoint.name.trim()}>
                                {commonT("confirm")}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 题目分配区域 */}
            <div className="grid grid-cols-12 gap-6">
                {/* 全局题目 */}
                <div className="col-span-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t("timeline.global.title")}</CardTitle>
                            <p className="text-sm text-muted-foreground">{t("timeline.global.description")}</p>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="">
                                <div className="space-y-2 pr-[10px]">
                                    {groupedChallenges.global.map((challenge) => (
                                        <div
                                            key={challenge.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, challenge)}
                                            onDragEnd={handleDragEnd}
                                            className="flex items-center gap-2 p-2 bg-muted rounded cursor-move hover:bg-muted/80 transition-colors"
                                        >
                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                            {challengeIcons[challenge.category?.toLowerCase() || 'misc']}
                                            <span className="font-medium text-sm">{challenge.name}</span>
                                            <Badge variant="outline" className="ml-auto">
                                                {challenge.score}pts
                                            </Badge>
                                        </div>
                                    ))}
                                    {groupedChallenges.global.length === 0 && (
                                        <p className="text-center text-muted-foreground text-sm py-8">
                                            {t("timeline.global.empty")}
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* 时间段题目 */}
                <div className="col-span-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t("timeline.timeline.title")}</CardTitle>
                            <p className="text-sm text-muted-foreground">{t("timeline.timeline.description")}</p>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="">
                                {timePoints.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-8">
                                        {t("timeline.timeline.empty")}
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {timePoints.map((timePoint) => (
                                            <div key={timePoint.id} className="border rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="font-medium">{timePoint.name}</h4>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Clock className="h-4 w-4" />
                                                        <span className='mr-2'>
                                                            {format(timePoint.startTime, "MM/dd HH:mm")} - {format(timePoint.endTime, "MM/dd HH:mm")}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            type='button'
                                                            className="h-4 w-4 p-0 hover:bg-transparent text-primary/60 hover:text-primary"
                                                            onClick={() => handleStartEditTimePoint(timePoint.id)}
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                        <AlertConformer
                                                            title={t("timeline.delete.title")}
                                                            description={t("timeline.delete.description")}
                                                            type="danger"
                                                            onConfirm={() => handleDeleteTimePoint(timePoint.id)}
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                type='button'
                                                                className="h-4 w-4 p-0 hover:bg-transparent text-primary/60 hover:text-primary"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </AlertConformer>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {(groupedChallenges.staged[timePoint.id] || []).map((challenge) => (
                                                        <div
                                                            key={challenge.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, challenge)}
                                                            onDragEnd={handleDragEnd}
                                                            className="flex items-center gap-2 p-2 bg-primary/5 rounded cursor-move hover:bg-primary/10 transition-colors"
                                                        >
                                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                            {challengeIcons[challenge.category?.toLowerCase() || 'misc']}
                                                            <span className="font-medium text-sm">{challenge.name}</span>
                                                            <Badge variant="outline" className="ml-auto">
                                                                {challenge.score}pts
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                    {(!groupedChallenges.staged[timePoint.id] || groupedChallenges.staged[timePoint.id].length === 0) && (
                                                        <p className="text-center text-muted-foreground text-sm py-4">
                                                            {t("timeline.timeline.drag")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
} 