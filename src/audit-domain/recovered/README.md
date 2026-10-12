# 独立业务核心还原代码

这里是实际改写的 Python 核心，不导入原工具箱 EXE、`.pyd` 或旧 MCP 桥接。当前代码仍属于经过特定样例验证的迁移基线，尚未接入客户端，不能把它视为全部 63 个任务的完整替代品。

|源码|内容|
|---|---|
|`kernels.py`|辅助核算解析、科目层级、列名、名称与文本等基础规则|
|`accounting.py`|账套勾稽、账龄、PVM、毛利透视及异常阈值|
|`matching.py`|提取结果装配、标准化和纸质资料一对一匹配|
|`date_rules.py`|截止日期、日期清洗、凭证去重合并|
|`workpapers.py`|底稿汇总、字段/模板映射、数据/批注检查、配置校验|
|`table_files.py`|8 类 XLSX 工作表处理核心|
|`ipo.py`|沪深北披露下载流程；HTTP session 由调用者注入|
|`relation_helpers.py`|关联方人员、邮箱、电话、地址和比例规范化|
|`related.py`|已索引工商数据上的 13 维度检测，不含文件/API/报表适配|
|`bank_helpers.py`|银行组合金额、词排序相似度和日期格式|
|`jet.py`、`jet_builtin_rules.json`|分录测试条件、特征工具和 33 条原生内置规则数据|

准确验证范围、已知缺陷及 63 项剩余工作见 [核心还原成果](../../../docs/63项MCP核心还原成果-20261010.md)和[逐项索引](../../../docs/core-recovery/README.md)。

依赖版本见 `requirements-research.txt`。当前客户端的打包依赖还未补齐这些库；不要直接声称客户端已完成独立运行。

复核脚本位于 `artifacts/core-coverage-20261010`：`verify_helpers.py`、`verify_table_flows.py`、`verify_ipo.py`、`verify_relation_rules.py`、`verify_jet_source.py`。这些验证使用保存的合成观察结果，独立验证过程不加载旧业务模块。取证脚本 `probe_*` 则是单独隔离的原程序对照进程，两类脚本不要混淆。
