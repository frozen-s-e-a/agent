import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// npm run dev       假宿主，回放样例事件
// npm run dev:real  真实宿主：先另开终端 node ../app-host/main.mjs，这里把命令和事件转过去
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const hostUrl = env.AUDIT_HOST_URL ?? "http://127.0.0.1:8787";
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: "127.0.0.1",
      proxy: Object.fromEntries(["/rpc", "/events", "/upload"].map((p) => [p, { target: hostUrl, changeOrigin: true }])),
    },
    build: { chunkSizeWarningLimit: 4000 },
  };
});
