# id_card 核心还原记录

身份证信息解析 — 基于 jionlp 库，批量解析身份证号码。

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|id_column|string|是|Excel列名: Excel模式专用：指定身份证号所在的列名（默认为'身份证号'）|
|id_list|string|是|直接查询号码: 直接模式专用：一个身份证号字符串，或多个号码组成的列表/字符串|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/id_card.pyd**

【功能名称】身份证信息解析
【功能描述】
基于 jionlp 库，批量解析身份证号码。
可提取：省、市、区/县、出生日期、性别等信息。
支持两种模式：
1. Excel文件处理：读取指定文件中的身份证列。
2. 直接查询：直接输入一个或多个身份证号码进行查询。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/id_card.pyd|4/4|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__id_card.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__id_card.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__id_card.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/id_card.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|51|get_planning_guide()|||
|62|parse_single_id(id_val)|id_val, id_str, res, province, city, county, year, month, day, gender, birth_date, e|<br>    封装单条解析逻辑，增加容错<br>    |
|102|save_to_excel(data_list, output_path)|data_list, output_path, df_out, cols, c, wb, ws, headers, data_rows, row, cell|<br>    保存结果并美化格式 (无依赖纯净版)<br>    |
|147|print_summary(start_time, total, success, fail, output_path)|start_time, total, success, fail, output_path, duration||
|161|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, work_dir, output_dir, output_excel_path, id_list, id_col_name, input_path, full_input_path, df, candidates, raw_ids, e, results, success_count, fail_count, total, i, id_val, res_dict, error_msg, c, x||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180008a00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__id_card.pyd/__init____0x180008810.annotated.c>)|
|parse_single_id|0x1800015a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__id_card.pyd/parse_single_id__0x1800013c0.annotated.c>)|
|run|0x180005240|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__id_card.pyd/run__0x180004eb0.annotated.c>)|
|save_to_excel|0x180002de0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__id_card.pyd/save_to_excel__0x180002bc0.annotated.c>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
