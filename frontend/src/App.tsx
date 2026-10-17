// 应用入口：主题、状态、宿主连接。现在接的是假宿主（回放事件文件）；接真宿主只换 host 这一层。
import { App as AntApp, ConfigProvider, theme as antTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useEffect, useMemo, useRef, useState } from "react";
import { FakeHost } from "./host/fake/FakeHost";
import { cssVars, DARK, LIGHT, PAPER } from "./lib/tokens";
import { AppStore, useStore } from "./store/appStore";
import { StoreCtx, TokensCtx } from "./store/context";
import { Sidebar } from "./components/layout/Sidebar";
import { Workspace } from "./components/layout/Workspace";
import { SettingsPage } from "./components/settings/Settings";
import { Onboarding } from "./components/settings/Onboarding";
import { DevPanel } from "./devtools/DevPanel";

const params = new URLSearchParams(location.search);

export function App() {
  const host = useMemo(() => new FakeHost({ connected: !params.has("onboarding") }), []);
  const store = useMemo(() => new AppStore(host), [host]);
  if (import.meta.env.DEV) Object.assign(window, { __store: store, __host: host });
  const ui = useStore(store, (s) => s.ui);
  const [booted, setBooted] = useState(false);

  const bootedOnce = useRef(false);
  useEffect(() => {
    if (bootedOnce.current) return; // StrictMode 下 effect 会跑两次，只启动一次
    bootedOnce.current = true;
    if (params.get("theme") === "dark" || params.get("theme") === "light") store.setUi({ theme: params.get("theme") as "dark" | "light" });
    if (params.get("chat")) store.setUi({ chatMode: params.get("chat") as never });
    void (async () => {
      const s = await host.request("settings.get", {});
      store.setUi({ modelReady: s.connected });
      if (s.connected) await enter(store, host);
      setBooted(true);
    })();
  }, [host, store]);

  // ?skin=paper 试看备选皮肤（风格方向 A），还没放进设置
  const t = ui.theme === "dark" ? DARK : params.get("skin") === "paper" ? PAPER : LIGHT;
  useEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(cssVars(t))) root.style.setProperty(k, v);
    root.dataset.theme = ui.theme;
    document.body.style.background = t.bg;
  }, [t, ui.theme]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: ui.theme === "dark" ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: t.accent,
          colorError: t.danger,
          colorWarning: t.warning,
          colorSuccess: t.success,
          colorBgLayout: t.bg,
          colorBgContainer: t.panel,
          colorBgElevated: t.panel,
          colorBorder: t.borderStrong,
          colorBorderSecondary: t.border,
          colorText: t.text,
          borderRadius: 8,
          fontFamily: t.font.replace(/^\d+px\s*/, ""),
          fontSize: 13,
        },
      }}
    >
      <AntApp>
        <TokensCtx.Provider value={t}>
          <StoreCtx.Provider value={store}>
            {!booted ? null : ui.modelReady === false ? (
              <Onboarding
                onDone={() => {
                  store.setUi({ modelReady: true });
                  void enter(store, host);
                }}
              />
            ) : (
              <div className="app">
                <Sidebar />
                {ui.page === "settings" ? <SettingsPage /> : <Workspace />}
              </div>
            )}
            {params.get("dev") !== "0" && <DevPanel host={host} />}
          </StoreCtx.Provider>
        </TokensCtx.Provider>
      </AntApp>
    </ConfigProvider>
  );
}

/** 进主界面：载入项目和对话，默认打开回放对话；?seq=N 直接回放到第 N 条事件 */
async function enter(store: AppStore, host: FakeHost) {
  await store.loadProjects();
  const session = params.get("session") ?? "S-41d2";
  await store.openSession(session);
  const seq = Number(params.get("seq"));
  if (seq > 0) host.jumpTo(seq);
  if (params.get("page") === "settings") store.setUi({ page: "settings" });
}
