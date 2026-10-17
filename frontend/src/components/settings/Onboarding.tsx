// 首次使用：先接模型（测试通过才能往下），再新建项目（回放模式下也可以先看示例项目）。
import { CheckCircleFilled, FolderOpenOutlined } from "@ant-design/icons";
import { Button, Input, Steps } from "antd";
import { useState } from "react";
import { useAppStore } from "../../store/context";
import { ModelForm } from "./Settings";

export function Onboarding({ onDone, startAt = 0, sample = true }: { onDone: () => void; startAt?: number; sample?: boolean }) {
  const store = useAppStore();
  const [step, setStep] = useState(startAt);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const p = await store.host.request("project.create", { name: name.trim(), folder: folder.trim() });
      store.setUi({ project: p.project, projects: [p, ...store.get().ui.projects] });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboard">
      <div className="onboard-card">
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>开始之前</h2>
          <div className="muted" style={{ marginTop: 4 }}>
            资料只在这台电脑上处理，只有发给模型的内容会离开本机。
          </div>
        </div>
        <Steps size="small" current={step} items={[{ title: "连接模型" }, { title: "选择项目" }]} />
        {step === 0 && <ModelForm compact onConnected={() => setStep(1)} />}
        {step === 1 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--success)" }}>
              <CheckCircleFilled /> 模型已连接
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <b>新建项目</b>
              <Input placeholder="项目名称，比如：华东示例制造 2025年报审计" value={name} onChange={(e) => setName(e.target.value)} />
              <Input
                placeholder="项目文件夹，底稿和资料放在这里"
                prefix={<FolderOpenOutlined className="faint" />}
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              />
              <div className="faint" style={{ fontSize: 12 }}>
                原文件只读；产出写到这个文件夹下的「输出」。
              </div>
              {err && <div style={{ color: "var(--danger)", fontSize: 12 }}>{err}</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {sample && <Button onClick={onDone}>先看示例项目</Button>}
                <Button type="primary" disabled={!name.trim() || !folder.trim()} loading={busy} onClick={() => void create()}>
                  创建
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
