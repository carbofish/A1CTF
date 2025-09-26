import { Radar, MessageSquareLock, Bug, GlobeLock, Binary, FileSearch, HardDrive, Smartphone, SquareCode, Bot, Github, Bitcoin, ShieldCheck } from 'lucide-react';
import * as z from 'zod';

/*
 * 所有比赛相关管理模块公用的常量与表单校验 Schema
 *  - 避免在组件文件中混合导出非组件内容，保证 React Fast Refresh 一致性
 */

export const categories: { [key: string]: any } = {
    MISC: <Radar size={21} />,
    CRYPTO: <MessageSquareLock size={21} />,
    PWN: <Bug size={21} />,
    WEB: <GlobeLock size={21} />,
    REVERSE: <Binary size={21} />,
    FORENSICS: <FileSearch size={21} />,
    BLOCKCHAIN: <Bitcoin size={21} />,
    HARDWARE: <HardDrive size={21} />,
    MOBILE: <Smartphone size={21} />,
    PPC: <SquareCode size={21} />,
    AI: <Bot size={21} />,
    PENTEST: <ShieldCheck size={21} />,
    OSINT: <Github size={21} />,
};

export const GameChallengeSchema = z.object({
    challenge_id: z.number(),
    challenge_name: z.string(),
    category: z.enum(Object.keys(categories) as [string, ...string[]], {
        errorMap: () => ({ message: '需要选择一个有效的题目类别' }),
    }),
    total_score: z.coerce.number().min(1, '请输入一个有效的数字'),
    cur_score: z.number(),
    solve_count: z.number(),
    difficulty: z.coerce.number().min(1, '请输入一个有效的数字'),
    minimal_score: z.coerce.number().min(0, '请输入一个有效的数字'),
    enable_blood_reward: z.boolean(),
    hints: z.array(
        z.object({
            content: z.string().optional(),
            create_time: z.string(),
            visible: z.boolean(),
        })
    ),
    visible: z.boolean(),
    belong_stage: z.string().nullable(),
    judge_config: z.object({
        judge_type: z.enum(['DYNAMIC', 'SCRIPT'], {
            errorMap: () => ({ message: '需要选择一个有效的题目类别' }),
        }),
        judge_script: z.string().optional(),
        flag_template: z.string().optional(),
    }),
})

// 比赛编辑表单校验 Schema
export const EditGameFormSchema = z.object({
    name: z.string().min(2, { message: '名字最短要两个字符' }),
    summary: z.string().optional(),
    description: z.string().optional(),
    poster: z.string().optional(),
    invite_code: z.string().optional(),
    start_time: z.date().optional(),
    end_time: z.date().optional(),
    practice_mode: z.boolean(),
    game_icon_light: z.string().optional(),
    game_icon_dark: z.string().optional(),
    team_number_limit: z.coerce.number().min(1),
    container_number_limit: z.coerce.number().min(1),
    require_wp: z.boolean(),
    wp_expire_time: z.date().optional(),
    first_blood_reward: z.coerce.number(),
    second_blood_reward: z.coerce.number(),
    third_blood_reward: z.coerce.number(),
    team_policy: z.enum(["Manual", "Auto"]),
    stages: z.array(
        z.object({
            stage_name: z.string().nonempty(),
            start_time: z.date(),
            end_time: z.date(),
        })
    ).optional(),
    visible: z.boolean(),
    group_invite_code_enable: z.boolean(),
    challenges: z.array(
        z.object({
            challenge_id: z.number(),
            challenge_name: z.string(),
            category: z.enum(Object.keys(categories) as [string, ...string[]], {
                errorMap: () => ({ message: '需要选择一个有效的题目类别' }),
            }),
            total_score: z.coerce.number().min(1, '请输入一个有效的数字'),
            cur_score: z.number(),
            solve_count: z.number(),
            minimal_score: z.coerce.number().min(0, '请输入一个有效的数字'),
            enable_blood_reward: z.boolean(),
            hints: z.array(
                z.object({
                    content: z.string(),
                    create_time: z.date(),
                    visible: z.boolean(),
                })
            ),
            visible: z.boolean(),
            belong_stage: z.string().nullable(),
            judge_config: z.object({
                judge_type: z.enum(['DYNAMIC', 'SCRIPT'], {
                    errorMap: () => ({ message: '需要选择一个有效的题目类别' }),
                }),
                judge_script: z.string().optional(),
                flag_template: z.string().optional(),
            }),
        })
    ),
}); 