# monthly_execute 核心还原记录

月间分析-执行分析 — 接收已确认的字段映射、编码结构、科目列表等参数，执行月间分析表生成。

**本项状态：** 共享月间核心已安全加载；科目编码、层级、名称和父级识别已独立验证。完整月间计算及 AI 流程尚未移植。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|this_year_file|string|是|本期序时账数据文件路径（Excel/CSV）|
|last_year_file|string|否|上期序时账数据文件路径，不传则仅做本期月度汇总|
|this_year_sheet|string|否|本期数据 Sheet 名（默认第一个 Sheet）|
|last_year_sheet|string|否|上期数据 Sheet 名（默认第一个 Sheet）|
|subjects|string|是|要分析的科目列表 JSON: [{"code": "6001", "direction": "贷"}, ...]。direction 为借或贷|
|column_mapping|string|是|序时账列名映射 JSON: {"date": "日期列名", "subject_code": "科目代码列名", "subject_name": "科目名称列名", "debit": "借方列名", "credit": "贷方列名", "company": "公司名称列名", "desc": "摘要列名", "voucher": "凭证号列名"}。date/subject_code/subject_name 必填，debit 和 credit 至少填一个|
|code_structure|string|否|科目编码结构参数 JSON: {"flag": "科目名称分隔符", "start": 1, "full_length": 0, "init_length": 4, "step": 2, "code_delimiter": "科目代码分隔符"}|
|output_path|string|否|输出文件路径。不传则使用默认路径 output/月间分析结果表.xlsx|
|threshold_amt|number|否|AI变动分析-变动额阈值（默认100000），超过此金额的科目才做AI分析|
|threshold_rate|number|否|AI变动分析-变动率阈值（默认0.3即30%），超过此比率的科目才做AI分析|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/monthly_analysis/monthly_execute.pyd**

【功能名称】月间分析-执行分析
    【功能描述】接收已确认的字段映射、编码结构、科目列表等参数，执行月间分析表生成。
    支持可选的 AI 变动分析。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/monthly_analysis/monthly_execute.pyd|0/1|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__monthly_analysis__monthly_execute.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__monthly_analysis__monthly_execute.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__monthly_analysis__monthly_execute.pyd.json>)|
|modules/monthly_analysis/_core.pyd|26/26|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__monthly_analysis___core.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__monthly_analysis___core.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__monthly_analysis___core.pyd.json>)|
|modules/ai_utils.pyd|2/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ai_utils.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ai_utils.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ai_utils.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/monthly_analysis/monthly_execute.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|90|run(ctx, config_mode='direct', config_data=None)|ctx, config_mode, config_data, start_time, ai_count, result, work_dir, this_year_file, last_year_file, subjects_raw, subjects_list, df_subject, col_map_raw, col_map, cname_date, cname_subject_code, cname_subject_name, cname_debit, cname_credit, cname_company, cname_desc, cname_voucher, req, miss, code_struct_raw, code_struct, flag, start, full_length, init_length, step, code_delimiter, info, ai_active, ai_config_dict, settings, base_url, api_key, sn_this, sn_last, df_this_year, df_last_year, target_codes_list, col_map_check, valid_this, errors_this, valid_last, errors_last, all_errors, check_cols, missing_cols, group_by_company, companies_set, all_companies, all_company_results, final_on_list, i, company_name, df_this_grp, df_last_grp, curr_comp_label, df_this_res, on_list, df_last_res, on_list_last, res, has_this, has_last, mask_normal, mask_new, ai_col_map, ai_settings, cols_order, output_path, output_dir, e, k, v, c, i, c|执行月间分析，接收已确认的参数，输出结果文件。|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|run|0x180001cb0|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis__monthly_execute.pyd/run__0x180001910.asm>)|

### modules/monthly_analysis/_core.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|18|check_api_connection(base_url, api_key)|base_url, api_key, client, e|检查API参数并测试连接性|
|35|validate_source_data(df, source_label, col_mapping, code_info, target_codes=None)|df, source_label, col_mapping, code_info, target_codes, is_valid, errors, cname_subject_name, cname_subject_code, flag, start, full_length, init_length, step, code_delimiter, missing_cols, safe_targets, regex_pattern, source_codes_series, mask, df_check, get_error_details, get_error_details, non_str_mask, ex_str, loc, s_codes, effective_codes, is_multi_level, s_names, missing_flag_mask, bad_rows, ex_code, reason_msg, has_flag_mask, split_counts, invalid_start_mask, c, x|全量数据预检函数|
|146|convert_to_date(df, column_name)|df, column_name, dtype, series, cleaned_series, problematic_value, problematic_rows||
|165|convert_to_float(df, column_names)|df, column_names, column_name, e||
|179|get_source_path(df_source)|df_source, path_this_year, sheet_name_this_year, path_last_year, sheet_name_last_year||
|187|read_source_file(file_path, sheet_name=None, **kwargs)|file_path, sheet_name, kwargs, os, ext|根据文件扩展名自动选择读取方式，支持 csv 和 Excel|
|201|get_code_info(df)|df, flag, start, full_length, init_length, step, code_delimiter||
|221|first2second(df, columns=None)|df, columns, report_dict, selected_columns||
|232|resolve_path(ctx, path)|ctx, path, os, work_dir|路径解析：相对路径用 ctx.current_work_dir 拼接，绝对路径直接使用|
|243|calc_sub_name(name, flag, start, level, source_context='上下文未知')|name, flag, start, level, source_context, name_list, index, sub_name||
|261|calc_sub_code(code, give_code, step=2, full_length=0, code_delimiter=None)|code, give_code, step, full_length, code_delimiter, length, sub_code_length, sub_code||
|273|calc_level(give_code, step=2, init_length=4, code_delimiter=None)|give_code, step, init_length, code_delimiter, level||
|280|monthly_analysis(df, info, df_subject, sum_column_name, ctx, current_company_name='未知公司')|df, info, df_subject, sum_column_name, ctx, current_company_name, cname_company, cname_date, cname_subject_code, cname_subject_name, cname_debit, cname_credit, _, start, step, flag, full_length, init_length, code_delimiter, cname_detail_name, cname_month, cname_detail_code, cname_code, cname_name, cname_direction, cname_level1_subject, result, columns, total_subjects, index, row, give_code, direction, value_col, level, df_sub, context_str, l1_len, cols_to_convert, month_columns, pivot_df, mc, new_columns, c||
|378|remove_parent_code(df, code_column)|df, code_column, codes, parent_codes, df_child||
|386|find_parent_codes(codes)|codes, parent_codes, code_set, code, other_code||
|398|perform_ai_variance_analysis(result_df, df_this_raw, df_last_raw, ai_config, col_mapping, api_settings, ctx)|result_df, df_this_raw, df_last_raw, ai_config, col_mapping, api_settings, ctx, threshold_amt, threshold_rate, month_conc_threshold, max_sample_rows, user_system_prompt, need_procedure, client, model_name, system_prompt_content, cname_company, cname_code_gl, cname_name_gl, cname_desc, cname_debit, cname_credit, cname_date, cname_voucher, mask, target_indices, total_targets, _safe_amt, _safe_amt, _prepare_df, _prepare_df, _build_monthly_overview, _build_monthly_overview, _build_sub_account_overview, _build_sub_account_overview, _filter_transfer_entries, _filter_transfer_entries, _select_focus_months, _select_focus_months, _build_samples, _build_samples, processed_count, idx, row, detail_code, direction, company_name, df_t, df_l, monthly_overview, m_diff, sub_account_overview, focus_months, month_text, samples, json_req, prompt_parts, user_prompt, max_retries, content, attempt, response, res_json, match, e, p|AI变动分析核心逻辑 - 分层prompt策略：全局视角 + 重点样本|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|_agg_by_sub|0x18001bae0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/_agg_by_sub__0x18001b770.annotated.c>)|
|_build_monthly_overview|0x1800187e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/_build_monthly_overview__0x180018470.annotated.c>)|
|_build_samples|0x180022f80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/_build_samples__0x180020540.annotated.c>)|
|_build_sub_account_overview|0x18001c650|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/_build_sub_account_overview__0x18001b380.annotated.c>)|
|_filter_transfer_entries|0x18001f2d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/_filter_transfer_entries__0x18001f020.annotated.c>)|
|_fmt_rows|0x180020ce0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/_fmt_rows__0x1800209b0.annotated.c>)|
|_prepare_df|0x180017880|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/_prepare_df__0x180017550.annotated.c>)|
|_safe_amt|0x180017230|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/_safe_amt__0x180016f10.annotated.c>)|
|_select_focus_months|0x18001fa40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/_select_focus_months__0x18001f710.annotated.c>)|
|calc_level|0x1800106e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/calc_level__0x1800101f0.annotated.c>)|
|calc_sub_code|0x18000fea0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/calc_sub_code__0x18000f940.annotated.c>)|
|calc_sub_name|0x18000f410|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/calc_sub_name__0x18000ef50.annotated.c>)|
|check_api_connection|0x180001c00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/check_api_connection__0x1800018d0.annotated.c>)|
|convert_to_date|0x180008760|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/convert_to_date__0x180008430.annotated.c>)|
|convert_to_float|0x18000a200|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/convert_to_float__0x180009ed0.annotated.c>)|
|find_parent_codes|0x180016310|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/find_parent_codes__0x180016060.annotated.c>)|
|first2second|0x18000dfa0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/first2second__0x18000dc10.annotated.c>)|
|get_code_info|0x18000c760|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/get_code_info__0x18000c4b0.annotated.c>)|
|get_error_details|0x180003010|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/get_error_details__0x180002cf0.annotated.c>)|
|get_source_path|0x18000b560|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/get_source_path__0x18000b2b0.annotated.c>)|
|monthly_analysis|0x180011260|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/monthly_analysis__0x1800109e0.annotated.c>)|
|perform_ai_variance_analysis|0x1800254a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/perform_ai_variance_analysis__0x1800169c0.annotated.c>)|
|read_source_file|0x18000bbe0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/read_source_file__0x18000b890.annotated.c>)|
|remove_parent_code|0x180015bd0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/remove_parent_code__0x1800158b0.annotated.c>)|
|resolve_path|0x18000eb90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/resolve_path__0x18000e870.annotated.c>)|
|validate_source_data|0x1800036e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__monthly_analysis___core.pyd/validate_source_data__0x180002830.annotated.c>)|

### modules/ai_utils.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|5|safe_chat_create(client, **kwargs)|client, kwargs, threading, result_holder, error_holder, _do_call, _do_call, t, e, APITimeoutError, APIConnectionError, error_code, err_str, t2, genexpr, genexpr|<br>    兼容各平台的 chat.completions.create 封装。<br>    - 通过 extra_body 传递 enable_thinking=False 关闭思考模式<br>    - 平台不支持时自动回退<br>    - 内置硬超时保护，防止请求无限卡死<br>    |

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|_do_call|0x180001610|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_utils.pyd/_do_call__0x180001360.annotated.c>)|
|safe_chat_create|0x180002640|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_utils.pyd/safe_chat_create__0x180001000.annotated.c>)|

## 独立源代码和验证范围

共享月间核心已安全加载；科目编码、层级、名称和父级识别已独立验证。完整月间计算及 AI 流程尚未移植。

|已独立 helper|自有代码|
|---|---|
|monthly_analysis/_core.calc_sub_code|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|monthly_analysis/_core.calc_level|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|monthly_analysis/_core.calc_sub_name|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|monthly_analysis/_core.find_parent_codes|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|monthly_analysis/_core.remove_parent_code|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
