# detailed_table_generate 核心还原记录

明细表-执行生成 — 读取工作目录中已保存的配置（field_mapping、subject_mapping、template_assignment），批量生成明细表底稿。需要 64 位 Excel 环境。

**本项状态：** 共享底稿核心的账龄、汇总、映射、数据检查、模板批注扫描和配置校验已独立验证；尚未完成执行计划、完整模板回填与配置持久化入口。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|work_dir|string|是|工作目录路径（包含 config/ 子目录下的 JSON 配置文件）|
|file_path|string|是|数据源文件路径或文件夹路径|
|output_dir|string|否|输出目录路径（优先级高于 paths 配置中的值）|
|confirmed|boolean|否|确认覆盖已有输出文件（默认 false）|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/detailed_table/detailed_table_generate.pyd**

【功能名称】明细表-执行生成
【功能描述】读取工作目录中已保存的配置（field_mapping、subject_mapping、template_assignment），批量生成明细表底稿。需要 64 位 Excel 环境。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/detailed_table/detailed_table_generate.pyd|1/1|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__detailed_table__detailed_table_generate.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__detailed_table__detailed_table_generate.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__detailed_table__detailed_table_generate.pyd.json>)|
|modules/detailed_table/_core.pyd|51/51|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__detailed_table___core.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__detailed_table___core.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__detailed_table___core.pyd.json>)|
|modules/xlwings_safe.pyd|19/19|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__xlwings_safe.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__xlwings_safe.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__xlwings_safe.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/detailed_table/detailed_table_generate.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|45|run(ctx, config_mode='direct', config_data=None)|ctx, config_mode, config_data, work_dir, file_path, output_dir, confirmed, resolved_file_path, paths_data, resolved_output_dir, copy_empty_template, fm_data, sm_data, ta_data, fm, sm_list, ta_list, text_fields, ta_dict, item, rs, validation_result, existing_subdirs, cname_company, cname_subject, cname_debit, cname_credit, cname_start, cname_end, negative_subjects, _FIXED_CONFIGS, map_dict, config_dir, fname, annotation_name, cfg, mapping, lookup, vals, config_vars, rows, df_config_subject2report, df, e, source2data, master_plan, all_sources_extract_dict, total_companies, app, summary_file, total_files_processed, success, has_data, d, item, v, genexpr, genexpr||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|run|0x180001da0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table__detailed_table_generate.pyd/run__0x180001450.annotated.c>)|

### modules/detailed_table/_core.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|39|resolve_path(ctx, path: 'str') -> 'str'|ctx, path|将相对路径解析为绝对路径。|
|53|ensure_work_dir(work_dir: 'str') -> 'str'|work_dir, config_dir|确保工作目录及 config/ 子目录存在，返回 config 目录路径。|
|60|write_config_json(work_dir: 'str', filename: 'str', data: 'dict')|work_dir, filename, data, config_dir, file_path, f|将配置数据写入工作目录 JSON 文件（UTF-8, ensure_ascii=False）。|
|68|read_config_json(work_dir: 'str', filename: 'str') -> 'dict \| None'|work_dir, filename, config_dir, file_path, f|从工作目录读取配置 JSON 文件。不存在时返回 None。|
|82|read_configuration(path: 'str') -> 'dict'|path, xls, sheet_names, dataframes_dict, sheet_name, df|读取 Excel 配置表所有 Sheet，返回 {sheet_name: DataFrame} 字典。|
|93|extract_field_mapping_from_df(df_standard2name) -> 'dict'|df_standard2name|从'字段名称映射' DataFrame 提取 {标准字段: 实际列名} 字典。|
|98|extract_subject_mapping_from_df(df_subject2report) -> 'list'|df_subject2report, mapping, _, row, item|从'科目与报表科目对应' DataFrame 提取科目映射列表。<br>    每项: {subject, report_subject, symbol, sign, source, is_generate}<br>    |
|116|extract_template_assignment_from_df(df_template2path) -> 'dict'|df_template2path|从'科目与底稿模板' DataFrame 提取 {报表科目: {template_path, sheet_name}} 字典。|
|121|load_and_validate_config(config_dict, df_config_subject2report, df_config_path, df_config_standard2name, df_config_template2path)|config_dict, df_config_subject2report, df_config_path, df_config_standard2name, df_config_template2path, config_vars, required_sheets, sheet, raw_path, is_copy_empty_str, raw_source_dict, cleaned_source_dict, k, v, standard_dict, required_fields, field, fill_column_names, fill_column_name|从 DataFrame 字典中提取并验证配置变量。返回 config_vars 或 None（失败）。|
|203|inspect_file(file_path: 'str', sheet_name: 'str' = None, preview_rows: 'int' = 5) -> 'dict'|file_path, sheet_name, preview_rows, ext, kwargs, df, e, columns, row_count, companies, subjects, col, col_lower, actual_preview_rows, preview|检查单个 Excel 文件，返回 columns, row_count, companies, subjects, preview。|
|249|inspect_folder(folder_path: 'str', preview_rows: 'int' = 5) -> 'dict'|folder_path, preview_rows, excel_files, df_first, e, columns, row_count, actual_preview_rows, preview|检查文件夹（多期数据），返回 file_count, columns, periods, preview。|
|288|inspect_templates(template_dir: 'str') -> 'list'|template_dir, result, excel_files, fp, template_info, wb, ws, sheet_info, seen, row, cell, text|扫描模板目录，返回每个模板的 Sheet 和批注字段。|
|325|validate_config(field_mapping: 'dict', subject_mapping: 'list', template_assignment: 'dict', data_source_path: 'str' = None) -> 'dict'|field_mapping, subject_mapping, template_assignment, data_source_path, errors, fm, std_field, ta, sm_list, report_subjects, item, rs, info, tpl_path, df_check, source_cols, actual_col, parts, missing, unique_templates, p|校验所有配置的完整性和一致性。<br><br>    检查项：<br>    1. field_mapping 包含全部 6 个必填标准字段<br>    2. subject_mapping 中每个 report_subject 在 template_assignment 中有对应条目<br>    3. template_assignment 中每个 template_path 指向存在的文件<br>    4. （可选）data_source_path 中的列名与 field_mapping 一致<br><br>    返回:<br>        {<br>            "status": "valid" \| "invalid",<br>            "errors": [...],<br>            "summary": {...}<br>        }<br>    |
|445|computing_field_info(fill_column_name)|fill_column_name, column_name_dict, column_names, debit, credit, debit_names, credit_names|解析字段名中的借贷方向信息（如 "客户-贸易伙伴/供应商-贸易伙伴"）。|
|473|first2second(df, columns=None)|df, columns, report_dict, selected_columns|建立第一列与后续列的对应关系。|
|485|get_fill_column_cells(ws, fill_column_names)|ws, fill_column_names, fill_column_info, first_row, last_row, group_by_column_num, extract_field2column, used_range, row, col, cell, comment, location_cell, comment_row, merged_range|从 xlwings worksheet 中读取批注，获取填充列信息。<br>    返回: (fill_column_info, first_row, last_row, group_by_column_num, extract_field2column)<br>    |
|522|computing_annotation_relationships(fill_column_info, standard_dict)|fill_column_info, standard_dict, column2name, standard_column_name, column_num, fill_column_name, raw_column_name, num, map_val, fill_column_dict|根据模板批注字典计算列号对应的借贷字段关系。|
|545|insert_rows(ws, first_row, last_row, df_rows)|ws, first_row, last_row, df_rows, available_rows, rows_to_insert, insert_row_num, init_insert_row, max_col, source_range, target_range|在工作表中插入行并复制格式。返回插入的行数。|
|572|write_data_to_sheet(wb, item_info, standard_dict, result_folder, map_dict, periods=0, is_copy_empty=False, company_name='', text_fields=None)|wb, item_info, standard_dict, result_folder, map_dict, periods, is_copy_empty, company_name, text_fields, subjects, sheet_name, dfs, symbols, destination_folder, extract_dict, source_calc_map, output_name, source_col_name, total_val, df, ws, fill_column_names, fill_column_info, first_row, last_row, group_by_column_num, extract_field2column, column2name, text_column_indices, col_num, col_info, fields_in_col, cname_debit, cname_credit, cname_start, cname_end, current_data, i, symbol, subject, age_folder, destination_age_path, index, row, column_num, column_dict, fields, is_filled, field, sheet_name_map, relation, df_fill, columns, insert_num, column_data, start_cell, end_cell, target_range, comment, cell_to_extract, cell_address, full_path, file_dir, file_name, sheet_name_str, formula_string, sheet, genexpr, genexpr, field, value|将数据写入已打开的工作簿指定工作表。返回 (success, extract_dict)。|
|715|force_numeric_columns(df: 'pd.DataFrame', columns: 'Union[str, List[str]]') -> 'pd.DataFrame'|df, columns, column_name|强制将指定列转换为数值类型。|
|730|reverse_dataframe(dfs, filter_column, change_columns, values)|dfs, filter_column, change_columns, values, df, mask, column|对负号科目的金额列取反。|
|756|computing_file_to_dataframe(folder, text_field=None)|folder, text_field, paths, id2df, filter_period, converters, field, path, file_name, file_num, df|读取文件夹下多个 Excel 文件，返回 (dfs_list, filter_period)。|
|786|merge_data(dfs, on_list, how, select_columns)|dfs, on_list, how, select_columns, index, result, df, new_columns, new_select_columns, column|合并多期数据。|
|819|_create_age_dict(num)|num, age_dict, i||
|826|_age_dict_compute(age_dict, amount, num)|age_dict, amount, num, i, period_amount, remainder_amount||
|842|_age_dict_reset(age_dict)|age_dict, period||
|846|_age_count_single(age_info, amount, num)|age_info, amount, num, total, current_total||
|869|_reverse_age_dict(age_dict)|age_dict, k, v||
|875|age_count(init, period_amount_debit, period_amount_credit, symbol)|init, period_amount_debit, period_amount_credit, symbol, periods, age_front, age_back, age_info, i, amount_debit, amount_credit|计算单个科目的账龄分布。|
|911|add_age_column(df, periods, symbol, cname_start, cname_debit, cname_credit, cname_end)|df, periods, symbol, cname_start, cname_debit, cname_credit, cname_end, index, row, debit_list, credit_list, i, init, age_info, direction, age_list, cname|为 DataFrame 添加账龄列。|
|933|pre_scan_templates_for_on_list(config_vars, df_config_subject2report, cname_company, cname_subject)|config_vars, df_config_subject2report, cname_company, cname_subject, source_to_on_list_map, source_data_path, template_dict, standard_dict, related_party_sources, source_name, path, app, source_subjects_config, first_report_subject_name, _, row, template_path, sheet_name, wb, ws, fill_column_names, fill_column_info, group_by_column_num, on_list_source, comment_map, additional_fields, col_num, std_name, full_field_name, field_components, f, e, traceback, s, k, v|预扫描模板获取往来科目聚合字段。返回 {source_name: on_list} 或 None（失败）。|
|1053|load_all_data_sources(source_data_path, config_vars, source_to_on_list_map)|source_data_path, config_vars, source_to_on_list_map, source2data, cname_subject, cname_start, cname_end, negative_subjects, text_field, cname_company, cname_debit, cname_credit, data_name, path, data, dfs, num_range, periods, select_columns, account_current_field, df_config_path, recent_end_cnames, e, i|加载所有数据源，返回 {source_name: {df, periods}} 或 None（失败）。|
|1127|build_master_plan(source2data, config_vars, df_config_subject2report)|source2data, config_vars, df_config_subject2report, master_plan, all_sources_extract_dict, standard_dict, template_dict, result_folder, cname_company, cname_subject, is_copy_empty, debug_stats, mapped_columns, all_companies, source_name, data, df, comps, total_companies_configured, active_configs, _, row, company, aggregated_tasks, config, subject_name, report_subject, template_info, template_path, target_df, periods, has_data, source_data, full_df, mask, df_slice, valid_cols, numeric_cols, total_val, should_add, task, task_data, destination_folder, destination_path, plan_key, info, work_item, task_count, c, c|构建总任务计划。返回 (master_plan, all_sources_extract_dict, total_companies)。|
|1329|execute_master_plan(app, master_plan, stop_checker, config_vars, all_sources_extract_dict)|app, master_plan, stop_checker, config_vars, all_sources_extract_dict, standard_dict, result_folder, map_dict, is_copy_empty, text_fields, total_files_processed, company, destination_path, work_items, all_empty, source_template_path, file_dir, e, is_repaired, temp_path, wb, wb_temp, repair_error, file_had_data_written, work_item, item_info, report_subject, periods_for_this_item, sheet_name, result, extract_dict, backup_path, genexpr, genexpr|执行总任务计划。返回 (total_files_processed, success)。|
|1479|extract_comment_to_excel(info, folder)|info, folder, data_rows, company, report_dict, report_subject, fields, row_data, field, value, df, fixed_columns, col, remaining_columns, final_columns, timestamp, filename, file_path, app, wb, ws, e, c|将批注信息汇总到 Excel 文件。返回文件路径或 None。|
|1556|_get_excel_files(directory)|directory, excel_files, root, _, files, file|获取目录下所有 Excel 文件路径。|
|1568|_get_destination_path(source_path, destination_folder)|source_path, destination_folder, filename, destination_path|根据原文件路径和目标文件夹，生成目标文件路径。|
|1575|_judge_and_create_folders(folder, sub_folder)|folder, sub_folder, full_path|创建子文件夹并返回完整路径。|
|1583|_check_dfs(dfs)|dfs, genexpr, genexpr|判断 dfs 列表是否全部为空。|
|1588|_add_data(data, key, value)|data, key, value, column_data|向字典中追加数据。|
|1599|_get_subject_of_status(df, column_num)|df, column_num, mask, fields, output, field, data|获取指定状态列为'是'的科目字段列表。|
|1611|_read_excel(path, sheet_name=0, text_field=None)|path, sheet_name, text_field, converters, field, df|读取 Excel 文件，支持文本字段转换。|
|1625|_company2data(df, cname_company)|df, cname_company, company_dict, companies, company, df_company|按公司名称拆分 DataFrame。|
|1636|_clear_sheet_value(ws, first_row, last_row, columns)|ws, first_row, last_row, columns, col, rng|清除工作表指定区域的值。|
|1643|_aggregate_dataframe(df, columns)|df, columns, numeric_columns, agg_dict, aggregated_df, column, col|按指定列聚合 DataFrame。|
|1659|_groupby(df, on_list)|df, on_list, agg_dict, col|按指定列分组聚合。|
|1672|_calc_rows(dfs)|dfs, total_rows, df|计算科目数据的总行数。|
|1680|_get_filename(file_path)|file_path|获取文件名（不含路径）。|
|1685|_sort_dict_by_value(d)|d|按键排序字典。|
|1690|_build_report_subject_map_for_company(company, df_company_data, report_dict, standard_dict, template_dict)|company, df_company_data, report_dict, standard_dict, template_dict, report2subject, subjects_with_no_data, cname_subject, subject, info, report_subject, symbol, df_sub, subject2info, template_path|为单个公司构建报表科目到数据的映射。|
|1736|print_execution_summary(start_time, end_time, total_files_processed, total_files, total_companies, all_sources_extract_dict, result_folder)|start_time, end_time, total_files_processed, total_files, total_companies, all_sources_extract_dict, result_folder, duration, minutes, seconds, real_file_path, summary_status|打印执行摘要信息。|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|_add_data|0x180044e80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_add_data__0x180044b90.annotated.c>)|
|_age_count_single|0x180024a00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_age_count_single__0x180024720.annotated.c>)|
|_age_dict_compute|0x180023dd0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_age_dict_compute__0x180023ae0.annotated.c>)|
|_age_dict_reset|0x1800243c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_age_dict_reset__0x1800241d0.annotated.c>)|
|_aggregate_dataframe|0x180047bd0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_aggregate_dataframe__0x180047550.annotated.c>)|
|_build_report_subject_map_for_company|0x18004a3c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_build_report_subject_map_for_company__0x180049ff0.annotated.c>)|
|_calc_rows|0x180049430|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_calc_rows__0x180049240.annotated.c>)|
|_check_dfs|0x1800446a0|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_check_dfs__0x180044440.annotated.c>)|
|_clear_sheet_value|0x180047030|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_clear_sheet_value__0x180046d20.annotated.c>)|
|_company2data|0x180046740|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_company2data__0x180046510.annotated.c>)|
|_create_age_dict|0x180023830|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_create_age_dict__0x180023640.annotated.c>)|
|_get_destination_path|0x180043ba0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_get_destination_path__0x180043970.annotated.c>)|
|_get_excel_files|0x180042da0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_get_excel_files__0x180042bc0.annotated.c>)|
|_get_filename|0x1800558b0|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_get_filename__0x1800496d0.annotated.c>)|
|_get_subject_of_status|0x1800452b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_get_subject_of_status__0x180045090.annotated.c>)|
|_groupby|0x180048c80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_groupby__0x180048a60.annotated.c>)|
|_judge_and_create_folders|0x180044050|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_judge_and_create_folders__0x180043e20.annotated.c>)|
|_read_excel|0x180045e30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_read_excel__0x180045aa0.annotated.c>)|
|_reverse_age_dict|0x1800259d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_reverse_age_dict__0x1800257e0.annotated.c>)|
|_sort_dict_by_value|0x180049db0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/_sort_dict_by_value__0x1800499c0.annotated.c>)|
|add_age_column|0x180027e20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/add_age_column__0x180027970.annotated.c>)|
|age_count|0x180026190|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/age_count__0x180025e80.annotated.c>)|
|build_master_plan|0x1800324f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/build_master_plan__0x180032210.annotated.c>)|
|computing_annotation_relationships|0x180015360|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/computing_annotation_relationships__0x180015140.annotated.c>)|
|computing_field_info|0x180012080|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/computing_field_info__0x180011ea0.annotated.c>)|
|computing_file_to_dataframe|0x180020e60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/computing_file_to_dataframe__0x180020980.annotated.c>)|
|ensure_work_dir|0x180001be0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/ensure_work_dir__0x180001910.annotated.c>)|
|execute_master_plan|0x180038670|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/execute_master_plan__0x180037bf0.annotated.c>)|
|extract_comment_to_excel|0x18003f2a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/extract_comment_to_excel__0x18003f080.annotated.c>)|
|extract_field_mapping_from_df|0x180005080|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/extract_field_mapping_from_df__0x180004e90.annotated.c>)|
|extract_subject_mapping_from_df|0x1800053e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/extract_subject_mapping_from_df__0x180005200.annotated.c>)|
|extract_template_assignment_from_df|0x180005fb0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/extract_template_assignment_from_df__0x180005dc0.annotated.c>)|
|first2second|0x180012fc0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/first2second__0x180012ce0.annotated.c>)|
|force_numeric_columns|0x18001e620|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/force_numeric_columns__0x18001e400.annotated.c>)|
|get_fill_column_cells|0x180013ab0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/get_fill_column_cells__0x180013890.annotated.c>)|
|insert_rows|0x180016880|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/insert_rows__0x180016570.annotated.c>)|
|inspect_file|0x1800097b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/inspect_file__0x180009340.annotated.c>)|
|inspect_folder|0x18000b9a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/inspect_folder__0x18000b630.annotated.c>)|
|inspect_templates|0x18000d2e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/inspect_templates__0x18000d020.annotated.c>)|
|load_all_data_sources|0x18002ead0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/load_all_data_sources__0x18002e7f0.annotated.c>)|
|load_and_validate_config|0x1800065a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/load_and_validate_config__0x1800061d0.annotated.c>)|
|merge_data|0x1800220b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/merge_data__0x180021da0.annotated.c>)|
|pre_scan_templates_for_on_list|0x180029270|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/pre_scan_templates_for_on_list__0x180028f60.annotated.c>)|
|print_execution_summary|0x18004bdb0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/print_execution_summary__0x18004b900.annotated.c>)|
|read_config_json|0x180003130|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/read_config_json__0x180002ec0.annotated.c>)|
|read_configuration|0x180004030|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/read_configuration__0x180003d70.annotated.c>)|
|resolve_path|0x1800013d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/resolve_path__0x180001180.annotated.c>)|
|reverse_dataframe|0x18001f7e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/reverse_dataframe__0x18001f030.annotated.c>)|
|validate_config|0x18000f080|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/validate_config__0x18000ec00.annotated.c>)|
|write_config_json|0x180002330|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/write_config_json__0x180001fc0.annotated.c>)|
|write_data_to_sheet|0x180017fc0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__detailed_table___core.pyd/write_data_to_sheet__0x180017600.annotated.c>)|

### modules/xlwings_safe.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|27|_get_safe_dir()|base, safe_dir|返回 macOS 安全目录路径，Windows 返回 None。|
|44|_SafeBook.__init__(self, wb, original_path=None)|self, wb, original_path||
|48|_SafeBook.__getattr__(self, name)|self, name||
|51|_SafeBook.__setattr__(self, name, value)|self, name, value||
|57|_SafeBook.save(self, path=None)|self, path, target, safe_dir, tmp||
|86|_SafeBook.close(self)|self, safe_path||
|100|_SafeBooks.__init__(self, app)|self, app||
|103|_SafeBooks.open(self, path, **kwargs)|self, path, kwargs, safe_dir, basename, safe_path, wb||
|116|_SafeBooks.add(self)|self, wb||
|120|_SafeBooks.__getattr__(self, name)|self, name||
|131|SafeApp.__init__(self, **kwargs)|self, kwargs||
|143|SafeApp.__getattr__(self, name)|self, name||
|146|SafeApp.__setattr__(self, name, value)|self, name, value||
|152|SafeApp.quit(self)|self||
|156|SafeApp.kill(self)|self||
|160|SafeApp.__enter__(self)|self||
|163|SafeApp.__exit__(self, *args)|self, args||
|171|_cleanup()|safe_dir, prefix, f|清理本进程在安全目录中的临时文件。|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__enter__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__enter____0x180008740.annotated.c>)|
|__exit__|0x180008d60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__exit____0x1800089f0.annotated.c>)|
|__getattr__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__getattr____0x180001bc0.annotated.c>)|
|__getattr__|0x180006750|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__getattr____0x180006430.annotated.c>)|
|__getattr__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__getattr____0x180007520.annotated.c>)|
|__init__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__init____0x1800016d0.annotated.c>)|
|__init__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__init____0x1800049c0.annotated.c>)|
|__init__|0x180006be0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__init____0x1800068a0.annotated.c>)|
|__setattr__|0x1800022d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__setattr____0x180001f60.annotated.c>)|
|__setattr__|0x180007c30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__setattr____0x1800078c0.annotated.c>)|
|_cleanup|0x18000c8a0|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/_cleanup__0x180009130.annotated.c>)|
|_get_safe_dir|0x18000cb80|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/_get_safe_dir__0x180001030.annotated.c>)|
|add|0x1800061e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/add__0x180005f30.annotated.c>)|
|api|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/api__0x1800071f0.annotated.c>)|
|books|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/books__0x180006f10.annotated.c>)|
|kill|0x180008550|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/kill__0x1800082a0.annotated.c>)|
|open|0x180005120|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/open__0x180004d50.annotated.c>)|
|quit|0x1800080b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/quit__0x180007e00.annotated.c>)|
|save|0x180002890|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/save__0x180002500.annotated.c>)|

## 独立源代码和验证范围

共享底稿核心的账龄、汇总、映射、数据检查、模板批注扫描和配置校验已独立验证；尚未完成执行计划、完整模板回填与配置持久化入口。

|已独立 helper|自有代码|
|---|---|
|detailed_table/_core._create_age_dict|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/accounting.py>)|
|detailed_table/_core._age_dict_reset|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/accounting.py>)|
|detailed_table/_core._reverse_age_dict|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/accounting.py>)|
|detailed_table/_core._age_dict_compute|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/accounting.py>)|
|detailed_table/_core._age_count_single|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/accounting.py>)|
|detailed_table/_core.age_count|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/accounting.py>)|
|detailed_table/_core.first2second|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core.extract_field_mapping_from_df|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core.extract_template_assignment_from_df|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core.computing_field_info|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core.force_numeric_columns|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core._aggregate_dataframe|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core._groupby|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core._company2data|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core._check_dfs|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core._calc_rows|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core.reverse_dataframe|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core.inspect_file|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core.inspect_folder|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core.inspect_templates|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|
|detailed_table/_core.validate_config|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/workpapers.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
