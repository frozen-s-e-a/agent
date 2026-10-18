# qcc_processor 核心还原记录

企查查信用报告处理工具（智能对齐版） — 用于处理企查查信用报告（DOCX格式），提取目录结构和统计信息。

**本项状态：** 目录清洗、排序和企业名称提取已独立验证。完整 DOCX 解析、合并和输出未移植。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|folder_path|string|是|文件夹路径: 存放企查查信用报告（DOCX格式）的文件夹路径|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/qcc_processor.pyd**

【功能名称】企查查信用报告处理工具（智能对齐版）
【功能描述】
用于处理企查查信用报告（DOCX格式），提取目录结构和统计信息。
1. 智能对齐：不同公司若项目名称相同（即使编号不同），将自动合并到同一行
2. 结构优化：输出结果拆分为 A列编号 | B列项目名称 | C列...各公司数据
3. 去噪处理：自动剔除目录页码干扰
4. 支持递归查找文件夹中的所有 DOCX 文件
5. 自动从文件名提取公司名称
6. 结果输出到 output/企查查信用报告统计结果.xlsx

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/qcc_processor.pyd|7/7|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__qcc_processor.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__qcc_processor.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__qcc_processor.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/qcc_processor.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|44|get_planning_guide()|||
|65|log(msg)|msg||
|68|print_summary(start_time, success, fail, file_count)|start_time, success, fail, file_count, duration||
|82|_get_docx_files(directory)|directory, file_paths, root, _, files, file|获取目录下所有的docx文件|
|91|_extract_company_name(filename)|filename, base_name, parts|从文件名中提取公司名称|
|99|_get_sort_tuple(key_str)|key_str, match, x|辅助排序函数：将 "2.10" 转为 [2, 10] 以便正确排序|
|108|_clean_toc_line(text)|text, cleaned_text|剔除目录行尾的页码|
|114|_process_single_report(file_path)|file_path, name_to_count, name_to_number, doc, pattern, para, raw_text, clean_text, match, section_num, section_name, count_str, val, e|<br>    处理单个Word文档<br>    返回: <br>    1. success (bool)<br>    2. name_to_count (dict): { "企业标签": 5, "变更记录": 17 } -> 纯名称对应数量<br>    3. name_to_number (dict): { "企业标签": "1.2", "变更记录": "2.7" } -> 纯名称对应编号<br>    4. error_msg (str)<br>    |
|163|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, success_count, fail_count, processed_files_count, work_dir, output_dir, output_file_path, folder_path, full_path, docx_files, msg, data_matrix, global_number_map, all_unique_items, f_idx, file_path, file_name, company_name, progress, success, name_counts, name_nums, error_msg, name, num, current_best, sorted_items, index_data, item_name, df_base, df_values, company, counts_dict, final_df, e||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000b120|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__qcc_processor.pyd/__init____0x18000af30.annotated.c>)|
|_clean_toc_line|0x180003cc0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__qcc_processor.pyd/_clean_toc_line__0x180003ad0.annotated.c>)|
|_extract_company_name|0x180002fb0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__qcc_processor.pyd/_extract_company_name__0x180002dc0.annotated.c>)|
|_get_docx_files|0x180002200|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__qcc_processor.pyd/_get_docx_files__0x180002020.annotated.c>)|
|_get_sort_tuple|0x1800034b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__qcc_processor.pyd/_get_sort_tuple__0x1800032d0.annotated.c>)|
|_process_single_report|0x180004100|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__qcc_processor.pyd/_process_single_report__0x180003f20.annotated.c>)|
|run|0x180005ec0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__qcc_processor.pyd/run__0x180005770.annotated.c>)|

## 独立源代码和验证范围

目录清洗、排序和企业名称提取已独立验证。完整 DOCX 解析、合并和输出未移植。

|已独立 helper|自有代码|
|---|---|
|qcc_processor._clean_toc_line|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|qcc_processor._get_sort_tuple|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|qcc_processor._extract_company_name|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
