import { CheckCircleFilled, ClockCircleFilled, StopOutlined } from "@ant-design/icons";
import { Tag } from "antd";
import { createContext, useContext, type ReactNode } from "react";
import { useAppStore } from "../../store/context";
import type { CardState } from "../../store/reduce";

export const KIND_LABEL: Record<string, string> = {
  workpaper_understanding: "底稿理解",
  basis_confirmation: "口径确认",
  discrepancy: "差异",
  write_confirmation: "写入确认",
  question: "追问",
  result_summary: "结果",
  action_confirmation: "动作确认",
};

const ACTION_LABEL: Record<string, string> = {
  confirm: "已确认",
  edit: "已修改并确认",
  reject: "已拒绝",
  accept_with_note: "已接受差异",
  fix_data: "选择修正资料",
  stop: "已停止",
};

export function answerLabel(c: CardState): string {
  if (c.withdrawn) return "已撤回";
  if (!c.answer) return "";
  if (c.card.kind === "action_confirmation") return c.answer.action === "confirm" ? "已允许这一次" : "已拒绝";
  if (c.card.kind === "result_summary") return "已查看";
  if (c.card.kind === "write_confirmation" && c.answer.action === "reject") return "不写入";
  return ACTION_LABEL[c.answer.action] ?? c.answer.action;
}

/** 外层（等处理的卡片堆）给卡片的显示方式：收起成一行、点标题展开 */
export const ShellOptions = createContext<{ compact?: boolean; onHeadClick?: () => void }>({});

export function CardShell(own: {
  c: CardState;
  children: ReactNode;
  footer?: ReactNode;
  extraHead?: ReactNode;
  /** 只显示标题行（等处理的卡片不止一张时，后面的先收起） */
  compact?: boolean;
  onHeadClick?: () => void;
}) {
  const outer = useContext(ShellOptions);
  const props = { ...outer, ...own };
  const { c } = props;
  const store = useAppStore();
  const open = !c.answer && !c.withdrawn;
  const isResult = c.card.kind === "result_summary";
  return (
    <div className={`card ${open && !isResult ? "open" : ""} ${c.card.blocking ? "blocking" : ""}`} data-card={c.card.card}>
      <div className="card-head" onClick={props.onHeadClick} style={props.onHeadClick ? { cursor: "pointer" } : undefined}>
        <span className="card-kind">{KIND_LABEL[c.card.kind] ?? c.card.kind}</span>
        <span className="card-title">{store.withFileNames(c.card.title)}</span>
        {props.extraHead}
        {open && !isResult && (
          <Tag color="warning" icon={<ClockCircleFilled />} style={{ marginInlineEnd: 0 }}>
            {c.card.blocking ? "流程在等你" : "相关区域在等你"}
          </Tag>
        )}
        {!open && (
          <span className="card-answer">
            {c.withdrawn ? <StopOutlined /> : <CheckCircleFilled style={{ color: "var(--success)" }} />}
            {answerLabel(c)}
          </span>
        )}
      </div>
      {!props.compact && <div className="card-body">{props.children}</div>}
      {open && !props.compact && props.footer && <div className="card-foot">{props.footer}</div>}
    </div>
  );
}
