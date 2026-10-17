# multi_collect_folder 核心还原记录

多表汇集-文件夹 — 根据关键词匹配文件夹下的多个文件，将其指定表复制到目标文件中。

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/multi_collect_folder.pyd**

【功能名称】多表汇集-文件夹
【功能描述】根据关键词匹配文件夹下的多个文件，将其指定表复制到目标文件中。
【核心特性】
  1. ✅ 完美支持包含外部链接的公式复制。
  2. ✅ 自动将相对路径修复为绝对路径。
  3. ✅ 强制 Excel 打开时重算，解决 #REF! 显示问题。
【输入数据】input/多表汇集-来源文件夹.xlsx
【输出结果】直接修改配置表中的目标文件

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/multi_collect_folder.pyd|10/10|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__multi_collect_folder.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__multi_collect_folder.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__multi_collect_folder.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/multi_collect_folder.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|47|ExternalLinkResolver.__init__(self, source_filepath)|self, source_filepath||
|53|ExternalLinkResolver._parse_links(self)|self, z, ext_refs, f, tree, root, ns, ext, rId, rid_to_target, rel, idx, link_index, xml_target, folder, filename, rels_path, raw_target, decoded_target, full_abs_path, combined_path, file_name||
|120|ExternalLinkResolver.resolve_formula(self, formula)|self, formula, replace_func, replace_func, pattern, new_formula|还原为 ='绝对路径/[文件名]Sheet'!A1 格式|
|141|source2target(ws)|ws, file_keyword2connect, row, target_sheet, source_file_keyword, source_sheet, connects|目标表与来源表的对应关系|
|168|copy_cell_format(source_cell, target_cell)|source_cell, target_cell|将来源单元格的格式复制到目标单元格|
|198|move_sheet(wb_source, source_sheet, wb_target, target_sheet, link_resolver)|wb_source, source_sheet, wb_target, target_sheet, link_resolver, source_ws, real_source_name, target_ws, col, row, fixed_count, scan_max_col, cell, target_cell, val, new_val|搬运表数据（带链接修复）|
|250|process(target_path, source_folder, file_keyword2connect)|target_path, source_folder, file_keyword2connect, wb_target, file_names, processed_files_count, file_name, file_keyword, connects, source_path, resolver, wb_source, source_sheet, target_sheet, e, CalcProperties|<br>    target_path: 目标文件路径<br>    source_folder: 来源文件夹<br>    file_keyword2connect: {keyword: {source_sheet: target_sheet}}<br>    |
|306|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, work_dir, config_path, config, ws_connect, file_keyword2connect, ws_path, tasks, row, t, s, e, idx, target_path, source_folder||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180001470|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_folder.pyd/__init____0x180001240.annotated.c>)|
|__init__|0x180011c70|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_folder.pyd/__init____0x180011c70.annotated.c>)|
|_parse_links|0x180001a70|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_folder.pyd/_parse_links__0x180001890.annotated.c>)|
|copy_cell_format|0x180007a90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_folder.pyd/copy_cell_format__0x180007870.annotated.c>)|
|move_sheet|0x18000a0d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_folder.pyd/move_sheet__0x180009d00.annotated.c>)|
|process|0x18000c0f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_folder.pyd/process__0x18000be10.annotated.c>)|
|replace_func|0x180005bd0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_folder.pyd/replace_func__0x1800059f0.annotated.c>)|
|resolve_formula|0x180006540|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_folder.pyd/resolve_formula__0x1800057c0.annotated.c>)|
|run|0x18000ec20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_folder.pyd/run__0x18000e890.annotated.c>)|
|source2target|0x180006ba0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_folder.pyd/source2target__0x1800069c0.annotated.c>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
