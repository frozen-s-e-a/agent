# tool_preview 核心还原记录

科目余额表处理-数据预览 — 读取科目余额表 Excel 文件，返回列名、样本行，并自动推断所有处理参数。

**本项状态：** 共享科目核心的末级识别、列名去重及数字前缀清洗已独立验证。编码推断、辅助核算与余额校验完整流程待移植。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|file_path|string|是|源 Excel 文件路径|
|sheet_name|string|否|Sheet 名称（不传则读取第一个 Sheet）|
|preview_rows|integer|否|预览行数（默认 5）|
|header_row|integer|否|表头所在行号（1-indexed）。不传则自动检测|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/subject_clean/tool_preview.pyd**

【功能名称】科目余额表处理-数据预览
    【功能描述】读取科目余额表 Excel 文件，返回列名、样本行，并自动推断所有处理参数。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/subject_clean/tool_preview.pyd|1/1|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__subject_clean__tool_preview.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__subject_clean__tool_preview.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__subject_clean__tool_preview.pyd.json>)|
|modules/subject_clean/_core.pyd|29/30|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__subject_clean___core.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__subject_clean___core.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__subject_clean___core.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/subject_clean/tool_preview.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|42|run(ctx, config_mode='direct', config_data=None)|ctx, config_mode, config_data, file_path, sheet_name, preview_rows, header_row, resolved, auto_header, df, warnings, detected, code_structure, aux_format, name_split_info, balance_info, detected_params, sample, preview_list, _, row, row_dict, col, val, column_samples, unique_vals, result, ext, xl, e|预览数据文件，自动推断处理参数。<br><br>    返回示例:<br>    {<br>        "status": "success",<br>        "columns": ["科目编码", "科目名称", ...],<br>        "total_rows": 1234,<br>        "preview": [...],<br>        "detected_params": {<br>            "code_column": "科目编码",<br>            "code_name_column": "科目名称",<br>            "header_row": 1,<br>            "code_name_split": "",<br>            "asist_column": "",<br>            "asist_name_split": "",<br>            "asist_item_wrapper": "",<br>            "beginning_balance": "",<br>            "company_name": "",<br>            "grouping_column": ""<br>        },<br>        "code_structure": {...},<br>        "auxiliary_format": {...},<br>        "warnings": [...]<br>    }<br>    |

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|run|0x1800017d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean__tool_preview.pyd/run__0x180001430.annotated.c>)|

### modules/subject_clean/_core.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|31|resolve_path(ctx, path)|ctx, path, work_dir|路径解析：相对路径用 ctx.current_work_dir 拼接，绝对路径直接使用|
|45|print_header(text: 'str', char: 'str' = '=', length: 'int' = 60)|text, char, length||
|48|print_info(text: 'str', indent: 'int' = 0)|text, indent, prefix||
|52|print_success(text: 'str', indent: 'int' = 0)|text, indent, prefix||
|56|print_warning(text: 'str', indent: 'int' = 0)|text, indent, prefix||
|60|print_sub_info(text: 'str', indent: 'int' = 2)|text, indent, prefix||
|69|detect_columns(df)|df, result, code_keywords, name_keywords, asist_keywords, group_keywords, col, col_lower, genexpr, genexpr, genexpr, genexpr, genexpr|从 DataFrame 列名自动推断关键列。|
|91|detect_header_row(file_path, sheet_name=0)|file_path, sheet_name, df_preview, header_keywords, i, row_vals, genexpr, genexpr|尝试自动检测表头行号（1-indexed）。|
|102|detect_code_structure(df, code_column)|df, code_column, codes, lengths, unique_lengths, result, diffs, Counter, most_common_diff, i|分析编码列，推断层级结构。|
|131|detect_auxiliary_format(df, asist_column)|df, asist_column, values, sample, result, val|分析辅助核算列值，推断包裹符号和键值分隔符。|
|170|detect_code_name_split(df, code_name_column)|df, code_name_column, names, separators, sep, count|分析科目名称列，推断名称分隔符。|
|189|detect_beginning_balance(df)|df, cols_lower, balance_keywords, end_keywords, begin_col, end_col, kw, cl, c, c|检测是否包含期初余额相关列，推断公式。|
|224|_get_max_merged_row(file_path: 'str', sheet_name: 'Union[int, str]', target_row: 'int') -> 'int'|file_path, sheet_name, target_row, max_row_idx, workbook, sheet, merged_cell_range, target_row_idx, rlo, rhi, clo, chi, e||
|247|_fill_merged_header_cells(df_header: 'pd.DataFrame', file_path: 'str', sheet_name: 'Union[int, str]', header_start_row: 'int') -> 'pd.DataFrame'|df_header, file_path, sheet_name, header_start_row, wb, ws, h_start, h_end, merged_range, r_min, r_max, c_min, c_max, src_row_idx, src_col_idx, val, r, c, t_r, t_c||
|279|read_excel_with_auto_header(file_path: 'str', header_start_row: 'int', sheet_name: 'Union[int, str]' = 0) -> 'pd.DataFrame'|file_path, header_start_row, sheet_name, header_start_row_0_idx, max_merged_row_idx, df_preview, first_data_row_idx, i, final_data_row, num_header_rows, df_header, new_columns, last_valid_col_name, col_idx, col_series, parts, part, final_col_name, unique_parts, header_series, df_data||
|332|_add_beginning_balance_column(df: 'pd.DataFrame', beginning_balance_str: 'str') -> 'pd.DataFrame'|df, beginning_balance_str, parts, minuend, subtrahend, val1, val2, p||
|347|_clean_numeric_prefix(parts_list: 'List[str]') -> 'List[str]'|parts_list||
|354|_get_hierarchy_names(row: 'pd.Series', code_column: 'str', code_name_column: 'str', sorted_parent_codes: 'List[str]', code_to_name_map: 'Dict[str, str]') -> 'List[str]'|row, code_column, code_name_column, sorted_parent_codes, code_to_name_map, leaf_code, parent_codes, current_code, parent_found, parent, c||
|370|_parse_asist_values(row: 'pd.Series', asist_column: 'Union[str, List[str]]', asist_name_split: 'str', asist_item_wrapper: 'str') -> 'pd.Series'|row, asist_column, asist_name_split, asist_item_wrapper, new_data, values, val, items, start, end, item, parts, k, v, i||
|398|_get_renamed_columns_list(original_cols: 'List[str]') -> 'List[str]'|original_cols, counts, new_cols, col_counts, col, col||
|414|_preprocess_dataframe(df: 'pd.DataFrame', code_column: 'str', code_name_column: 'str') -> 'pd.DataFrame'|df, code_column, code_name_column, df_clean, header_keywords, mask_is_header_text, base_col_name, mask_is_col_name, summary_pattern, mask_code_summary, mask_name_summary, is_numeric_code, mask_name_garbage, final_mask, removed_rows||
|434|_filter_leaf_accounts(df: 'pd.DataFrame', code_column: 'str') -> 'pd.DataFrame'|df, code_column, all_codes, is_parent||
|441|_add_account_hierarchy_columns(leaf_df: 'pd.DataFrame', full_df: 'pd.DataFrame', code_column: 'str', code_name_column: 'str', code_name_split: 'str') -> 'pd.DataFrame'|leaf_df, full_df, code_column, code_name_column, code_name_split, split_names, df_split, df_map, code_map, sorted_parents, hierarchies, base_col_names, all_columns, renamed_all, new_col_names, col, c, i||
|466|_add_auxiliary_account_columns(df: 'pd.DataFrame', asist_column: 'str', asist_name_split: 'str', asist_item_wrapper: 'str') -> 'Tuple[pd.DataFrame, List[str]]'|df, asist_column, asist_name_split, asist_item_wrapper, cols_to_proc, arg, new_cols_df, added_columns, rename_map, existing_cols, col, cnt, new_name, c||
|499|_split_dataframes(df: 'pd.DataFrame', asist_column: 'str', code_column: 'str', grouping_column: 'str') -> 'Tuple[pd.DataFrame, pd.DataFrame]'|df, asist_column, code_column, grouping_column, cols_check, is_empty, s, df_empty, rule_a, grp_has_aux, never_aux, codes_with_aux, df_not_empty, c||
|529|_generate_auxiliary_summary(df: 'pd.DataFrame', aux_cols: 'List[str]', base_name: 'str', output_root: 'Path') -> 'None'|df, aux_cols, base_name, output_root, summary_rows, subject, group, col, valid_values, example, aux_dir, summary_df, out_path||
|552|_validate_balance_differences(df_empty: 'pd.DataFrame', df_not_empty: 'pd.DataFrame', config: 'Dict[str, Any]') -> 'List[Dict[str, Any]]'|df_empty, df_not_empty, config, all_cols, potential_numeric_cols, group_col, group_keys, has_group_col, get_sums, get_sums, sum_empty, sum_aux, common_indices, common_cols, diff_df, has_diff_mask, diff_rows, report_rows, default_company, file_path_str, idx, row_diff, diff_col_names, company_val, subject_val, c||
|648|export_processed_sheets(df: 'pd.DataFrame', config: 'Dict[str, Any]', new_aux_cols: 'List[str]', output_root: 'Path') -> 'List[Dict[str, Any]]'|df, config, new_aux_cols, output_root, path, company, asist_column, code_column, base_name, is_single_output, f_name, out_path, df_empty, df_not_empty, res_files, p1, validation_results, p2, genexpr, genexpr||
|702|process(config: 'Dict[str, Any]', output_root: 'Path') -> 'List[Dict[str, Any]]'|config, output_root, path, k, df, new_cols, crit_keys, val, idx, forced_cols, ac, col, orig, clean, conv, non_empty, ratio, df_pre, group_col, groups, group_name, grp, leaf, hier, e, df_hier, df_result, new_aux_cols, c, c|统一处理入口|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|_add_account_hierarchy_columns|0x180019c90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_add_account_hierarchy_columns__0x180019800.annotated.c>)|
|_add_auxiliary_account_columns|0x18001c1f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_add_auxiliary_account_columns__0x18001be40.annotated.c>)|
|_add_beginning_balance_column|0x180012490|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_add_beginning_balance_column__0x180012230.annotated.c>)|
|_clean_numeric_prefix|0x1800133b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_clean_numeric_prefix__0x1800130e0.annotated.c>)|
|_fill_merged_header_cells|0x18000d170|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_fill_merged_header_cells__0x18000cd30.annotated.c>)|
|_filter_leaf_accounts|0x180019250|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_filter_leaf_accounts__0x1800186d0.annotated.c>)|
|_generate_auxiliary_summary|0x180020cc0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_generate_auxiliary_summary__0x180020930.annotated.c>)|
|_get_hierarchy_names|0x180013b70|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_get_hierarchy_names__0x1800136d0.annotated.c>)|
|_get_max_merged_row|0x18000b030|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_get_max_merged_row__0x18000ac20.annotated.c>)|
|_get_renamed_columns_list|0x180016490|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_get_renamed_columns_list__0x1800161d0.annotated.c>)|
|_parse_asist_values|0x180014500|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_parse_asist_values__0x180014170.annotated.c>)|
|_preprocess_dataframe|0x180017050|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_preprocess_dataframe__0x180016d00.annotated.c>)|
|_split_dataframes|0x18001eb40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_split_dataframes__0x18001e790.annotated.c>)|
|_validate_balance_differences|0x1800234a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/_validate_balance_differences__0x1800220e0.annotated.c>)|
|detect_auxiliary_format|0x180008060|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/detect_auxiliary_format__0x180007e40.annotated.c>)|
|detect_beginning_balance|0x180009d30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/detect_beginning_balance__0x180009b50.annotated.c>)|
|detect_code_name_split|0x180008f40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/detect_code_name_split__0x180008d20.annotated.c>)|
|detect_code_structure|0x180006db0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/detect_code_structure__0x180006b90.annotated.c>)|
|detect_columns|0x1800047f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/detect_columns__0x180003610.annotated.c>)|
|detect_header_row|0x180006130|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/detect_header_row__0x180005480.asm>)|
|export_processed_sheets|0x180026c30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/export_processed_sheets__0x180025fd0.annotated.c>)|
|get_sums|0x1800226f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/get_sums__0x180022410.annotated.c>)|
|print_header|0x180001960|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/print_header__0x180001960.annotated.c>)|
|print_info|0x180002320|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/print_info__0x180001f20.annotated.c>)|
|print_sub_info|0x180003460|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/print_sub_info__0x180003060.annotated.c>)|
|print_success|0x1800028e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/print_success__0x1800024e0.annotated.c>)|
|print_warning|0x180002ea0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/print_warning__0x180002aa0.annotated.c>)|
|process|0x180029930|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/process__0x1800296d0.annotated.c>)|
|read_excel_with_auto_header|0x18000f870|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/read_excel_with_auto_header__0x18000f1f0.annotated.c>)|
|resolve_path|0x180001480|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean___core.pyd/resolve_path__0x180001250.annotated.c>)|

## 独立源代码和验证范围

共享科目核心的末级识别、列名去重及数字前缀清洗已独立验证。编码推断、辅助核算与余额校验完整流程待移植。

|已独立 helper|自有代码|
|---|---|
|subject_clean/_core._get_renamed_columns_list|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|subject_clean/_core._filter_leaf_accounts|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|subject_clean/_core._clean_numeric_prefix|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
