# extract_disclosure_tables 核心还原记录

披露表提取 📋

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|
|output_dir|string|否|输出目录路径。不传则使用默认目录。|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/extract_disclosure_tables.pyd**

【功能名称】披露表提取 📋
【输入数据】input/披露表提取配置表.xlsx
【输出结果】output/披露表提取结果.xlsx
【功能描述】
1. 循环读取配置路径下的Excel文件。
2. 搜索包含“工作表关键词”的Sheet页。
3. 根据批注中的“表首”和“表尾”关键词定位表格区域。
4. 优先根据批注编号（如“表首1-1”对“表尾1-1”）配对，无编号则按位置就近配对。
5. 提取圈定区域的所有数据并汇总输出。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/extract_disclosure_tables.pyd|4/5|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__extract_disclosure_tables.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__extract_disclosure_tables.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__extract_disclosure_tables.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/extract_disclosure_tables.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|37|parse_comment_id(comment_text, keyword)|comment_text, keyword, clean_text, pattern, match|<br>    从批注文本中解析ID。<br>    |
|52|find_excel_files(path_val)|path_val, files, root, dirs, filenames, filename|<br>    根据路径寻找Excel文件<br>    |
|67|sanitize_sheet_name(name)|name, safe_name|<br>    清洗Sheet名称<br>    |
|74|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, work_dir, config_path, output_dir, wb_config, ws_config, input_path_val, sheet_keyword, start_keyword, end_keyword, stop_keywords_raw, stop_keywords, parts, e, target_files, wb_out, sheet_map, total_tables_processed, auto_number_counter, fixed_headers, catalog_data, file_idx, file_path, file_name, wb_target, sheet_name, ws, start_points, end_points, row, cell, c_text, c_id, pairs, unmatched_starts, temp_end_points, start, matched, i, end, best_end_idx, min_row_dist, dist, abs_path, folder_dir, fname_base, safe_src_sheet_name, pair, s_row, s_col, e_row, e_col, s_tag, e_tag, table_name_val, raw_val, target_sheet_name, is_new_sheet, ws_out, actual_s_row, actual_e_row, actual_s_col, actual_e_col, DATA_START_COL, idx, header, target_c, c, src_coord, formula, start_write_row, src_data_start_row, current_write_row, r, first_cell_val, val_str, ws_catalog, catalog_headers, item, sheet_n, safe_sn_for_formula, hyperlink_formula, row_data, output_path, p||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x1800116c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__extract_disclosure_tables.pyd/__init____0x1800116c0.annotated.c>)|
|find_excel_files|0x1800024e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__extract_disclosure_tables.pyd/find_excel_files__0x180002300.annotated.c>)|
|parse_comment_id|0x180001d70|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__extract_disclosure_tables.pyd/parse_comment_id__0x180001b50.annotated.c>)|
|run|0x180004310|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__extract_disclosure_tables.pyd/run__0x180003b40.asm>)|
|sanitize_sheet_name|0x180003890|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__extract_disclosure_tables.pyd/sanitize_sheet_name__0x1800036a0.annotated.c>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
