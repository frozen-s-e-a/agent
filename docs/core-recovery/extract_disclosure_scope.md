# extract_disclosure_scope 核心还原记录

披露口径提取 📋

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|
|output_dir|string|否|输出目录路径。不传则使用默认目录。|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/extract_disclosure_scope.pyd**

【功能名称】披露口径提取 📋
【输入数据】目标附注Excel文件
【输出结果】output/披露口径提取结果.xlsx
【功能描述】
根据单元格批注定位附注表格，提取“报表项目名称”及对应的“披露明细口径”。
支持通过配置表参数控制是否过滤“左侧无文字”的表格。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/extract_disclosure_scope.pyd|3/4|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__extract_disclosure_scope.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__extract_disclosure_scope.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__extract_disclosure_scope.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/extract_disclosure_scope.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|34|clean_report_item_name(text)|text, cleaned|<br>    清洗报表项目名称<br>    例如： "3\|（2）按单项预提..." -> "按单项预提..."<br>    |
|46|parse_comment_id(comment_text, keyword)|comment_text, keyword, pattern, match|<br>    从批注文本中解析ID。<br>    |
|63|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, work_dir, config_path, output_dir, wb_config, ws_config, target_file_path, target_sheet_name, keyword_start, keyword_end, filter_param_val, enable_filter, e, wb_target, ws_target, start_points, end_points, total_rows, scan_interval, row_idx, row, cell, c_text, c_id, pairs, unmatched_starts, temp_end_points, start, matched, i, end, best_end_idx, min_dist, dist, results, skipped_count, pair, start_row, start_col, end_row, left_col_idx, has_left_text, r, val, report_item_raw, report_item, table_data_count, cell_val, cell_val_str, percentage, output_dir_path, output_path, wb_out, ws_out, row_data, processed_table_count||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000c880|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__extract_disclosure_scope.pyd/__init____0x18000c880.annotated.c>)|
|clean_report_item_name|0x180001d10|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__extract_disclosure_scope.pyd/clean_report_item_name__0x180001b20.annotated.c>)|
|parse_comment_id|0x180002270|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__extract_disclosure_scope.pyd/parse_comment_id__0x180002050.annotated.c>)|
|run|0x180002fe0|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__extract_disclosure_scope.pyd/run__0x180002810.asm>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
