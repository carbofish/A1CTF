import { useEffect, useState } from "react";
import { api } from "utils/ApiHelper";
import { Button } from "components/ui/button";
import { Input } from "components/ui/input";
import { Switch } from "components/ui/switch";
import { Label } from "components/ui/label";
import { toast } from "react-toastify/unstyled";

export default function QQBotManager({ gameId }: { gameId: number }) {
    const [enabled, setEnabled] = useState(false);
    const [apiBase, setApiBase] = useState("");
    const [accessToken, setAccessToken] = useState("");
    const [groupId, setGroupId] = useState("");
    const [pushAll, setPushAll] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.admin.getGameQQBotConfig(gameId).then(res => {
            const cfg = res.data.data || {};
            setEnabled(!!cfg.qq_bot_enabled);
            setApiBase(cfg.qq_bot_api_base || "");
            setAccessToken(cfg.qq_bot_access_token || "");
            setGroupId(cfg.qq_bot_group_id || "");
            setPushAll(!!cfg.qq_bot_push_all_submits);
        }).catch((e: any) => {
            toast.error(e?.message || "加载QQ Bot配置失败");
        });
    }, [gameId]);

    const onSave = async () => {
        setLoading(true);
        try {
            await api.admin.updateGameQQBotConfig(gameId, {
                qq_bot_enabled: enabled,
                qq_bot_api_base: apiBase || null,
                qq_bot_access_token: accessToken || null,
                qq_bot_group_id: groupId || null,
                qq_bot_push_all_submits: pushAll,
            });
            toast.success("QQ Bot 设置已保存");
        } catch (e: any) {
            toast.error(e?.message || "保存失败");
        } finally {
            setLoading(false);
        }
    };

    const onTestPush = async () => {
        try {
            await api.admin.testGameQQBot(gameId, { message: "这是一条QQ Bot测试消息" });
            toast.success("测试消息已发送（请检查群）");
        } catch (e: any) {
            toast.error(e?.message || "测试推送失败");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Switch checked={enabled} onCheckedChange={setEnabled} />
                <Label>启用比赛级 QQ Bot</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>API Base</Label>
                    <Input value={apiBase} onChange={e => setApiBase(e.target.value)} placeholder="http://127.0.0.1:5700" />
                </div>
                <div>
                    <Label>Access Token</Label>
                    <Input value={accessToken} onChange={e => setAccessToken(e.target.value)} placeholder="必填" />
                </div>
                <div>
                    <Label>Group ID</Label>
                    <Input value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="群号，如 123456789" />
                </div>
                <div className="flex items-center gap-2 mt-6">
                    <Switch checked={pushAll} onCheckedChange={setPushAll} />
                    <Label>推送 WA/AC（未勾选时仅推送 AC）</Label>
                </div>
            </div>
            <div className="flex gap-2">
                <Button onClick={onSave} disabled={loading}>保存</Button>
                <Button variant="outline" onClick={onTestPush}>测试推送</Button>
            </div>
        </div>
    );
}