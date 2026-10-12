import type {FileSystemEntry, Tool} from './types';

const titles: Record<string, string> = {
  inspect: '检查数据结构', select_column: '提取需要的列', merge_files: '合并多份表格',
  monthly_analysis: '生成月间分析表', voucher_check: '核对凭证借贷', duplicates: '查找重复记录',
  mcp_ipo_sh: '下载上交所 IPO 披露文件', mcp_ipo_sz: '下载深交所 IPO 披露文件',
  mcp_ipo_bj: '下载北交所 IPO 披露文件', mcp_announcement: '下载上市公司公告',
  mcp_bank_flow: '核对序时账与银行流水', mcp_bankflowmerge: '合并银行流水',
  mcp_cicpa_query: '查询企业工商信息', mcp_related_party: '识别关联方线索',
  mcp_gross_margin_analysis: '分析收入成本与毛利率', mcp_monthly_execute: '分析本期与上期月度变化',
  mcp_monthly_ai_analysis: '分析月度变动原因', mcp_detailed_table_generate: '生成明细底稿',
  mcp_bank_digit2: '生成电子银行函证', mcp_bank_paper1: '生成纸质银行函证（格式一）',
  mcp_bank_paper2: '生成纸质银行函证（格式二）', mcp_cutoff_sampling: '抽取截止测试样本',
};
export const actionTitle = (tool?: Tool) => tool ? titles[tool.id] || tool.name.replace(/[📋🎯🖊️]/gu, '').trim() : '处理资料';
export const baseName = (file: string) => file.split(/[\\/]/).pop() || file;
export const extension = (file: string) => (baseName(file).match(/\.[^.]+$/)?.[0] || '').toLowerCase();
export const sizeLabel = (size?: number) => !size ? '—' : size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(1)} MB`;
export const noFilesNeeded = (tool: Tool) => tool.contract?.inputMode === 'none';
export function businessPreview(data: any, showSources = false) {
  if (!data || showSources) return data;
  const columns = (data.columns || []).map((c: any) => typeof c === 'string' ? c : c.name || c.column);
  const indices = columns.map((_: string, i: number) => i).filter((i: number) => !['_source_file', '_source_sheet', '_source_row', '_row_id'].includes(columns[i]));
  return {...data, columns: indices.map((i: number) => columns[i]), preview: (data.preview || []).map((row: any) => Array.isArray(row) ? indices.map((i: number) => row[i]) : row)};
}
const pathKinds = new Set(['file', 'directory', 'path']);
export function initialParameters(tool: Tool, sources: string[]) {
  const parameters: Record<string, any> = Object.fromEntries(tool.fields.filter(f => f.default !== undefined).map(f => [f.key, f.default]));
  for (const f of tool.fields) {
    if (f.kind === 'json' && parameters[f.key] === undefined) parameters[f.key] = f.key === 'subjects' ? '[]' : '{}';
    if (!pathKinds.has(f.kind || '') || f.kind === 'directory') continue;
    const candidates = sources.filter(file => !tool.contract?.extensions?.length || tool.contract.extensions.includes(extension(file)));
    if (f.key === 'config_file') { parameters[f.key] = candidates.find(x => /配置|config/i.test(baseName(x))); continue; }
    if (f.key === 'gl_path' || f.key === 'this_year_file') parameters[f.key] = candidates.find(x => /序时|账簿|ledger/i.test(baseName(x)));
    else if (f.key === 'bank_path') parameters[f.key] = candidates.find(x => /流水|bank/i.test(baseName(x)));
    else if (['file_path', 'this_data_path'].includes(f.key)) parameters[f.key] = candidates[0];
    else if (f.type === 'array') parameters[f.key] = candidates;
  }
  return parameters;
}

export function suggestedActions(tools: Tool[], sources: string[], columns: string[] = []) {
  const text = sources.map(baseName).join(' ') + ' ' + columns.join(' ');
  let ids = ['mcp_ipo_sh', 'mcp_announcement', 'mcp_cicpa_query'];
  if (sources.length) {
    ids = ['inspect', 'select_column', 'merge_files', 'file_inventory'];
    if (/序时|凭证|借方|贷方/.test(text)) ids = ['inspect', 'monthly_analysis', 'jet_test', 'voucher_check', 'select_column'];
    if (/流水|bank/i.test(text)) ids = ['inspect', 'mcp_bank_flow', 'mcp_bankflowmerge', 'select_column'];
    if (/序时/.test(text) && /流水/.test(text)) ids = ['mcp_bank_flow', 'inspect', 'select_column'];
    if (/收入|成本|毛利/.test(text)) ids = ['mcp_gross_margin_analysis', 'inspect', 'select_column', 'duplicates'];
    if (sources.every(x => extension(x) === '.pdf')) ids = ['pdf_text', 'mcp_info_extract', 'mcp_paper_verify', 'file_inventory'];
  }
  return ids.map(id => tools.find(t => t.id === id)).filter((t): t is Tool => Boolean(t)).filter(t => !sources.length || t.contract?.inputMode === 'none' || sources.some(x => !t.contract?.extensions?.length || t.contract.extensions.includes(extension(x))));
}

export function searchActions(tools: Tool[], query: string, sources: string[], favorites: string[]) {
  const recommended = suggestedActions(tools, sources).map(t => t.id);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const aliases: Record<string, string> = {
    inspect: '检查表格 查看数据 看表 检查序时账 查看序时账',
    select_column: '提取列 提取字段 保留列 整理表格',
    merge_files: '合并表格 整理表格 合并文件',
    mcp_ipo_sh: '下载招股书 招股书下载 下载问询函 IPO下载 下载IPO文件',
    mcp_ipo_sz: '下载招股书 招股书下载 下载问询函 IPO下载 下载IPO文件',
    mcp_ipo_bj: '下载招股书 招股书下载 下载问询函 IPO下载 下载IPO文件',
    mcp_bank_flow: '核对流水 核对银行流水 银行对账 银行核对 流水对账',
    mcp_announcement: '下载年报 年报下载 下载审计报告 下载半年报',
    mcp_cicpa_query: '查公司 查工商 查股东 查询企业',
  };
  return tools.filter(t => words.every(word => `${actionTitle(t)} ${t.name} ${t.description} ${t.id} ${aliases[t.id] || ''}`.toLowerCase().includes(word))).sort((a, b) => {
    const score = (t: Tool) => (favorites.includes(t.id) ? 8 : 0) + (recommended.includes(t.id) ? 5 : 0) + (t.engine === 'builtin' ? 1 : 0);
    return score(b) - score(a);
  });
}

export function fileKind(entry: FileSystemEntry) {
  if (entry.directory) return '文件夹';
  const ext = extension(entry.name);
  return {'.xlsx': 'Excel 工作簿', '.xlsm': 'Excel 工作簿', '.csv': '数据表', '.tsv': '数据表', '.pdf': 'PDF 文档', '.docx': 'Word 文档', '.md': '说明文档', '.json': '处理记录', '.parquet': '数据成果'}[ext] || ext.slice(1).toUpperCase() || '文件';
}
