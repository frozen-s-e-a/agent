// 资料表（D-）和结果表（R-）：表头上显示识别出的字段含义，可以定位到某一行（差异卡的"查看行"）。
import "@glideapps/glide-data-grid/dist/index.css";
import { DataEditor, GridCellKind, type DataEditorRef, type GridCell, type GridColumn, type Item, type Theme } from "@glideapps/glide-data-grid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TableView } from "../../protocol/types";
import { formatDecimal } from "../../lib/numfmt";
import { alpha } from "../../lib/tokens";
import type { WorkspaceTab } from "../../store/appStore";
import { useAppStore, useTokens } from "../../store/context";
import { COMPOSER_RESERVE } from "../chat/Composer";

type Tab = Extract<WorkspaceTab, { kind: "table" }>;
const PAGE = 200;

export function TableTab({ tab }: { tab: Tab }) {
  const store = useAppStore();
  const t = useTokens();
  const ref = useRef<DataEditorRef>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [meta, setMeta] = useState<TableView | null>(null);
  const rows = useRef(new Map<number, TableView["rows"][number]>());
  const pages = useRef(new Set<number>());
  const [version, setVersion] = useState(0);
  const [highlight, setHighlight] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current!;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ingest = useCallback((v: TableView) => {
    v.rows.forEach((r, i) => rows.current.set(v.offset + i, r));
    pages.current.add(Math.floor(v.offset / PAGE));
    setVersion((x) => x + 1);
  }, []);

  useEffect(() => {
    rows.current.clear();
    pages.current.clear();
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void store.host.request("table.view", { table: tab.table, offset: 0, limit: PAGE, locate: tab.locate }).then((v) => {
      if (!live) return; // 被新一次加载取代（GDG 的 scrollTo 是相对滚动，滚两次会翻倍）
      setMeta(v);
      ingest(v);
      setHighlight(v.highlight ?? null);
      // 等表格挂上再滚；定位行放在靠上的位置，上面留几行上下文
      if (v.highlight != null) timer = setTimeout(() => ref.current?.scrollTo(0, Math.max(0, v.highlight! - 4), "vertical", 0, 0, { vAlign: "start" }), 150);
    });
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [store, tab.table, tab.locate, tab.nonce, ingest]);

  // 资料表的行号显示源文件行号，和"已定位：源文件第 N 行"对得上
  const src0 = meta?.rows[0]?.source?.row;
  const markerStart = src0 != null && meta ? src0 - meta.offset : 1;

  const columns: GridColumn[] = useMemo(
    () =>
      (meta?.columns ?? []).map((c) => ({
        id: c.key,
        title: c.name,
        width: c.type === "decimal" ? 130 : c.name.length > 4 ? 150 : 100,
      })),
    [meta],
  );

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const r = rows.current.get(row);
      if (!r) return { kind: GridCellKind.Loading, allowOverlay: false };
      const v = r.values[col];
      const c = meta!.columns[col];
      const invalid = r.invalid?.includes(col);
      const text = v == null ? "" : c.type === "decimal" && !invalid ? formatDecimal(v, "#,##0.00") : v;
      return {
        kind: GridCellKind.Text,
        data: text,
        displayData: text,
        allowOverlay: false,
        readonly: true,
        contentAlign: c.type === "decimal" ? "right" : "left",
        themeOverride: invalid ? { textDark: t.danger, bgCell: alpha(t.danger, 0.1) } : undefined,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meta, t, version],
  );

  const theme: Partial<Theme> = useMemo(
    () => ({
      accentColor: t.selection,
      bgCell: t.gridBg,
      bgHeader: t.gridHeaderBg,
      bgHeaderHasFocus: t.gridHeaderBg,
      bgHeaderHovered: t.gridHeaderBg,
      textHeader: t.text,
      textDark: t.text,
      textLight: t.textFaint,
      borderColor: t.gridLine,
      horizontalBorderColor: t.gridLine,
      headerBottomBorderColor: t.borderStrong,
      fontFamily: t.font.replace(/^\d+px\s*/, ""),
      baseFontStyle: "13px",
      headerFontStyle: "600 12.5px",
      bgBubble: t.panelAlt,
    }),
    [t],
  );

  return (
    <div className="ws-main">
      <div className="sheet-toolbar">
        <b>{meta?.title ?? tab.table}</b>
        <span className="mono faint">{tab.table}</span>
        <span className="faint">共 {meta?.total.toLocaleString() ?? "…"} 行</span>
        {highlight != null && meta?.rows[0]?.source && (
          <span className="chip" style={{ cursor: "default" }}>
            已定位：源文件第 {(rows.current.get(highlight)?.source?.row ?? highlight + 1).toLocaleString()} 行
          </span>
        )}
        <span className="legend">
          <span><i style={{ background: alpha(t.accent, 0.2) }} />表头下方是识别出的字段含义</span>
          <span><i style={{ background: alpha(t.danger, 0.2) }} />无效值</span>
        </span>
      </div>
      <div ref={wrap} style={{ flex: 1, minHeight: 0 }}>
        {meta && (
          <DataEditor
            ref={ref}
            width={size.w}
            height={size.h}
            columns={columns}
            rows={meta.total}
            getCellContent={getCellContent}
            theme={theme}
            headerHeight={46}
            rowHeight={28}
            rowMarkers={{ kind: "number", startIndex: markerStart, width: 64 }}
            smoothScrollX
            smoothScrollY
            getRowThemeOverride={(r) => (r === highlight ? { bgCell: alpha(t.warning, 0.18) } : undefined)}
            drawHeader={(args, drawContent) => {
              const { ctx, rect, column, columnIndex } = args;
              if (columnIndex < 0) return drawContent(); // 行号列用默认画法
              const c = meta.columns[columnIndex];
              ctx.save();
              ctx.fillStyle = t.gridHeaderBg;
              ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
              ctx.fillStyle = t.text;
              ctx.font = `600 12.5px ${theme.fontFamily}`;
              ctx.textBaseline = "middle";
              ctx.textAlign = c?.type === "decimal" ? "right" : "left";
              const x = c?.type === "decimal" ? rect.x + rect.width - 8 : rect.x + 8;
              ctx.fillText(column.title, x, rect.y + 15);
              if (c?.meaning) {
                ctx.font = `11px ${theme.fontFamily}`;
                ctx.fillStyle = t.accent;
                ctx.fillText(c.meaning, x, rect.y + 32);
              } else {
                ctx.font = `11px ${theme.fontFamily}`;
                ctx.fillStyle = t.textFaint;
                ctx.fillText(meta.table.startsWith("D-") ? "未用到" : "", x, rect.y + 32);
              }
              ctx.strokeStyle = t.gridLine;
              ctx.beginPath();
              ctx.moveTo(rect.x + rect.width - 0.5, rect.y);
              ctx.lineTo(rect.x + rect.width - 0.5, rect.y + rect.height);
              ctx.stroke();
              ctx.restore();
            }}
            onVisibleRegionChanged={(r) => {
              const first = Math.floor(r.y / PAGE);
              const last = Math.floor((r.y + r.height) / PAGE);
              for (let p = first; p <= last; p++) {
                if (pages.current.has(p)) continue;
                pages.current.add(p);
                void store.host.request("table.view", { table: tab.table, offset: p * PAGE, limit: PAGE }).then(ingest);
              }
            }}
            experimental={{ paddingBottom: COMPOSER_RESERVE }}
          />
        )}
      </div>
    </div>
  );
}
