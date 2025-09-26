import { useState, useEffect } from 'react';
import { Button } from "components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "components/ui/avatar";
import { Input } from "components/ui/input";
import { Label } from "components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "components/ui/card";
import { Badge } from "components/ui/badge";
import { Users, Trophy, Hash, Copy, Crown, UserMinus, UserPlus, Settings, Trash2, CircleArrowLeft, Upload, Group, Pencil, Ban, Gift, AlertTriangle, Calculator, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "components/ui/alert-dialog";
import { toast } from 'react-toastify/unstyled';
import copy from "copy-to-clipboard";
import dayjs from "dayjs";
import { useTheme } from "next-themes";
import { MacScrollbar } from "mac-scrollbar";
import { api } from 'utils/ApiHelper';
import type {
    TransferCaptainPayload,
    UpdateTeamInfoPayload,
    GameScoreboardData,
    TeamScore,
    UserSimpleGameChallenge
} from 'utils/A1API';
import { useLocation, useNavigate } from 'react-router';
import { UploadImageDialog } from 'components/dialogs/UploadImageDialog';
import { useGlobalVariableContext } from 'contexts/GlobalVariableContext';
import AlertConformer from 'components/modules/AlertConformer';
import { useGame } from 'hooks/UseGame';
import { useTranslation } from 'react-i18next';


const MyTeamInfomationView = ({
    gameID,
}: {
    gameID: number;
}) => {

    const { gameInfo, gameStatus } = useGame(gameID)
    const { theme } = useTheme();
    const { t } = useTranslation("team_view")

    const [scoreBoardData, setScoreBoardData] = useState<GameScoreboardData>();
    const [currentUserTeam, setCurrentUserTeam] = useState<TeamScore>();
    const [challenges, setChallenges] = useState<Record<string, UserSimpleGameChallenge[]>>({});
    const [loading, setLoading] = useState(false);
    const [sloganDialogOpen, setSloganDialogOpen] = useState(false);
    const [newSlogan, setNewSlogan] = useState('');

    const [dataLoaded, setDataLoaded] = useState(false)

    // 获取用户资料来确定当前用户ID
    const { curProfile } = useGlobalVariableContext()

    // 检查当前用户是否是队长
    const isTeamCaptain = gameInfo?.team_info?.team_members?.find(
        member => member.user_id === curProfile.user_id
    )?.captain || false;

    // 获取记分榜数据（包含解题情况）
    const fetchScoreBoardData = () => {

        if (gameStatus == "pending") {
            setDataLoaded(true)
            return
        }

        api.user.userGetGameScoreboard(gameID)
            .then((response) => {
                setScoreBoardData(response.data.data);

                // 分组题目
                const groupedChallenges: Record<string, UserSimpleGameChallenge[]> = {};
                response.data.data?.challenges?.forEach((challenge: UserSimpleGameChallenge) => {
                    const category = challenge.category?.toLowerCase() || "misc";
                    if (!groupedChallenges[category]) {
                        groupedChallenges[category] = [];
                    }
                    groupedChallenges[category].push(challenge);
                });
                setChallenges(groupedChallenges);

                // 找到当前用户的战队数据
                setCurrentUserTeam(response.data.data?.your_team);

                setDataLoaded(true)
            })
    };

    // 获取题目信息
    const getChallenge = (id: number): UserSimpleGameChallenge | undefined => {
        let target: UserSimpleGameChallenge | undefined;
        if (challenges) {
            Object.values(challenges).forEach((challengeList) => {
                const tmp = challengeList.find((challenge) => challenge.challenge_id === id);
                if (tmp) target = tmp;
            });
        }
        return target;
    };

    useEffect(() => {
        if (gameInfo && curProfile.user_id) {
            fetchScoreBoardData();
        }
    }, [gameInfo, curProfile.user_id]);

    useEffect(() => {
        if (gameInfo?.team_info?.team_id && scoreBoardData) {
            setCurrentUserTeam(scoreBoardData?.your_team);
        }
    }, [gameInfo, scoreBoardData]);

    // 转移队长
    const handleTransferCaptain = (newCaptainId: string) => {
        if (!gameInfo?.team_info?.team_id) return;

        setLoading(true);
        api.team.transferTeamCaptain(gameInfo.team_info.team_id, gameInfo.game_id, { new_captain_id: newCaptainId } as TransferCaptainPayload)
            .then(() => {
                toast.success(t("transfer_captain_success"));
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // 踢出队员
    const handleRemoveMember = (userId: string) => {
        if (!gameInfo?.team_info?.team_id) return;

        setLoading(true);
        api.team.removeTeamMember(gameInfo.team_info.team_id, userId, gameInfo.game_id)
            .then(() => {
                toast.success(t("remove_member_success"));
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // 解散战队
    const handleDeleteTeam = () => {
        if (!gameInfo?.team_info?.team_id) return;

        setLoading(true);
        api.team.deleteTeam(gameInfo.team_info.team_id, gameInfo.game_id)
            .then(() => {
                toast.success(t("delete_success"));
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // 更新战队口号
    const handleUpdateSlogan = () => {
        if (!gameInfo?.team_info?.team_id) return;

        setLoading(true);
        api.team.updateTeamInfo(gameInfo.team_info.team_id, gameInfo.game_id ?? 0, { team_slogan: newSlogan } as UpdateTeamInfoPayload)
            .then(() => {
                toast.success(t("update"));
                setSloganDialogOpen(false);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // 复制文本
    const copyToClipboard = (text: string, successField: string) => {
        if (copy(text)) {
            toast.success(`${successField}${t("copy_success")}`);
        } else {
            toast.error(t("copy_failed"));
        }
    };

    // 如果用户没有战队，显示提示

    const teamInfo = gameInfo?.team_info;

    const gamePath = useLocation().pathname.split("/").slice(0, -1).join("/")
    const navigator = useNavigate();

    const getAdjustmentTypeInfo = (type: string) => {
        switch (type) {
            case 'cheat':
                return {
                    icon: <Ban className="w-4 h-4" />,
                    color: 'text-red-500',
                    label: t("cheat")
                };
            case 'reward':
                return {
                    icon: <Gift className="w-4 h-4" />,
                    color: 'text-green-500',
                    label: t("reward")
                };
            case 'other':
                return {
                    icon: <AlertTriangle className="w-4 h-4" />,
                    color: 'text-yellow-500',
                    label: t("other")
                };
            default:
                return {
                    icon: <Calculator className="w-4 h-4" />,
                    color: 'text-gray-500',
                    label: t("unknow")
                };
        }
    }

    if (!dataLoaded) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="flex">
                    <Loader2 className="animate-spin" />
                    <span className="font-bold ml-3">{t("loading")}</span>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* <LoadingPage visible={loadingVisiblity} /> */}
            {gameInfo?.team_info ? (<MacScrollbar
                className="w-full h-full overflow-y-auto"
                skin={theme == "light" ? "light" : "dark"}
                suppressScrollX
            >
                <div className="container mx-auto p-6 space-y-6 py-10">
                    <div className='flex items-center'>
                        <span className='text-3xl font-bold [text-shadow:_hsl(var(--foreground))_1px_1px_20px] select-none'>{t("title")}</span>
                    </div>
                    {/* 战队基本信息 */}
                    <Card className='bg-transparent backdrop-blur-md mt-6'>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <Avatar className="w-16 h-16">
                                        {teamInfo?.team_avatar ? (
                                            <AvatarImage src={teamInfo?.team_avatar} alt={teamInfo?.team_name} />
                                        ) : (
                                            <AvatarFallback>
                                                <Users className="w-8 h-8" />
                                            </AvatarFallback>
                                        )}
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-2xl">{teamInfo?.team_name}</CardTitle>
                                        <CardDescription>{teamInfo?.team_slogan || t("empty_slogan")}</CardDescription>
                                    </div>
                                </div>
                                {isTeamCaptain && (
                                    <div className="flex space-x-2">
                                        <UploadImageDialog type="team" game_id={gameInfo.game_id} updateTeam={() => { }} id={gameInfo?.team_info?.team_id}>
                                            <Button variant="outline" size="sm">
                                                <Upload className="w-4 h-4" />
                                                {t("upload")}
                                            </Button>
                                        </UploadImageDialog>
                                        <Dialog open={sloganDialogOpen} onOpenChange={setSloganDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                    <Settings className="w-4 h-4" />
                                                    {t("edit")}
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>{t("edit_title")}</DialogTitle>
                                                    <DialogDescription>
                                                        {t("edit_description")}
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <div>
                                                        <Label htmlFor="slogan">{t("slogan")}</Label>
                                                        <Input
                                                            id="slogan"
                                                            value={newSlogan}
                                                            onChange={(e) => setNewSlogan(e.target.value)}
                                                            placeholder={t("slogan_placeholder")}
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setSloganDialogOpen(false)}>
                                                        {t("cancel")}
                                                    </Button>
                                                    <Button onClick={handleUpdateSlogan} disabled={loading}>
                                                        {t("save")}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className='flex flex-col gap-2'>
                                <div className="flex items-center space-x-2 h-[32px]">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    <span className="font-semibold">{t("points")}: {teamInfo?.team_score}</span>
                                    {currentUserTeam?.rank && (
                                        <Badge variant="secondary">{t("rank")}: #{currentUserTeam.rank}</Badge>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Hash className="w-5 h-5 text-blue-500" />
                                    <span>{t("team_hash")}: {teamInfo?.team_hash}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(teamInfo?.team_hash ?? "", t("team_hash"))}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Group className="w-5 h-5 text-purple-500" />
                                    <span>{t("belong")}: {teamInfo?.group_name ?? "Public"}</span>
                                </div>
                                {teamInfo?.invite_code && (
                                    <div className="flex items-center space-x-2">
                                        <UserPlus className="w-5 h-5 text-green-500" />
                                        <span>{t("team_code")}: {teamInfo?.invite_code}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(teamInfo?.invite_code ?? "", t("team_code"))}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 战队成员 */}
                    <Card className='bg-transparent backdrop-blur-md'>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Users className="w-5 h-5" />
                                <span>{t("team_member")}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {!teamInfo?.team_members || teamInfo.team_members.length === 0 ?
                                    <p className="text-muted-foreground">{t("empty_team")}</p>
                                    :
                                    teamInfo?.team_members?.map((member) => (
                                        <div key={member.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <Avatar>
                                                    {member.avatar ? (
                                                        <AvatarImage src={member.avatar} alt={member.user_name} />
                                                    ) : (
                                                        <AvatarFallback>{member.user_name.substring(0, 2)}</AvatarFallback>
                                                    )}
                                                </Avatar>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-medium">{member.user_name}</span>
                                                        {member.captain && (
                                                            <Badge variant="default">
                                                                <Crown className="w-3 h-3 mr-1" />
                                                                {t("team_captain")}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {isTeamCaptain && !member.captain && member.user_id !== curProfile.user_id && (
                                                <div className="flex space-x-2">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                <Crown className="w-4 h-4 mr-2" />
                                                                {t("transfer_captain")}
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>{t("transfer_title")}</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    {t("transfer_description", { username: member.user_name })}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleTransferCaptain(member.user_id)}>
                                                                    {t("sure")}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                                                <UserMinus className="w-4 h-4 mr-2" />
                                                                {t("remove_member")}
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>{t("remove_title")}</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    {t("remove_description", { username: member.user_name })}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleRemoveMember(member.user_id)}
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                >
                                                                    {t("sure")}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                }
                            </div>
                        </CardContent>
                    </Card>

                    {/* 解题情况 */}
                    <Card className='bg-transparent backdrop-blur-md'>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Trophy className="w-5 h-5" />
                                <span>{t("solve")}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!currentUserTeam?.solved_challenges || currentUserTeam.solved_challenges.length === 0 ? (
                                <p className="text-muted-foreground">{t("empty_solve")}</p>
                            ) : (
                                <div className="space-y-2">
                                    {currentUserTeam.solved_challenges.map((solvedChallenge, index) => (
                                        <div key={`solved-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div>
                                                <div className="font-medium">{getChallenge(solvedChallenge.challenge_id || 0)?.challenge_name || `${t("challenge")} ${solvedChallenge.challenge_id}`}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {t("solver")}: {solvedChallenge.solver} | {t("solve_time")}: {dayjs(solvedChallenge.solve_time).format('YYYY-MM-DD HH:mm:ss')}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Badge variant="secondary">#{solvedChallenge.rank}</Badge>
                                                <span className="text-green-600 font-medium">+{solvedChallenge.score} pts</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className='bg-transparent backdrop-blur-md'>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Pencil className="w-5 h-5" />
                                <span>{t("adjust")}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!currentUserTeam?.score_adjustments || currentUserTeam.score_adjustments.length === 0 ? (
                                <p className="text-muted-foreground">{t("empty_adjust")}</p>
                            ) : (
                                <div className="space-y-2">
                                    {currentUserTeam.score_adjustments.map((adjustedScore, index) => (
                                        <div key={`solved-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div>
                                                <div className={`flex gap-2 items-center ${getAdjustmentTypeInfo(adjustedScore.adjustment_type).color}`}>
                                                    {getAdjustmentTypeInfo(adjustedScore.adjustment_type).icon}
                                                    <div className={`font-medium`}>{getAdjustmentTypeInfo(adjustedScore.adjustment_type).label}</div>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {t("adjust_reason")}: {adjustedScore.reason} | {t("adjust_time")}: {dayjs(adjustedScore.created_at).format('YYYY-MM-DD HH:mm:ss')}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {adjustedScore.score_change > 0 ? (
                                                    <span className="text-green-600 font-medium">+ {adjustedScore.score_change} pts</span>
                                                ) : (
                                                    <span className="text-red-600 font-medium">- {Math.abs(adjustedScore.score_change)} pts</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 危险操作（仅队长可见） */}
                    {isTeamCaptain && (
                        <Card className="border-red-200 bg-transparent backdrop-blur-md">
                            <CardHeader>
                                <CardTitle className="text-red-600 flex items-center space-x-2">
                                    <Trash2 className="w-5 h-5" />
                                    <span>{t("danger")}</span>
                                </CardTitle>
                                <CardDescription>
                                    {t("danger_description")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AlertConformer
                                    title={t("delete_title")}
                                    type='danger'
                                    description={t("delete_description", { teamname: teamInfo?.team_name })}
                                    onConfirm={handleDeleteTeam}
                                >
                                    <Button variant="destructive">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        {t("delete_team")}
                                    </Button>
                                </AlertConformer>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </MacScrollbar>) : (
                <div className="container mx-auto p-6 h-full flex flex-col items-center justify-center">
                    <Card className='bg-transparent backdrop-blur-md select-none px-20'>
                        <CardContent className="py-6">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold mb-2">{t("not_join_team")}</h3>
                                <p className="text-muted-foreground mb-4">{t("not_join_team_description")}</p>
                                <Button variant="outline" onClick={() => {
                                    navigator(gamePath)
                                }}>
                                    <CircleArrowLeft size={32} />
                                    {t("back")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
};

export default MyTeamInfomationView;
