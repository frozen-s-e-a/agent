// 新建项目：项目名 + 项目文件夹。桌面版可以点“选择…”弹系统的文件夹对话框，选了文件夹而没填名字时用文件夹名。
import { FolderOpenOutlined } from "@ant-design/icons";
import { Button, Input, Modal } from "antd";
import { useState } from "react";
import { useAppStore } from "../../store/context";

export function FolderInput({ value, onChange, onPicked }: { value: string; onChange: (v: string) => void; onPicked?: (folder: string) => void }) {
  const store = useAppStore();
  const choose = store.host.chooseFolder;
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Input
        placeholder="项目文件夹，底稿和资料放在这里"
        prefix={<FolderOpenOutlined className="faint" />}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {choose && (
        <Button
          onClick={async () => {
            const folder = await choose.call(store.host, "选择项目文件夹");
            if (!folder) return;
            onChange(folder);
            onPicked?.(folder);
          }}
        >
          选择…
        </Button>
      )}
    </div>
  );
}

export const folderName = (folder: string) => folder.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "";

export function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useAppStore();
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => {
    setName("");
    setFolder("");
    setErr(null);
    onClose();
  };
  return (
    <Modal
      title="新建项目"
      open={open}
      okText="创建"
      cancelText="取消"
      confirmLoading={busy}
      okButtonProps={{ disabled: !name.trim() || !folder.trim() }}
      onCancel={close}
      onOk={async () => {
        setBusy(true);
        setErr(null);
        try {
          const p = await store.host.request("project.create", { name: name.trim(), folder: folder.trim() });
          store.setUi((ui) => ({ projects: [p, ...ui.projects.filter((x) => x.project !== p.project)] }));
          close();
          await store.switchProject(p.project);
        } catch (e) {
          setErr((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Input placeholder="项目名称，比如：华东示例制造 2025年报审计" value={name} onChange={(e) => setName(e.target.value)} />
        <FolderInput value={folder} onChange={setFolder} onPicked={(f) => !name.trim() && setName(folderName(f))} />
        <div className="faint" style={{ fontSize: 12 }}>
          原文件只读；产出写到这个文件夹下的「输出」。
        </div>
        {err && <div style={{ color: "var(--danger)", fontSize: 12 }}>{err}</div>}
      </div>
    </Modal>
  );
}
