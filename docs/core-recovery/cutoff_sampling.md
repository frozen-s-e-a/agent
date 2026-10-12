# cutoff_sampling 核心还原记录

截止测试抽样 (Cut-off Testing) - 凭证去重版

**本项状态：** 截止日期、日期清洗、凭证去重合并已独立验证。完整抽样窗口、实际凭证抽取和输出尚未迁移。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|
|output_dir|string|否|输出目录路径。不传则使用默认目录。|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/cutoff_sampling.pyd**

【功能名称】截止测试抽样 (Cut-off Testing) - 凭证去重版
【输入数据】input/截止测试配置表.xlsx
【输出结果】output/截止测试抽样结果.xlsx
【功能描述】
    1. 读取序时账，智能解析日期，自动判定会计截止日。
    2. 根据金额阈值筛选，支持按金额或随机抽样。
    3. 【新增】根据“凭证号”进行去重，同一凭证若涉及多个科目，自动合并科目名称（如“科目A|科目B”）。
    4. 结果自动拆分为“截止日前”和“截止日后”，完整记录执行参数。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/cutoff_sampling.pyd|7/8|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__cutoff_sampling.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__cutoff_sampling.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__cutoff_sampling.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/cutoff_sampling.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|43|_determine_cutoff_date(start_date, end_date)|start_date, end_date, s_date, e_date, years, cutoff_month_days, candidates, y, m, d, candidate|自动判断会计截止日|
|63|_clean_and_parse_dates(series)|series, parse_single_date, parse_single_date, cleaned_series|增强型日期解析|
|83|_deduplicate_and_merge_subjects(df, company_col, date_col, voucher_col, subject_col)|df, company_col, date_col, voucher_col, subject_col, subset_cols, merged_subjects, df_dedup|<br>    核心功能：按凭证号去重，并合并科目名称<br>    |
|127|_load_and_merge_files(path, sheet_name_opt, ctx)|path, sheet_name_opt, ctx, all_data, files, total_files, target_sheet, read_sheet_arg, i, f, percent, df, e, f|读取并合并文件|
|161|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, start_time, work_dir, config_path, output_dir, cfg_df, raw_config_log, get_cfg, get_cfg, path_input, company_col, l1_subject_col, debit_col, credit_col, voucher_col, date_col, sheet_name_opt, amount_threshold_raw, sample_count_raw, start_date_raw, end_date_raw, mode, amount_threshold, target_n, s_date, e_date, ve, e, cutoff_date, df, required_cols_in_data, missing_cols, nat_count, initial_count, mask_date, df_filtered, group_cols, final_results, grouped, name, group, selected, current_n, df_before, df_after, d, timestamp, output_path, writer, s_name_before, s_name_after, duration, c||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x1800143d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cutoff_sampling.pyd/__init____0x1800143d0.annotated.c>)|
|_clean_and_parse_dates|0x180003ca0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cutoff_sampling.pyd/_clean_and_parse_dates__0x180002fd0.annotated.c>)|
|_deduplicate_and_merge_subjects|0x180004ea0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cutoff_sampling.pyd/_deduplicate_and_merge_subjects__0x180004770.annotated.c>)|
|_determine_cutoff_date|0x180001d70|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cutoff_sampling.pyd/_determine_cutoff_date__0x180001b50.annotated.c>)|
|_load_and_merge_files|0x180005bf0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cutoff_sampling.pyd/_load_and_merge_files__0x180005910.annotated.c>)|
|get_cfg|0x180009140|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cutoff_sampling.pyd/get_cfg__0x180008e50.annotated.c>)|
|parse_single_date|0x180003390|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cutoff_sampling.pyd/parse_single_date__0x1800031b0.annotated.c>)|
|run|0x180009eb0|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cutoff_sampling.pyd/run__0x180008ac0.asm>)|

## 独立源代码和验证范围

截止日期、日期清洗、凭证去重合并已独立验证。完整抽样窗口、实际凭证抽取和输出尚未迁移。

|已独立 helper|自有代码|
|---|---|
|cutoff_sampling._determine_cutoff_date|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/date_rules.py>)|
|cutoff_sampling._clean_and_parse_dates|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/date_rules.py>)|
|cutoff_sampling._deduplicate_and_merge_subjects|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/date_rules.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
