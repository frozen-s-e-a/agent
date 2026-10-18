# 第三方组件说明

程序内保留随运行库及依赖分发的许可证和来源元数据。Python 包的确切许可证文件路径及 SHA-256 位于 resources/app/runtime/python-packages/independent-dependencies.json。

|组件|固定版本|许可证／说明|
|---|---|---|
|Electron|38.0.0|MIT；附带 Chromium 声明见程序目录 LICENSES.chromium.html|
|Node.js|24.19.0|MIT 及内置依赖，runtime/NODE_LICENSE|
|Python|3.12.14|PSF；runtime/python/LICENSE.txt|
|React / React DOM|19.1.1|MIT|
|Lucide React|0.468.0|ISC|
|react-markdown / remark-gfm|10.1.0 / 4.0.1|MIT；依赖许可证位于 runtime/ui-licenses|
|duckdb|1.4.4|见随包许可证文件及来源元数据|
|openpyxl|3.1.5|MIT|
|psutil|7.0.0|BSD-3-Clause|
|pypdf|6.0.0|BSD-3-Clause|
|et_xmlfile|2.0.0|MIT|
|pandas|3.0.1|BSD 3-Clause License|
|numpy|2.3.5|Copyright (c) 2005-2025, NumPy Developers.|
|python-dateutil|2.9.0.post0|Dual License|
|tzdata|2026.4|Apache-2.0|
|six|1.17.0|MIT|
|pillow|12.3.0|MIT-CMU|
|PyMuPDF|1.26.4|Dual Licensed - GNU AFFERO GPL 3.0 or Artifex Commercial License|
|xlrd|2.0.2|BSD|
|jionlp|1.5.27|Apache License 2.0|
|jiojio|1.2.8|UNKNOWN|
|requests|2.32.5|Apache-2.0|
|urllib3|2.5.0|MIT|
|charset-normalizer|3.4.3|MIT|
|certifi|2025.8.3|MPL-2.0|
|idna|3.10|见随包许可证文件及来源元数据|
|zipfile36|0.1.3|UNKNOWN|
|PyYAML|6.0.3|MIT|

PyMuPDF 的 COPYING 与来源链接随发行包保留，使用其 AGPL／商业许可条件。构建工具为 Vite 7.1.3、TypeScript 5.9.2、Playwright 1.55.0；Node 直接及间接依赖由 pnpm-lock.yaml 固定。

旧工具箱仅作规则与公开空白模板结构的只读研究，程序包不包含旧应用 EXE、业务 PYD、用户凭据或真实底稿。公开格式模板及 JET 规则来源保留在源码资源中。

模型与 HTTP 测试区分夹具和真实接口：业务回归使用声明夹具，另完成真实公开服务与合成内容的真实模型实测。
