# bank_flow 核心还原记录

银行流水智能双向核对 — 基于会计逻辑和交易对手文本相似度分析，自动核对银行流水与财务序时账。

**本项状态：** 已独立验证名称清洗、相似度、日期格式和组合金额 helper。L1–L9 完整匹配顺序、占用和报告尚未移植。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|gl_path|string|是|序时账文件路径|
|gl_date_col|string|是|序时账-日期列|
|gl_voucher_col|string|是|序时账-凭证号列|
|gl_subject_col|string|是|序时账-科目列|
|gl_bank_subject|string|是|序时账-银行科目值|
|gl_summary_col|string|是|序时账-摘要列|
|gl_partner_direct_col|string|是|序时账-交易对手列名: 如果序时账中已有交易对手列（如'客户'、'供应商'等），直接填写该列名。填写此项后将忽略'客商辅助项列名'配置|
|gl_partner_col|string|是|序时账-客商辅助项列名: 用于凭证拆分模式：从对方科目的辅助项中提取客商。如果同时存在多个列（如'客户－名称'和'供应商－名称'），请用英文逗号分隔填写所有列名，例如：客户－名称,供应商－名称。注意：如果已填写'交易对手列名'，此项将被忽略|
|gl_debit_col|string|是|序时账-借方列|
|gl_credit_col|string|是|序时账-贷方列|
|bank_path|string|是|银行流水文件路径|
|bank_date_col|string|是|流水-日期列|
|bank_income_col|string|是|流水-收入列|
|bank_expense_col|string|是|流水-支出列|
|bank_partner_col|string|是|流水-对方户名列|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/bank_flow.pyd**

【功能名称】银行流水智能双向核对
【功能描述】
 基于会计逻辑和交易对手文本相似度分析，自动核对银行流水与财务序时账。
1. 智能拆分：自动将"银行存款"凭证拆分为具体客商明细（模拟会计做账）。
2. 多维匹配：采用三层漏斗模型（交易对手匹配 -> AI摘要语义匹配 -> 金额时间暴力组合）。
3. 结果输出：生成左右对照的工作底稿，自动对齐 1:N, N:M 关系。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/bank_flow.pyd|48/48|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__bank_flow.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__bank_flow.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__bank_flow.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/bank_flow.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|24|read_data_file(file_path, **kwargs)|file_path, kwargs, ext|<br>    根据文件扩展名自动选择读取方式，支持 .xlsx/.xls 和 .csv<br>    |
|84|get_planning_guide()|||
|100|log(msg, indent=0)|msg, indent, prefix||
|104|safe_float(val)|val, str_val||
|111|format_date(val)|val, str_val, dt, m, dt2|<br>    将日期值转换为标准格式字符串 (YYYY-MM-DD)<br>    |
|164|validate_dates(df, date_col, source_name, raw_date_col_name)|df, date_col, source_name, raw_date_col_name, total_rows, failed_rows, fail_rate, failed_df, samples, _, row, raw_val||
|204|ConfigLoader.__init__(self, full_path=None, config_dict=None)|self, full_path, config_dict||
|233|ConfigLoader._read_sheet(self, sheet_name)|self, sheet_name, df, config_dict, clean_config, k, v, key_str, e||
|248|SimilarityEngine.__init__(self)|self||
|254|SimilarityEngine.compute_similarity(self, text1, text2)|self, text1, text2, t1, t2||
|271|GLProcessor.__init__(self, config, core_ctx)|self, config, core_ctx||
|277|GLProcessor.process(self, work_dir)|self, work_dir, rel_path, file_path, df_raw, e, comp_col, acc_col, partner_direct_col, use_direct_mode, partner_cols_cfg, bank_subject, subj_col, bank_subjects, matches_any_subject, matches_any_subject, target_count, subjects_str, voucher_group_keys, valid_keys, splitted_records, grouped, _, group, res, df_res, date_col_name, counts, s, k||
|361|GLProcessor._process_voucher(self, group, comp_col, acc_col, use_direct_mode, partner_direct_col)|self, group, comp_col, acc_col, use_direct_mode, partner_direct_col, target_rows, summary_col, debit_col, credit_col, make_record, make_record, results, _, r, partner_val, partner_str, rec, unique_accounts, total_bank, gross_amt, counter_rows, partner_cols_cfg, partner_cols, genexpr, genexpr, genexpr, _, r, _, r, c||
|464|GLProcessor._split_by_matching(self, group, target_rows, counter_rows, comp_col, acc_col, summary_col, debit_col, credit_col, partner_cols, make_record)|self, group, target_rows, counter_rows, comp_col, acc_col, summary_col, debit_col, credit_col, partner_cols, make_record, counter_info, _, c_row, c_d, c_c, c_amt, p_val, col, val, partners_with_value, unique_partners, partner_str, results, r, all_lines, d_val, c_val, net, is_target, direction, debit_group, credit_group, d_line, c_line, candidates, found, c, d, remaining_debit, remaining_credit, credit_total, debit_total, line, row, counterparts, cp_with_partner, cp_unique_partners, partner_amounts, cp, p, total_cp_amt, bank_net, split_records, allocated_sum, partner_list, i, partner, cp_amt, split_amt, ratio, p_override, c, l, l, c, d, d, c, genexpr, genexpr, genexpr, cp, cp, genexpr|<br>        借鉴 finance_viewer 匹配法的拆分逻辑。<br>        <br>        核心原则：<br>        1. 拆分的唯一目的是获取交易对手信息<br>        2. 只有对方科目有多个不同客商时才拆分<br>        3. 金额以银行存款行自身为准，按对方科目比例分配<br>        4. 借贷方发生额绝不改变，不产生残差<br>        |
|683|GLProcessor._process_voucher_multi_bank(self, group, target_rows, comp_col, acc_col, summary_col, debit_col, credit_col, make_record)|self, group, target_rows, comp_col, acc_col, summary_col, debit_col, credit_col, make_record, counter_rows, partner_cols_cfg, partner_cols, bank_groups, _, t_row, acc_val, amt, results, rows_list, sub_target, sub_group, sub_results, c, r|<br>        处理同一凭证包含多个银行账户的情况。<br>        按账户列将银行目标行分组，每组独立调用 _split_by_matching 匹配法。<br>        |
|731|BankProcessor.__init__(self, config)|self, config||
|735|BankProcessor.process(self, work_dir)|self, work_dir, rel_path, file_path, df_raw, e, comp_col, acc_col, inc_col, exp_col, date_col, records, _, row, inc, exp, amt, rec, p, df_result, date_col_name||
|800|ReconciliationEngine.__init__(self, df_bank, df_gl, sim_engine, core_ctx, config)|self, df_bank, df_gl, sim_engine, core_ctx, config||
|820|ReconciliationEngine._add_month_col(self, df, date_col)|self, df, date_col||
|824|ReconciliationEngine.run(self)|self, groups, summary_data, i, comp, acc, b_idxs, g_idxs, grp_b, grp_g, inc_col, exp_col, b_inc, b_exp, deb_col, cre_col, g_deb, g_cre, b_matched, b_total_abs, b_match_rate_amt, g_matched, g_total_abs, g_match_rate_amt, b_cnt, g_cnt, b_match_rate_cnt, g_match_rate_cnt, match_rate_amt, match_rate_cnt, msg, df_detail, df_summary, k, v||
|900|ReconciliationEngine._match_group(self, b_idxs, g_idxs)|self, b_idxs, g_idxs||
|919|ReconciliationEngine._mark(self, b_ids, g_ids, desc)|self, b_ids, g_ids, desc, mid||
|929|ReconciliationEngine._l1_partner_exact(self, b_idxs, g_idxs)|self, b_idxs, g_idxs, valid_g, group_used_bank, match_cnt, g_idx, g_row, partner, amt, mon, candidates, best_b_idx||
|954|ReconciliationEngine._l2_summary_exact(self, b_idxs, g_idxs)|self, b_idxs, g_idxs, valid_g, group_used_bank, match_cnt, g_idx, g_row, summary, amt, mon, candidates, best_b_idx, b_idx, b_row, b_name||
|985|ReconciliationEngine._l3_smart_split(self, b_idxs, g_idxs)|self, b_idxs, g_idxs, curr_b, curr_g, match_cnt, used_b_local, used_g_local, is_same_entity, is_same_entity, m, g_grp_month, b_grp_month, g_idx, g_row, partner, target_amt, g_summ, candidates, matched_subset, b_rem, g_rem, b_idx, b_row, b_p||
|1031|ReconciliationEngine._find_subset_match(self, df, target, col_name='__bank_amount__')|self, df, target, col_name, d, grp, idxs, cnt, r, combo, sub, dates||
|1049|ReconciliationEngine._execute_time_match(self, b_idxs, g_idxs, type_name, used_b_set, used_g_set)|self, b_idxs, g_idxs, type_name, used_b_set, used_g_set, all_dates, min_dt, max_dt, diff_days, sub_type||
|1060|ReconciliationEngine._l4_partner_aggregation(self, b_idxs, g_idxs)|self, b_idxs, g_idxs, curr_b, curr_g, match_cnt, used_b_local, is_same_entity, is_same_entity, all_dates, d, g_day, b_day, unique_partners, partner, g_sub, g_summs, b_candidates, m, g_grp_month, b_grp_month||
|1112|ReconciliationEngine._l5_fuzzy_semantic(self, b_idxs, g_idxs)|self, b_idxs, g_idxs, curr_b_all, curr_g_all, m, grp_b, grp_g, unmatched_b, unmatched_g||
|1123|ReconciliationEngine._run_fuzzy_core(self, curr_b, curr_g)|self, curr_b, curr_g, g_has_p, curr_g_rem||
|1132|ReconciliationEngine._fuzzy_matrix_match(self, df_b, df_g, label_prefix, use_summary=False)|self, df_b, df_g, label_prefix, use_summary, g_idx, g_row, g_text, g_amt, candidates, best_score, best_b_idx, b_idx, b_row, b_text, score, level, label||
|1168|ReconciliationEngine._l6_same_month_amount(self, b_idxs, g_idxs)|self, b_idxs, g_idxs, curr_b, curr_g, match_cnt, used_g_local, m, grp_b, grp_g, b_idx, b_row, target_amt, candidates, best_g_idx||
|1191|ReconciliationEngine._l7_partner_aggregation_to_single(self, b_idxs, g_idxs)|self, b_idxs, g_idxs, curr_b, curr_g, curr_b_with_partner, match_cnt, used_b_local, used_g_local, m, grp_b_month, grp_g_month, unique_partners, partner, partner_flows, date, date_flows, total_amt, candidates, best_g_idx, partner_flows_remaining, dates_sorted, i, start_date, end_date, window_flows|<br>        L7: 银行流水按交易对手汇总后匹配序时账单笔<br>        |
|1281|ReconciliationEngine._l8_global_brute_force(self, b_idxs, g_idxs)|self, b_idxs, g_idxs, curr_b, curr_g, match_cnt, m, grp_b, grp_g, g_pool, g_pool_idxs, b_idx, b_row, target, candidates, i, g, found, cnt, r, combo, real_g_idxs, genexpr, genexpr, i||
|1318|ReconciliationEngine._l8_reverse_brute_force(self, b_idxs, g_idxs)|self, b_idxs, g_idxs, curr_b, curr_g, match_cnt, m, grp_g, grp_b, b_pool, b_pool_idxs, g_idx, g_row, target, candidates, i, b, found, cnt, r, combo, real_b_idxs, genexpr, genexpr, i|<br>        L8 反向凑数 - 从序时账单笔出发，在同月银行流水中找金额组合 (N:1)<br>        解决场景：多笔银行流水合计等于一笔序时账（如200+200=400手续费，或多笔税金合计）<br>        |
|1359|ReconciliationEngine._l7_nm_aggregation(self, b_idxs, g_idxs)|self, b_idxs, g_idxs, curr_b, curr_g, curr_b_with_partner, match_cnt, used_b_local, used_g_local, find_g_combo, find_g_combo, m, grp_b_month, grp_g_month, unique_partners, partner, partner_flows, g_available, dt, day_flows, g_avail, matched_g, remaining, dates_sorted, start_date, end_date, window|<br>        L7 N:M 汇总匹配 - 同月内，按银行流水交易对手分组，<br>        优先按日期子组精细匹配，最后才兜底全量汇总。<br>        |
|1448|ReconciliationEngine._l9_cross_month_boundary(self, b_idxs, g_idxs)|self, b_idxs, g_idxs, curr_b, curr_g, b_day, g_day, b_boundary_idxs, g_boundary_idxs, counter_before, b_early_idxs, b_orig, idx, dt, g_early_idxs, g_orig, new_match_cnt, i, mid, b_mask, g_mask, old_desc|<br>        L9 跨月边界匹配 — 复用 L1-L8 全部匹配策略。<br>        <br>        只取月边界附近（每月前3天/后3天）的未匹配记录，<br>        分两轮对齐月份后在边界记录之间重跑 L1-L8：<br>          轮1: 银行流水月初(1-3日)移到上月 → 和序时账月末(28+日)同月匹配<br>          轮2: 序时账月初(1-3日)移到上月 → 和银行流水月末(28+日)同月匹配<br>        |
|1514|ReconciliationEngine._run_l1_l8(self, b_idxs, g_idxs)|self, b_idxs, g_idxs|复用 L1-L8 匹配逻辑的辅助方法。|
|1527|ReconciliationEngine.get_partner_check_status(self, match_type, b_partner, g_partner)|self, match_type, b_partner, g_partner, b_p, g_p, sim_score, level||
|1540|ReconciliationEngine._generate_detail_report(self)|self, bank_raw_cols, gl_raw_cols, output_rows, all_mids, mid, b_sub, g_sub, dates, sort_date, gl_voucher_sort, base, max_len, m_type, b_p_ref, g_p_ref, check_status, i, row, c, un_b, _, r, un_g, df_out, amount_col_names, debit_col, credit_col, income_col, expense_col, col, amount_col, c, c, genexpr, genexpr, genexpr||
|1662|ReconciliationEngine.save_formatted_excel(self, df_summary, df_detail, path)|self, df_summary, df_detail, path, writer, cols, header_map, prefixes, prefix, c, ordered_keys, df_final, wb, ws_sum, cell, ws_det, border, align_center, fill_gray, font_bold, amount_col_names, debit_col, credit_col, income_col, expense_col, amount_col_indices, col_idx, top, sub, full_col, amount_col, _, c1, c2, row_idx, start_col, curr_top, i, next_top, genexpr, genexpr, x||
|1755|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, work_dir, output_dir, cfg_path, config, sim_engine, gl_proc, df_gl, bank_proc, df_bank, engine, df_summary, df_detail, timestamp, out_file, _, row, acc, rate_amt, rate_cnt, e||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180009010|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/__init____0x180008be0.annotated.c>)|
|__init__|0x18000b750|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/__init____0x18000b4b0.annotated.c>)|
|__init__|0x18000c990|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/__init____0x18000c620.annotated.c>)|
|__init__|0x180023060|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/__init____0x180022d40.annotated.c>)|
|__init__|0x180026f30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/__init____0x180026a50.annotated.c>)|
|__init__|0x180067bc0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/__init____0x180067910.annotated.c>)|
|_add_month_col|0x180027910|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_add_month_col__0x1800275a0.annotated.c>)|
|_execute_time_match|0x180037f00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_execute_time_match__0x180037a20.annotated.c>)|
|_find_subset_match|0x180036570|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_find_subset_match__0x180036130.annotated.c>)|
|_find_subset_sum_lines|0x1800203c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_find_subset_sum_lines__0x18001fbd0.annotated.c>)|
|_fuzzy_matrix_match|0x18003f620|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_fuzzy_matrix_match__0x18003f160.annotated.c>)|
|_generate_detail_report|0x1800596b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_generate_detail_report__0x180058a60.annotated.c>)|
|_l1_partner_exact|0x18002e4d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_l1_partner_exact__0x18002e160.annotated.c>)|
|_l2_summary_exact|0x180030280|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_l2_summary_exact__0x18002ff10.annotated.c>)|
|_l3_smart_split|0x180033020|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_l3_smart_split__0x180032040.annotated.c>)|
|_l4_partner_aggregation|0x180039ed0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_l4_partner_aggregation__0x180038c50.annotated.c>)|
|_l5_fuzzy_semantic|0x18003daa0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_l5_fuzzy_semantic__0x18003d730.annotated.c>)|
|_l6_same_month_amount|0x180041a60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_l6_same_month_amount__0x1800416f0.annotated.c>)|
|_l7_nm_aggregation|0x180050690|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_l7_nm_aggregation__0x18004ecc0.annotated.c>)|
|_l7_partner_aggregation_to_single|0x180043ba0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_l7_partner_aggregation_to_single__0x180043830.annotated.c>)|
|_l8_global_brute_force|0x180048410|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_l8_global_brute_force__0x180047640.annotated.c>)|
|_l8_reverse_brute_force|0x18004bf00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_l8_reverse_brute_force__0x18004b130.annotated.c>)|
|_l9_cross_month_boundary|0x180053f40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_l9_cross_month_boundary__0x180053bd0.annotated.c>)|
|_mark|0x18002da70|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_mark__0x18002d680.annotated.c>)|
|_match_group|0x18002caf0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_match_group__0x18002c780.annotated.c>)|
|_process_voucher|0x180014fd0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_process_voucher__0x180011d90.annotated.c>)|
|_process_voucher_multi_bank|0x180020f30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_process_voucher_multi_bank__0x180020a80.annotated.c>)|
|_read_sheet|0x180009f90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_read_sheet__0x180009c60.annotated.c>)|
|_run_fuzzy_core|0x18003eb30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_run_fuzzy_core__0x18003e7c0.annotated.c>)|
|_run_l1_l8|0x180057760|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_run_l1_l8__0x1800573f0.annotated.c>)|
|_split_by_matching|0x180018fa0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/_split_by_matching__0x180017f00.annotated.c>)|
|clean_name|0x180008470|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/clean_name__0x1800081c0.annotated.c>)|
|compute_similarity|0x18000bc50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/compute_similarity__0x18000b8e0.annotated.c>)|
|find_g_combo|0x18004f8a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/find_g_combo__0x18004f030.annotated.c>)|
|format_date|0x180003c90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/format_date__0x1800039e0.annotated.c>)|
|get_partner_check_status|0x180057fe0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/get_partner_check_status__0x180057bf0.annotated.c>)|
|is_same_entity|0x180032720|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/is_same_entity__0x1800323b0.annotated.c>)|
|is_same_entity|0x180039330|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/is_same_entity__0x180038fc0.annotated.c>)|
|make_record|0x1800127d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/make_record__0x180012270.annotated.c>)|
|matches_any_subject|0x18000d5c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/matches_any_subject__0x18000cef0.annotated.c>)|
|process|0x18000ddb0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/process__0x18000cbc0.annotated.c>)|
|process|0x180023560|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/process__0x180023230.annotated.c>)|
|read_data_file|0x180001b40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/read_data_file__0x1800018e0.annotated.c>)|
|run|0x180027ff0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/run__0x180027d40.annotated.c>)|
|run|0x180064210|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/run__0x180063de0.annotated.c>)|
|safe_float|0x1800034f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/safe_float__0x180003240.annotated.c>)|
|save_formatted_excel|0x18005ef40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/save_formatted_excel__0x18005e690.annotated.c>)|
|validate_dates|0x180006850|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_flow.pyd/validate_dates__0x180006460.annotated.c>)|

## 独立源代码和验证范围

已独立验证名称清洗、相似度、日期格式和组合金额 helper。L1–L9 完整匹配顺序、占用和报告尚未移植。

|已独立 helper|自有代码|
|---|---|
|bank_flow.safe_float|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|bank_flow.clean_name|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|bank_flow._find_subset_sum_lines|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/bank_helpers.py>)|
|bank_flow.compute_similarity|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/bank_helpers.py>)|
|bank_flow.format_date|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/bank_helpers.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
