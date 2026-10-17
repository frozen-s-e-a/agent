import { createContext, useContext } from "react";
import type { Tokens } from "../lib/tokens";
import { useStore, type AppSnapshot, type AppStore } from "./appStore";

export const StoreCtx = createContext<AppStore | null>(null);
export const TokensCtx = createContext<Tokens | null>(null);

export function useAppStore(): AppStore {
  const s = useContext(StoreCtx);
  if (!s) throw new Error("缺少 StoreCtx");
  return s;
}

export function useApp<T>(sel: (s: AppSnapshot) => T): T {
  return useStore(useAppStore(), sel);
}

export function useTokens(): Tokens {
  return useContext(TokensCtx)!;
}

/** 当前对话的事件状态 */
export function useSession() {
  return useApp((s) => (s.ui.session ? s.ev.sessions[s.ui.session] : undefined));
}
