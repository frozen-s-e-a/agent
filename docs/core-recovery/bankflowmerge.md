# bankflowmerge 核心还原记录

银行流水合并 — 智能合并银行流水文件，支持两种模式：

**本项状态：** 列名去重与列字母递增已独立验证；多文件、多账户、日期口径和成果写出待移植。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|file_paths|array|是|文件路径列表: 银行流水文件的完整路径列表（必填，支持单个或多个文件）|
|header_start_cols|array|是|表头起始列列表: 每个文件的表头起始列，如 ['A', 'A', 'B']（必填）|
|header_start_rows|array|是|表头起始行列表: 每个文件的表头起始行，如 [5, 2, 7]（必填）|
|bank_names|array|是|银行名称列表: 每个文件的银行简称列表，如 ['浦发银行', '工商银行', '民生银行']|
|account_names|array|是|银行户名列表: 每个文件的账户名称列表|
|account_numbers|array|是|银行账号列表: 每个文件的银行账号列表（必须是纯数字，如'83110154700000722'，不要填写账户名称）|
|transaction_date_cols|array|是|交易日期列列表: 每个文件的交易日期列名列表|
|transaction_time_cols|array|是|交易时间列列表: 每个文件的交易时间列名列表|
|counterparty_name_cols|array|是|对方账户列列表: 每个文件的对方账户名称列名列表|
|counterparty_account_cols|array|是|对方账号列列表: 每个文件的对方账号列名列表|
|summary_cols|array|是|摘要列列表: 每个文件的摘要列名列表|
|income_cols|array|是|收入金额列列表: 每个文件的收入金额列名列表|
|expense_cols|array|是|支出金额列列表: 每个文件的支出金额列名列表|
|balance_cols|array|是|余额列列表: 每个文件的余额列名列表|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/bankflowmerge.pyd**

【功能名称】银行流水合并
【功能描述】
智能合并银行流水文件，支持两种模式：
1. **手工模式**：按配置表逐行处理，每行对应一个文件夹/文件
2. **AI模式**：递归扫描文件夹，自动识别表头和元数据，输出标准化字段

**输出字段**（AI模式）：
来源目录、文件名、银行名称、银行户名、银行账号、交易时间、对方账户、对方账号、摘要、收入金额、支出金额、余额

**特点**：
- 自动识别多行表头和合并单元格
- 智能提取银行账号、户名等元数据
- 支持日期+时间字段智能合并
- 处理重复列名

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/bankflowmerge.pyd|22/23|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__bankflowmerge.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__bankflowmerge.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__bankflowmerge.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/bankflowmerge.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|140|get_planning_guide()|||
|269|print_summary(start_time, total_files, total_rows, output_file)|start_time, total_files, total_rows, output_file, duration|打印执行摘要|
|286|smart_parse_datetime(date_val, time_val=None)|date_val, time_val, date_str, time_str, date_obj, date_val_str, fmt, hours, minutes, seconds, time_val_str, time_obj, time_num, e, genexpr, genexpr|<br>    智能解析日期时间，支持多种格式<br>    <br>    Args:<br>        date_val: 日期值（可能是字符串、数字、datetime对象，或包含日期+时间）<br>        time_val: 时间值（可选，可能是字符串、数字）<br>    <br>    Returns:<br>        str: "YYYY-MM-DD HH:MM:SS" 格式的字符串<br>    |
|392|extract_bank_name(text)|text, bank_keywords, keyword, standard_name|<br>    从文本中提取银行简称（使用规范简称）<br>    |
|429|scan_excel_files(folder_path)|folder_path, excel_files, root, dirs, files, file, e|<br>    递归扫描文件夹，返回所有 Excel 文件路径<br>    |
|663|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time|<br>    主运行入口<br>    <br>    Args:<br>        core: 主程序实例<br>        config_mode: 'excel' (手工模式) 或 'direct' (Agent模式)<br>        config_data: Agent模式的参数字典<br>    |
|691|run_manual_mode(core, start_time)|core, start_time, config_file, config_df, e, total_folders, total_files, total_rows, out_folder, standard_columns, idx, row, folder_path, header_col, header_row, custom_fields, col_name, cell_ref, result_df, file_count, folder_name, output_file|<br>    手工模式：按配置表逐行处理<br>    |
|774|process_folder_manual(core, folder_path, header_row, header_col, custom_fields)|core, folder_path, header_row, header_col, custom_fields, result_df, file_count, excel_files, paths, path, all_files, e, file_path, file_df, temp_wb, temp_sheet, field_name, cell_ref, match, col_idx, row_idx, f|<br>    手工模式：处理单个文件夹或文件<br>    支持：文件夹路径、单个文件路径、多个文件路径（用分号分隔）<br>    |
|870|run_agent_mode(core, config_data, start_time)|core, config_data, start_time, file_paths, header_start_rows, header_start_cols, bank_names, account_names, account_numbers, transaction_date_cols, transaction_time_cols, counterparty_name_cols, counterparty_account_cols, summary_cols, income_cols, expense_cols, balance_cols, num_files, ensure_list, ensure_list, clean_value, clean_value, clean_account_number, clean_account_number, out_folder, output_file, all_results, success_count, fail_count, total_rows, i, file_path, file_config, file_result, e, final_df, writer, worksheet, row, cell, value_str, x, x, x|<br>    Agent 模式：批量处理多个文件 + 智能识别 + 标准化输出<br>    <br>    支持批量处理：所有参数都是列表形式，一次性处理多个文件<br>    |
|1126|process_single_file_agent(core, file_path, config_data)|core, file_path, config_data, header_row, header_col, df, bank_name, account_name, account_number, clean_value, clean_value, num_rows, result_df, date_col, time_col, counterparty_col, counterparty_account_col, summary_col, income_col, expense_col, balance_col|<br>    Agent 模式：处理单个文件（智能识别）<br>    <br>    Args:<br>        core: 主程序实例<br>        file_path: 文件路径<br>        config_data: AI 识别的参数字典<br>    <br>    Returns:<br>        pd.DataFrame: 标准化的12列数据<br>    |
|1266|increment_column(col)|col, prefix, last_char, new_prefix|列字母递增函数（支持AA、AB等）|
|1282|_build_col_maps()|col, i||
|1292|_get_renamed_columns_list(original_cols: 'List[str]') -> 'List[str]'|original_cols, counts, new_cols, col_counts, duplicates, col, name, count||
|1310|_get_max_merged_row(file_path: 'str', sheet_name: 'Union[int, str]', target_row: 'int') -> 'int'|file_path, sheet_name, target_row, max_row_idx, workbook, sheet, merged_cell_range, target_row_idx, rlo, rhi, clo, chi, e||
|1333|read_data_with_smart_header(file_path: 'str', header_start_row: 'int', header_start_col: 'str', sheet_name_or_idx: 'Union[int, str]' = 0) -> 'pd.DataFrame'|file_path, header_start_row, header_start_col, sheet_name_or_idx, sheet_name, wb, header_start_row_0_idx, header_start_col_0_idx, max_merged_row_idx, df_preview, e, first_data_content_row_idx, i, first_data_row_final, num_header_rows, ws, header_data, max_col, row_idx, row_values, col_idx, cell_value, df_header, df_header_full, traceback, new_columns, df_data_preview, num_cols, data_start_row, num_cols_to_read, df_data, end_col_idx, unique_columns, col, part, i, col|<br>    智能读取 Excel，支持多行表头和合并单元格<br>    |

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180033290|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/__init____0x1800330a0.annotated.c>)|
|_build_col_maps|0x180009c50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/_build_col_maps__0x180009c50.annotated.c>)|
|_build_col_maps|0x180028cf0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/_build_col_maps__0x180028cf0.annotated.c>)|
|_get_max_merged_row|0x18000b310|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/_get_max_merged_row__0x18000af00.annotated.c>)|
|_get_max_merged_row|0x18002a2a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/_get_max_merged_row__0x180029e90.annotated.c>)|
|_get_renamed_columns_list|0x18000a240|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/_get_renamed_columns_list__0x180009f80.asm>)|
|_get_renamed_columns_list|0x1800292e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/_get_renamed_columns_list__0x180029020.annotated.c>)|
|clean_account_number|0x18001ca40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/clean_account_number__0x18001c4f0.annotated.c>)|
|clean_value|0x18001c330|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/clean_value__0x18001c140.annotated.c>)|
|clean_value|0x180024db0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/clean_value__0x180024bc0.annotated.c>)|
|ensure_list|0x18001ba80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/ensure_list__0x18001b6f0.annotated.c>)|
|extract_bank_name|0x180007800|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/extract_bank_name__0x180007620.annotated.c>)|
|increment_column|0x1800098a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/increment_column__0x1800096b0.annotated.c>)|
|increment_column|0x180028940|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/increment_column__0x180028750.annotated.c>)|
|process_folder_manual|0x1800170b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/process_folder_manual__0x180016ce0.annotated.c>)|
|process_single_file_agent|0x180025640|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/process_single_file_agent__0x1800248e0.annotated.c>)|
|read_data_with_smart_header|0x18000da90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/read_data_with_smart_header__0x18000d090.annotated.c>)|
|read_data_with_smart_header|0x18002ca20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/read_data_with_smart_header__0x18002c020.annotated.c>)|
|run|0x180012db0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/run__0x180012a20.annotated.c>)|
|run_agent_mode|0x18001cf00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/run_agent_mode__0x18001b410.annotated.c>)|
|run_manual_mode|0x1800133e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/run_manual_mode__0x1800131c0.annotated.c>)|
|scan_excel_files|0x1800083b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/scan_excel_files__0x1800081d0.annotated.c>)|
|smart_parse_datetime|0x180003960|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bankflowmerge.pyd/smart_parse_datetime__0x180003260.annotated.c>)|

## 独立源代码和验证范围

列名去重与列字母递增已独立验证；多文件、多账户、日期口径和成果写出待移植。

|已独立 helper|自有代码|
|---|---|
|bankflowmerge._get_renamed_columns_list|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|bankflowmerge.increment_column|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
