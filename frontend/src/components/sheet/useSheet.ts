// 打开一张工作表：先取前 5,000 格内的一块，滚动时按需补块。
import { useCallback, useEffect, useRef, useState } from "react";
import { rangeAddr, type RangeBox } from "../../lib/address";
import type { SheetViewParams } from "../../protocol/types";
import type { HostClient } from "../../host/client";
import { SheetModel } from "./sheetModel";

export function useSheet(host: HostClient, params: SheetViewParams | null, refreshKey: unknown = 0) {
  const [model, setModel] = useState<SheetModel | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const key = params ? JSON.stringify(params) : "";
  const live = useRef(key);
  live.current = key;

  useEffect(() => {
    if (!params) return;
    let cancelled = false;
    setError(null);
    // 第一次只取 A1:Z200，拿到整表大小和冻结信息后再按块补
    host
      .request("sheet.view", { ...params, range: params.range ?? "A1:Z180" })
      .then((v) => {
        if (cancelled) return;
        const m = new SheetModel(v);
        setModel(m);
        setVersion((x) => x + 1);
      })
      .catch((e) => !cancelled && setError(String(e.message ?? e)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, key, refreshKey]);

  const loadChunks = useCallback(
    (boxes: RangeBox[]) => {
      if (!params || !model) return;
      const k = key;
      for (const b of boxes) {
        host
          .request("sheet.view", { ...params, range: rangeAddr(b) })
          .then((v) => {
            if (live.current !== k) return;
            model.ingest(v);
            setVersion((x) => x + 1);
          })
          .catch(() => undefined);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [host, key, model],
  );

  return { model, version, error, loadChunks };
}
