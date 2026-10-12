# select_column 核心还原记录

Excel列提取与合并工具 — 用于从 Excel 文件中提取指定列，并支持合并多个文件。

**本项状态：** 独立 XLSX 核心 select_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|folder_path|string|是|文件夹路径: 要处理的文件夹路径（会递归查找所有 Excel 文件）|
|should_merge|string|是|是否合并: 填写'是'表示合并多个文件，否则原地替换|
|sheet_keywords|string|是|表名（选填）: 表名关键词，多个关键词用中文或英文逗号分隔，仅处理包含关键词的工作表，留空则处理所有工作表|
|columns_to_keep|string|是|选择列配置: 需要提取的列名（在'选择列配置'工作表中列出），留空则全量合并|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/select_column.pyd**

【功能名称】Excel列提取与合并工具
【功能描述】
用于从 Excel 文件中提取指定列，并支持合并多个文件。
1. 支持指定列提取（在配置表中列出需要的列名）
2. 支持全量合并模式（不指定列时自动合并所有列）
3. 支持原地替换模式（仅保留指定列，直接修改原文件）
4. 支持合并输出模式（将多个文件合并为一个）
5. 自动处理缺失列（填充空值）
6. 支持递归查找文件夹中的所有 Excel 文件
7. 合并结果输出到 output/选择列合并文件.xlsx
8. 支持按表名关键词过滤（仅处理包含关键词的工作表）

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/select_column.pyd|6/6|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__select_column.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__select_column.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__select_column.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/select_column.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|61|get_planning_guide()|||
|84|log(msg)|msg||
|87|print_summary(start_time, success, fail, file_count)|start_time, success, fail, file_count, duration||
|101|_find_excel_files(folder_path)|folder_path, excel_files, root_dir, f|递归查找文件夹中的所有 Excel 文件|
|122|_parse_sheet_keywords(raw_value)|raw_value, raw_str, keywords, kw|解析表名关键词，支持中英文逗号分隔|
|135|_filter_sheets_by_keywords(sheet_names, keywords)|sheet_names, keywords, matched, name, kw|根据关键词过滤工作表名称，返回匹配的表名列表|
|148|_process_single_file(core, file_path, columns_to_keep, should_merge, sheet_keywords=None)|core, file_path, columns_to_keep, should_merge, sheet_keywords, xl, all_sheets, target_sheets, sheet_dfs, sheet_name, df, original_columns, new_df, col_name, combined_df, sheet_info, e|处理单个文件|
|213|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, success_count, fail_count, processed_files_count, work_dir, output_dir, config, cfg_rel_path, full_cfg_path, df_config, folder_path, should_merge, sheet_keywords, columns_to_keep, df_columns, is_full_merge_mode, e, full_path, target_files, msg, results, processed_dataframes, f_idx, f_path, f_name, progress, df_result, res_msg, err_msg, dfs_with_path, file_path_str, df, df_copy, merged_df, output_file_path, wb, ws, link_font, row_idx, cell, path_val||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000e2c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__select_column.pyd/__init____0x18000e0d0.annotated.c>)|
|_filter_sheets_by_keywords|0x180003940|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__select_column.pyd/_filter_sheets_by_keywords__0x180003710.annotated.c>)|
|_find_excel_files|0x1800024d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__select_column.pyd/_find_excel_files__0x1800022f0.annotated.c>)|
|_parse_sheet_keywords|0x180003000|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__select_column.pyd/_parse_sheet_keywords__0x180002e20.annotated.c>)|
|_process_single_file|0x1800042a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__select_column.pyd/_process_single_file__0x180003ec0.annotated.c>)|
|run|0x180006a80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__select_column.pyd/run__0x1800066f0.annotated.c>)|

## 独立源代码和验证范围

独立 XLSX 核心 select_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

|已独立 helper|自有代码|
|---|---|
|select_column._parse_sheet_keywords|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|select_column._filter_sheets_by_keywords|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

[独立 XLSX 核心](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/table_files.py>)

[成果验证](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/table-flow-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
