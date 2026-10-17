# multi_collect_file 核心还原记录

多表汇集-文件

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/multi_collect_file.pyd**

【功能名称】多表汇集-文件
【核心修正】
  1. 保持绝对路径自动还原功能。
  2. 强制 Excel 打开时自动重算公式（解决 #REF! 显示）。
【输入数据】input/多表汇集-来源文件.xlsx
【输出结果】直接修改配置表中的目标文件

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/multi_collect_file.pyd|10/10|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__multi_collect_file.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__multi_collect_file.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__multi_collect_file.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/multi_collect_file.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|37|ExternalLinkResolver.__init__(self, source_filepath)|self, source_filepath||
|43|ExternalLinkResolver._parse_links(self)|self, z, ext_refs, f, tree, root, ns, ext, rId, rid_to_target, rel, idx, link_index, xml_target, folder, filename, rels_path, raw_target, decoded_target, full_abs_path, combined_path, file_name||
|110|ExternalLinkResolver.resolve_formula(self, formula)|self, formula, replace_func, replace_func, pattern, new_formula|还原为 ='绝对路径/[文件名]Sheet'!A1 格式|
|131|source2target(ws)|ws, connects, row, target_sheet, source_sheet||
|142|copy_cell_format(source_cell, target_cell)|source_cell, target_cell||
|171|move_sheet(wb_source, source_sheet_name, wb_target, target_sheet_name, link_resolver)|wb_source, source_sheet_name, wb_target, target_sheet_name, link_resolver, source_ws, real_source_name, target_ws, char, col_dim, row, row_dim, scan_max_col, fixed_count, cell, target_cell, val, new_val||
|219|process(target_path, source_path, connects)|target_path, source_path, connects, abs_source_path, abs_target_path, target_dir, link_resolver, wb_source, wb_target, Workbook, source_sheet, target_sheet, CalcProperties, e, traceback||
|265|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, start_time, work_dir, config_path, config, ws_connect, connects, ws_path, tasks, row, t, s, e, success_count, idx, t_path, s_path||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180001470|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_file.pyd/__init____0x180001240.annotated.c>)|
|__init__|0x180011450|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_file.pyd/__init____0x180011450.annotated.c>)|
|_parse_links|0x180001a70|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_file.pyd/_parse_links__0x180001890.annotated.c>)|
|copy_cell_format|0x1800075f0|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_file.pyd/copy_cell_format__0x1800073d0.annotated.c>)|
|move_sheet|0x180009710|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_file.pyd/move_sheet__0x180009340.annotated.c>)|
|process|0x18000b900|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_file.pyd/process__0x18000b620.annotated.c>)|
|replace_func|0x180005bd0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_file.pyd/replace_func__0x1800059f0.annotated.c>)|
|resolve_formula|0x180006540|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_file.pyd/resolve_formula__0x1800057c0.annotated.c>)|
|run|0x18000e1e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_file.pyd/run__0x18000de50.annotated.c>)|
|source2target|0x180006ba0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__multi_collect_file.pyd/source2target__0x1800069c0.annotated.c>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
