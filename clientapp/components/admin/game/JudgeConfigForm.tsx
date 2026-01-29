
import { Input } from 'components/ui/input';
import {
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormControl,
    FormDescription,
} from 'components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'components/ui/select';
import { Switch } from 'components/ui/switch';
import { useFieldArray, useWatch } from 'react-hook-form';
import CodeEditor from '@uiw/react-textarea-code-editor';
import dayjs from 'dayjs';
import { ScanBarcode, FileCode, ClockArrowUp, PlusCircle, Trash2, AppWindowMac, PencilRulerIcon } from 'lucide-react';
import { Button } from 'components/ui/button';
import EditorDialog from 'components/modules/EditorDialog';
import AlertConformer from 'components/modules/AlertConformer';
import ChallengeScoreGraph from 'components/modules/ChallengeScoreGraph';

interface JudgeConfigFormProps {
    /** react-hook-form control 对象 */
    control: any;
    /** 传入整个 form 实例, 用于校验 */
    form: any;
}

/**
 * 比赛题目评测配置表单
 * 从 EditGameView.tsx 中抽离出的子模块, 使主文件更简洁
 */
export function JudgeConfigForm({ control, form }: JudgeConfigFormProps) {
    // 根据评测类型动态渲染 flag / script 输入框
    const attachType = useWatch({
        control,
        name: `judge_config.judge_type`,
    });

    // Hints 动态字段
    const {
        fields: hintFields,
        append: appendHint,
        remove: removeHint,
    } = useFieldArray({
        control,
        name: `hints`,
    });

    const [
        difficulty,
        total_score,
        minimal_score
    ] = useWatch({
        control,
        name: ['difficulty', 'total_score', 'minimal_score'],
    })

    return (
        <>
            {/* 评测模式选择 */}
            <FormField
                control={form.control}
                name={`judge_config.judge_type`}
                render={({ field }) => (
                    <FormItem className="select-none">
                        <div className="flex items-center h-[20px]">
                            <FormLabel>评测模式</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                        <FormControl>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                            >

                                <SelectTrigger>
                                    <SelectValue placeholder="选择一个评测模式" />
                                </SelectTrigger>
                                <SelectContent className="w-full flex">
                                    <SelectItem value="DYNAMIC">
                                        <div className="w-full flex gap-2 items-center h-[25px]">
                                            <ScanBarcode />
                                            <span className="text-[12px] font-bold">文字匹配</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="SCRIPT" disabled>
                                        <div className="w-full flex gap-2 items-center h-[25px]">
                                            <FileCode />
                                            <span className="text-[12px] font-bold">脚本匹配</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </FormControl>
                        <FormDescription>请选择一个类别</FormDescription>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name={`enable_blood_reward`}
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-y-0 justify-between rounded-xl border border-border/50 p-4">
                        <div className="space-y-0.5">
                            <FormLabel>三血加分</FormLabel>
                            <FormDescription>是否开启三血加分</FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    </FormItem>
                )}
            />

            {/* 根据评测模式渲染不同输入 */}
            {attachType === 'SCRIPT' ? (
                <FormField
                    control={form.control}
                    name={`judge_config.judge_script`}
                    render={({ field }) => (
                        <FormItem className="select-none">
                            <div className="flex items-center h-[20px]">
                                <FormLabel>评测脚本</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <CodeEditor
                                    value={field.value}
                                    language="js"
                                    placeholder="在这里输入你的评测脚本"
                                    onChange={(evn) => field.onChange(evn.target.value)}
                                    padding={15}
                                    style={{
                                        minHeight: 200,
                                        borderRadius: 5,
                                    }}
                                />
                            </FormControl>
                            <FormDescription>
                                如果你选择了动态评测, 你需要提供一份符合格式要求的评测脚本
                            </FormDescription>
                        </FormItem>
                    )}
                />
            ) : (
                <FormField
                    control={form.control}
                    name={`judge_config.flag_template`}
                    render={({ field }) => (
                        <FormItem className="select-none">
                            <div className="flex items-center h-[20px]">
                                <FormLabel>Flag</FormLabel>
                                <div className="flex-1" />
                                <FormMessage className="text-[14px]" />
                            </div>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <div className="flex flex-col text-[12px] text-foreground/60">
                                <span>Flag支持模板变量</span>
                                <span>[team_hash] 部分会被替换成队伍唯一标识符</span>
                                <span>[team_name] 部分会被替换成队伍名称</span>
                                <span>[game_id] 部分会被替换成比赛ID</span>
                                <span>[uuid] 部分会被替换成随机UUID</span>
                                <span>[random_string_??] 部分会被替换成随机字符串, 其中??表示字符串长度</span>
                                <span>如果你在题目设置中选择了动态Flag, 将会启用Leet进行反作弊</span>
                                <span>模板变量部分不会被Leet替换</span>
                            </div>
                        </FormItem>
                    )}
                />
            )}

            {/* 所属阶段 */}
            {/* <FormField
                control={form.control}
                name={`belong_stage`}
                render={({ field }) => (
                    <FormItem className="select-none">
                        <div className="flex items-center h-[20px]">
                            <FormLabel>所属阶段</FormLabel>
                            <div className="flex-1" />
                            <FormMessage className="text-[14px]" />
                        </div>
                    </FormItem>
                )}
            /> */}

            <div className="flex gap-6">
                <div className="flex flex-col gap-8 w-[35%]">
                    {/* 题目总分 */}
                    <FormField
                        control={form.control}
                        name={`total_score`}
                        render={({ field }) => (
                            <FormItem className="select-none">
                                <div className="flex items-center h-[20px]">
                                    <FormLabel>题目总分</FormLabel>
                                    <div className="flex-1" />
                                    <FormMessage className="text-[14px]" />
                                </div>
                                <FormControl>
                                    <Input {...field} value={field.value ?? ''} />
                                </FormControl>
                                <div className="flex flex-col text-[12px] text-foreground/60">
                                    <span>这里是题目的最大分数</span>
                                    <span>在开启动态积分的情况下，积分会自动衰减</span>
                                </div>
                            </FormItem>
                        )}
                    />

                    {/* 题目最小分数 */}
                    <FormField
                        control={form.control}
                        name={`minimal_score`}
                        render={({ field }) => (
                            <FormItem className="select-none">
                                <div className="flex items-center h-[20px]">
                                    <FormLabel>题目最低分</FormLabel>
                                    <div className="flex-1" />
                                    <FormMessage className="text-[14px]" />
                                </div>
                                <FormControl>
                                    <Input {...field} value={field.value ?? ''} />
                                </FormControl>
                                <div className="flex flex-col text-[12px] text-foreground/60">
                                    <span>这里是题目的最小分数</span>
                                    <span>积分衰减不会小于这个分数</span>
                                </div>
                            </FormItem>
                        )}
                    />

                    {/* 题目难度系数 */}
                    <FormField
                        control={form.control}
                        name={`difficulty`}
                        render={({ field }) => (
                            <FormItem className="select-none">
                                <div className="flex items-center h-[20px]">
                                    <FormLabel>题目难度系数</FormLabel>
                                    <div className="flex-1" />
                                    <FormMessage className="text-[14px]" />
                                </div>
                                <FormControl>
                                    <Input {...field} value={field.value ?? ''} />
                                </FormControl>
                                <div className="flex flex-col text-[12px] text-foreground/60">
                                    <span>这里是题目的难度系数, 会影响分数曲线</span>
                                </div>
                            </FormItem>
                        )}
                    />
                </div>
                <div className="flex-1">
                    <ChallengeScoreGraph
                        S={total_score}
                        d={difficulty}
                        r={minimal_score / total_score}
                        onDChange={(v) => {
                            form.setValue(`difficulty`, v)
                        }}
                    />
                </div>
            </div>

            {/* Hints */}
            <div className="flex items-center w-full gap-2">
                <span className="text-lg font-bold">Hints: </span>
                <div className="flex-1" />
                <Button
                    type="button"
                    variant={"ghost"}
                    className="[&_svg]:size-5 bg-foreground/10 hover:hover:bg-foreground/15"
                    onClick={() => {
                        appendHint({
                            content: "",
                            create_time: new Date().toISOString(),
                            visible: false
                        })

                    }}
                >
                    <PlusCircle />
                    添加Hint
                </Button>
            </div>

            {hintFields.length > 0 ? (
                <div className="flex flex-col gap-3">
                    {hintFields.map((e, hintIndex) => (
                        <div className="w-full flex flex-col" key={e.id}>
                            <div className="flex gap-2 items-center space-y-0 select-none bg-foreground/5 rounded-2xl px-5 py-2">
                                <div className='flex gap-4'>
                                    <AppWindowMac />
                                    <span>提示{hintIndex + 1}</span>
                                </div>
                                <div className="flex-1" />
                                <FormField
                                    control={control}
                                    name={`hints.${hintIndex}.visible`}
                                    render={({ field }) => (
                                        <FormItem className="flex">
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={(v) => {
                                                    field.onChange(v)
                                                    form.setValue(`hints.${hintIndex}.create_time`, new Date().toISOString())
                                                }} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`hints.${hintIndex}.create_time`}
                                    render={({ field }) => (
                                        <FormItem className="flex">
                                            <FormControl>
                                                <div className="bg-foreground/10 flex gap-2 items-center px-[9px] py-[5px] rounded-full">
                                                    <ClockArrowUp size={20} />
                                                    <span className="text-sm">
                                                        {field.value ? dayjs(field.value).format('YYYY-MM-DD HH:mm:ss') : ''}
                                                    </span>
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`hints.${hintIndex}.content`}
                                    render={({ field }) => (
                                        <FormItem className="flex">
                                            <FormControl>
                                                <EditorDialog
                                                    value={field.value}
                                                    onChange={(value) => {
                                                        field.onChange(value)
                                                        form.setValue(`hints.${hintIndex}.create_time`, new Date().toISOString())
                                                    }}
                                                    language="markdown"
                                                    title={`编辑内容 - 提示${hintIndex + 1}`}
                                                >
                                                    <Button variant="ghost" size="icon" className='rounded-full bg-foreground/10 hover:hover:bg-foreground/15 cursor-pointer' type="button" onClick={() => { }}>
                                                        <PencilRulerIcon />
                                                    </Button>
                                                </EditorDialog>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <AlertConformer
                                    title='删除提示'
                                    description='你确定要删除这条 Hint 吗'
                                    type='danger'
                                    onConfirm={() => removeHint(hintIndex)}
                                >
                                    <Button variant="ghost" size="icon" className='rounded-full bg-foreground/10 hover:hover:bg-red-400/90 cursor-pointer' type="button">
                                        <Trash2 />
                                    </Button>
                                </AlertConformer>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <span className="text-sm mt-[-10px]">还没有提示哦</span>
            )}
        </>
    );
} 