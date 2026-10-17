# subject_clean_after 核心还原记录

科目余额表后处理

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|
|output_dir|string|否|输出目录路径。不传则使用默认目录 output/科目余额表后处理。|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/subject_clean_after.pyd**

【功能名称】科目余额表后处理
【输入数据】input/科目余额表后处理配置表.xlsx
【输出结果】output/科目余额表后处理/原文件名.xlsx
【功能描述】
1. 智能数据类型转换：自动识别金额列（转为数字）和科目列（保留文本）。
2. 辅助核算补全：根据配置批量插入辅助核算列。
3. 余额计算：自动计算标准期初/期末余额（带符号），并保留数值格式。
4. 强校验：若启用余额计算，必须填写科目方向。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/subject_clean_after.pyd|4/5|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__subject_clean_after.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__subject_clean_after.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__subject_clean_after.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/subject_clean_after.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|42|_smart_convert_dataframe(df, forced_numeric_cols, forced_string_cols)|df, forced_numeric_cols, forced_string_cols, df_converted, col, series, mask_parens, other_cols, original_series, pre_series, converted_series, original_non_empty, destroyed_mask, c|<br>    对DataFrame进行智能类型转换：<br>    1. forced_numeric_cols: 强制转为数字 (去除逗号, 处理括号负数)<br>    2. forced_string_cols: 强制保留为文本<br>    3. 其他列: 尝试转数字，如果转换后产生大量NaN(说明原数据是文本), 则回退<br>    |
|94|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, start_time, work_dir, config_path, output_dir, df_source_config, df_aux_config, df_bal_config_raw, e, file_paths, path, bal_map, run_balance_calc, forced_numeric_cols, valid_params, index, row, key, val, run_aux_calc, aux_target_cols, subject_col_name, forced_string_cols, c, direction_col_name, missing_dir_mask, missing_subjects, success_count, total_files, idx, file_path, file_name, df, conflict_cols, source_subjects, config_subjects, missing_config, all_needed_src_cols, col, rules, rule, p, missing_src_cols, empty_val_subjects, new_aux_data, _, config_row, target_subject, mask, target_col, source_rule, source_cols_priority, final_values, src_col, current_vals, insert_idx, get_balance_series, get_balance_series, s_open, ref_open, s_close, ref_close, subject_dir_col, subject_dir_map, get_std_factor, get_std_factor, factors, std_open, loc, std_close, output_path, traceback, c, col, c||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x1800104a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean_after.pyd/__init____0x1800104a0.annotated.c>)|
|_smart_convert_dataframe|0x180001720|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean_after.pyd/_smart_convert_dataframe__0x180001440.annotated.c>)|
|get_balance_series|0x180004000|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean_after.pyd/get_balance_series__0x180003a80.annotated.c>)|
|get_std_factor|0x180004e70|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean_after.pyd/get_std_factor__0x180004c90.annotated.c>)|
|run|0x1800052a0|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_clean_after.pyd/run__0x1800036f0.asm>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
