import { useEffect, useState } from "react";
import { api } from "utils/ApiHelper";
import { Button } from "components/ui/button";
import { Input } from "components/ui/input";
import { Switch } from "components/ui/switch";
import { Label } from "components/ui/label";
import { toast } from "react-toastify/unstyled";

export default function QQBotManager() {
    // 已统一使用顶部导入的 api，无需再实例化 Api
    // 已从顶部 import 引入 toast，无需 useToast

    const [enabled, setEnabled] = useState(false);
    const [apiBase, setApiBase] = useState("");
    const [accessToken, setAccessToken] = useState("");
    const [groupId, setGroupId] = useState("");
    const [pushAll, setPushAll] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const resp = await api.system.getSystemSettings();
                const cfg = resp.data?.data;
                if (mounted && cfg) {
                    setEnabled(Boolean((cfg as any).qqBotEnabled));
                    setApiBase((cfg as any).qqBotApiBase || "");
                    setAccessToken((cfg as any).qqBotAccessToken || "");
                    setGroupId((cfg as any).qqBotGroupId || "");
                    setPushAll(Boolean((cfg as any).qqBotPushAllSubmits));
                }
            } catch (e) {
                // ignore
            }
        })();
        return () => { mounted = false; };
    }, []);

    const onSave = async () => {
        setLoading(true);
        try {
            await api.system.updateSystemSettings({
                // @ts-ignore
                qqBotApiBase: apiBase,
                qqBotAccessToken: accessToken,
                qqBotGroupId: groupId,
                qqBotPushAllSubmits: pushAll,
            });
            toast.success("QQ Bot 设置已保存");
        } catch (e: any) {
            toast.error(e?.message || "保存失败");
        } finally {
            setLoading(false);
        }
    };

    // 即时更新启用状态（统一保存按钮不再在此组件中）
    const onToggleEnabled = async (value: boolean) => {
        const prev = enabled;
        setEnabled(value);
        try {
            await api.system.updateSystemSettings({ qqBotEnabled: value });
            toast.success(value ? "QQ Bot 已启用" : "QQ Bot 已禁用");
        } catch (e: any) {
            setEnabled(prev);
            toast.error(e?.message || "更新启用状态失败");
        }
    };

    // 移除本地保存；测试推送仍保留
    const onTestPush = async () => {
        try {
            await api.system.testQQBot({ message: "这是一条QQ Bot测试消息" });
            toast.success("测试消息已发送（请检查群）");
        } catch (e: any) {
            toast.error(e?.message || "测试推送失败");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">QQ Bot 管理</h2>
                <div className="flex items-center gap-2">
                    <Label htmlFor="qqbot-enabled">启用</Label>
                    <Switch id="qqbot-enabled" checked={enabled} onCheckedChange={onToggleEnabled} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>服务器地址（base_url）</Label>
                    <Input value={apiBase} onChange={(e) => setApiBase(e.target.value)} placeholder="例如 http://127.0.0.1:5700" />
                </div>
                <div className="space-y-2">
                    <Label>Access Token（可选）</Label>
                    <Input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="若开启鉴权则填写" />
                </div>
                <div className="space-y-2">
                    <Label>QQ 群号</Label>
                    <Input value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="输入群号（数字）" />
                </div>
                <div className="flex items-center gap-2">
                    <Switch checked={pushAll} onCheckedChange={setPushAll} />
                    <Label>推送所有提交（包含错误）</Label>
                </div>
            </div>

            <div className="flex gap-3">
                {/* 移除：<Button disabled={loading} onClick={onSave}>保存配置</Button> */}
                <Button variant="secondary" onClick={onTestPush}>测试推送</Button>
            </div>
        </div>
    );
}