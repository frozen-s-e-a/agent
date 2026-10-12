# ledger_check 核心还原记录

小账套校验工具 — 批量校验小账套文件，检查借贷方一致性、总额与序时账一致性、一级与二级科目金额校验、金额平衡勾稽等。

**本项状态：** 借贷平衡、上下级汇总及方向规则已独立验证。完整账套输入适配和异常报告尚未迁移。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|directory|string|是|存放小账套文件的文件夹路径|
|output_dir|string|否|输出目录路径。不传则使用默认目录。|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/ledger_check.pyd**

【功能名称】小账套校验工具
【功能描述】批量校验小账套文件，检查借贷方一致性、总额与序时账一致性、一级与二级科目金额校验、金额平衡勾稽等。
【输入数据】存放小账套的文件夹路径
【输出结果】校验结果 Excel 文件

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/ledger_check.pyd|11/11|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ledger_check.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ledger_check.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ledger_check.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/ledger_check.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|32|get_all_file_paths(directory)|directory, file_paths, root, _, files, file||
|39|read_visible_cells_from_excel(file_path, sheet_name)|file_path, sheet_name, workbook, sheet, data, row, df, cell||
|51|sum_amounts_by_code(df, code)|df, code, filtered_df, debit_sum, credit_sum||
|57|judge_balance(df)|df, debit, credit||
|65|convert_columns_to_numeric(df, columns)|df, columns, column||
|73|filter_and_sum(df, code)|df, code, filtered_df, initial_balance_sum, debit_amount_sum, credit_amount_sum, final_balance_sum, result||
|88|judge_father_equal_children(df, code)|df, code, result, initial_balance_sum, debit_amount_sum, credit_amount_sum, final_balance_sum, df_filter, direction_init, direction_final, init, final, debit, credit||
|116|judge_calc(df)|df, judge, subject, index, row, direction_init, direction_final, code_name, init, final, debit, credit, value, subjects||
|143|calc(path)|path, df_balance, df_balance_full, df_journal, subject, father_subject, judge_table, judge_father, index, row, judge_father_and_children, code, code_name, balance_init, balance_debit, balance_credit, balance_final, journal_debit, journal_credit, diff_debit, diff_credit, judge_debit_credit, judge_logic, not_balance_subject, result, subjects, father_subjects||
|197|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, directory, work_dir, output_dir, paths, data, path, file, result, judge_debit_credit, judge_table, subject, judge_father, father_subject, judge_logic, not_balance_subject, row, e, output_path, df||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000e1a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ledger_check.pyd/__init____0x18000e1a0.annotated.c>)|
|calc|0x1800082c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ledger_check.pyd/calc__0x1800080e0.annotated.c>)|
|convert_columns_to_numeric|0x180003d20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ledger_check.pyd/convert_columns_to_numeric__0x180003b00.annotated.c>)|
|filter_and_sum|0x1800051e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ledger_check.pyd/filter_and_sum__0x1800045d0.annotated.c>)|
|get_all_file_paths|0x180001440|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ledger_check.pyd/get_all_file_paths__0x180001260.annotated.c>)|
|judge_balance|0x1800037b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ledger_check.pyd/judge_balance__0x1800035c0.annotated.c>)|
|judge_calc|0x180007420|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ledger_check.pyd/judge_calc__0x180007240.annotated.c>)|
|judge_father_equal_children|0x180005f50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ledger_check.pyd/judge_father_equal_children__0x180005d30.annotated.c>)|
|read_visible_cells_from_excel|0x180002070|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ledger_check.pyd/read_visible_cells_from_excel__0x180001e50.annotated.c>)|
|run|0x18000aec0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ledger_check.pyd/run__0x18000ab30.annotated.c>)|
|sum_amounts_by_code|0x1800031c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ledger_check.pyd/sum_amounts_by_code__0x180002f90.annotated.c>)|

## 独立源代码和验证范围

借贷平衡、上下级汇总及方向规则已独立验证。完整账套输入适配和异常报告尚未迁移。

|已独立 helper|自有代码|
|---|---|
|ledger_check.judge_balance|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/accounting.py>)|
|ledger_check.sum_amounts_by_code|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/accounting.py>)|
|ledger_check.filter_and_sum|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/accounting.py>)|
|ledger_check.judge_father_equal_children|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/accounting.py>)|
|ledger_check.judge_calc|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/accounting.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
