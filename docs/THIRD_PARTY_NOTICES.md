# 第三方组件说明

此内部测试程序使用以下组件，保留其随运行时或依赖包分发的许可证。商用或公开发布前仍需完成完整 SBOM 与许可证审核。

|组件|固定版本|许可证/用途|
|---|---|---|
|Electron|38.0.0|MIT；Chromium 等附加声明见 LICENSE、LICENSES.chromium.html|
|Node.js|24.19.0（构建运行时）|MIT 及内置依赖声明，详见 runtime/NODE_LICENSE|
|Python|3.12（随包构建的具体补丁见 build-manifest）|PSF License，runtime/python/LICENSE.txt|
|React / React DOM|19.1.1|MIT；渲染界面|
|Lucide React|0.468.0|ISC；图标|
|DuckDB|1.4.4|MIT；本地分析|
|openpyxl|3.1.5|MIT；Excel 解析导出|
|et-xmlfile|2.0.0|MIT；XML 导出|
|psutil|7.0.0|BSD-3-Clause；资源监控|
|pypdf|6.0.0|BSD-3-Clause；PDF 文本|

构建工具：Vite 7.1.3、TypeScript 5.9.2、Playwright 1.55.0。全部 Node 直接和间接依赖版本由 pnpm-lock.yaml 固定。测试使用的模型响应为协议测试夹具，不是实际付费模型输出。

DeepSeek Harness 仅作为固定提交的研究参考；本包没有复制其实现，也没有声明与其全部插件兼容。

旧工具箱业务模块仅用于只读研究。新包包含脱敏结构清单、工作表元数据与规则定义，不含旧应用二进制、凭据或真实底稿。原 JET 模板中的规则文本来源及 hash 位于 src/resources/jet-rules.json。


## Markdown rendering

react-markdown 10.1.0 and remark-gfm 4.0.1 (MIT), with their resolved production dependencies. Bundled license texts and the resolved dependency inventory are included in resources/app/runtime/ui-licenses.
