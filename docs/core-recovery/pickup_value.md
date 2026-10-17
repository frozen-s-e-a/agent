# pickup_value 核心还原记录

提取值工具 — 从指定文件夹（及其子文件夹）中的所有 Excel 文件中，根据配置表指定的单元格位置，提取相应的值，并汇总到一个新的 Excel 文件中。

**本项状态：** 独立 XLSX 核心 collect_values 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|folder_path|string|是|文件夹路径: 要处理的文件夹路径（会递归查找所有 Excel 文件）|
|field_mappings|string|是|提取字段配置: 从第3行开始，A列为字段名，B列为单元格位置（如 A1, B2）|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/pickup_value.pyd**

【功能名称】提取值工具
【功能描述】
从指定文件夹（及其子文件夹）中的所有 Excel 文件中，根据配置表指定的单元格位置，提取相应的值，并汇总到一个新的 Excel 文件中。
1. 支持递归查找文件夹中的所有 Excel 文件
2. 支持 .xlsx、.xls、.xlsm 格式
3. 支持指定多个单元格位置提取值
4. 自动记录文件路径和文件名
5. 支持批量处理大量文件
6. 结果输出到 output/提取值结果.xlsx

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/pickup_value.pyd|4/4|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__pickup_value.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__pickup_value.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__pickup_value.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/pickup_value.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|51|get_planning_guide()|||
|72|log(msg)|msg||
|75|print_summary(start_time, success, fail, file_count)|start_time, success, fail, file_count, duration||
|89|_find_excel_files(target_folder_path)|target_folder_path, extensions, all_files, e, p|递归查找所有Excel文件|
|104|_extract_data_from_file(file_path, field_mappings)|file_path, field_mappings, file_data, wb, ws, field_name, cell_ref, row, col, e|从单个文件中提取数据|
|151|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, success_count, fail_count, processed_files_count, work_dir, output_dir, output_file_path, config, cfg_rel_path, full_cfg_path, df_config, folder_path_str, field_mappings, index, row, field_name, cell_ref, e, folder_path, full_path, target_folder_path, files_list, msg, results_list, f_idx, file_path, f_name, progress, file_data, err_msg, df_output, output_columns, col||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000c080|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__pickup_value.pyd/__init____0x18000be90.annotated.c>)|
|_extract_data_from_file|0x180003350|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__pickup_value.pyd/_extract_data_from_file__0x180003130.annotated.c>)|
|_find_excel_files|0x180002320|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__pickup_value.pyd/_find_excel_files__0x180002140.annotated.c>)|
|run|0x180006460|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__pickup_value.pyd/run__0x1800060d0.annotated.c>)|

## 独立源代码和验证范围

独立 XLSX 核心 collect_values 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

[独立 XLSX 核心](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/table_files.py>)

[成果验证](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/table-flow-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
