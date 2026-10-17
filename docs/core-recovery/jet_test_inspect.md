# jet_test_inspect 核心还原记录

JET-检查数据源 — 读取序时账文件，返回列名、数据类型、样本值等信息，为后续规则配置提供依据。

**本项状态：** 独立 JET 条件判断、11 类特征及 33 条原生内置规则；5,185 个值对照和 4 组原 EXE 成果对照。完整输入检查/成果写出入口仍未接入。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|file_path|string|是|数据源文件路径或文件夹路径|
|preview_rows|integer|否|预览行数（默认5行）|
|include_templates|boolean|否|是否同时返回内置特征和规则模板（默认true）|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/jet_test/jet_test_inspect.pyd**

【功能名称】JET-检查数据源
【功能描述】读取序时账文件，返回列名、数据类型、样本值等信息，为后续规则配置提供依据。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/jet_test/jet_test_inspect.pyd|1/1|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__jet_test__jet_test_inspect.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__jet_test__jet_test_inspect.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__jet_test__jet_test_inspect.pyd.json>)|
|modules/jet_test/_builtin.pyd|0/0|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__jet_test___builtin.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__jet_test___builtin.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__jet_test___builtin.pyd.json>)|
|modules/jet_test/_core.pyd|18/18|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__jet_test___core.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__jet_test___core.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__jet_test___core.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/jet_test/jet_test_inspect.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|34|run(ctx, config_mode='direct', config_data=None)|ctx, config_mode, config_data, file_path, preview_rows, include_templates, work_dir, result||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|run|0x180001660|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test__jet_test_inspect.pyd/run__0x1800012c0.annotated.c>)|

### modules/jet_test/_builtin.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|

### modules/jet_test/_core.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|14|_force_numeric(series)|series, s_clean||
|19|_force_numeric_val(val)|val||
|28|_sanitize_filename(name)|name||
|34|_sanitize_sheet_name(name)|name||
|40|_ensure_dir(file_path)|file_path, d||
|46|get_col_by_fuzzy_name(df, keywords)|df, keywords, col, k||
|57|inspect_data(file_path, preview_rows=5)|file_path, preview_rows, all_files, results, f, df, col_info, col, dtype, sample, null_pct, unique, preview, e, v|读取数据源，返回结构信息。|
|105|validate_prerequisites(df, feature_def_df, rule_df, file_name)|df, feature_def_df, rule_df, file_name, errors, source_cols, feature_status, valid_features, col_map, ac, _, row, f_name, tool, src_raw, req_cols, missing_reqs, all_available_cols, active_rules, idx, rule_name, col_name, val, msg, k, v, x, c||
|263|_check_single_item(series, t)|series, t, num_op_match, is_pure_num, nums, op, num, ops, series_str||
|293|_check_condition(series, rule_val)|series, rule_val, val_str, targets, pos, neg, mask, pos_mask, t, x, t, t||
|328|process_data_chunk(df, company_name, feature_def_df, rule_matrix_df)|df, company_name, feature_def_df, rule_matrix_df, calc_df, col_map, ac, _, row, f_name, tool, src, param, res, all_hits, rule_name, group_rows, rule_mask, row_mask, has_cond, col, val, mask, hits, k, v||
|380|write_audit_file(hits_list, output_path, active_rules, template_cols, output_empty_sheets)|hits_list, output_path, active_rules, template_cols, output_empty_sheets, master_df, writer, toc_data, idx, r, safe_name, subset, toc_df, wb, ws, e||
|427|_resolve_files(input_path)|input_path, all_files, p, root, _, files, f||
|440|_read_data_file(f_path, dtype=None)|f_path, dtype, eng||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|_check_condition|0x180012080|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/_check_condition__0x180011e60.annotated.c>)|
|_check_single_item|0x18000ffd0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/_check_single_item__0x18000fdb0.annotated.c>)|
|_ensure_dir|0x180003190|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/_ensure_dir__0x180002fa0.annotated.c>)|
|_force_numeric|0x1800019f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/_force_numeric__0x180001800.annotated.c>)|
|_force_numeric_val|0x180002060|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/_force_numeric_val__0x180001e70.annotated.c>)|
|_parse_cols|0x180009ec0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/_parse_cols__0x180009cd0.annotated.c>)|
|_read_data_file|0x18001c240|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/_read_data_file__0x18001bf60.annotated.c>)|
|_resolve_files|0x18001b090|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/_resolve_files__0x18001aeb0.annotated.c>)|
|_sanitize_filename|0x180002510|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/_sanitize_filename__0x180002320.annotated.c>)|
|_sanitize_sheet_name|0x180002b60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/_sanitize_sheet_name__0x180002970.annotated.c>)|
|apply_tool|0x18000c8a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/apply_tool__0x18000a420.annotated.c>)|
|get_col_by_fuzzy_name|0x180003880|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/get_col_by_fuzzy_name__0x180003660.annotated.c>)|
|get_mod|0x18000a910|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/get_mod__0x18000a730.annotated.c>)|
|get_tail|0x18000b510|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/get_tail__0x18000b330.annotated.c>)|
|inspect_data|0x180004490|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/inspect_data__0x1800041b0.annotated.c>)|
|process_data_chunk|0x180014690|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/process_data_chunk__0x180014380.annotated.c>)|
|validate_prerequisites|0x180006ab0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/validate_prerequisites__0x1800067a0.annotated.c>)|
|write_audit_file|0x180018150|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__jet_test___core.pyd/write_audit_file__0x180017d80.annotated.c>)|

## 独立源代码和验证范围

独立 JET 条件判断、11 类特征及 33 条原生内置规则；5,185 个值对照和 4 组原 EXE 成果对照。完整输入检查/成果写出入口仍未接入。

[独立 JET 核心](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/jet.py>)

[源代码验证](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/jet-source-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
