import {workflowDefinitions} from '../workflows/definitions.mjs';

// Bind every registered independent capability to a versioned built-in flow.
// The model chooses steps inside these boundaries; users never author graphs.
export const AGENT_WORKFLOW_VERSION = 'audit-workflows/1';
export function buildAgentWorkflows(catalog) {
  const definitions = workflowDefinitions.map(flow => ({
    id:flow.id, version:AGENT_WORKFLOW_VERSION, title:flow.title,
    goal:flow.description, toolIds:[...new Set(flow.stages.flatMap(stage => stage.tools))],
    skillIds:({monthly:['monthly-analysis-mcp'], workpaper:['detailed-table-generation'], ledger:['jet-test'], external:['related-party-identification','cicpa-query']})[flow.id] || [],
    nodes:[
      {id:'scope', role:'coordinator', completionRule:'requirements_and_input_scope_saved'},
      {id:'understand', role:'processor', completionRule:'parameters_have_sources_or_questions'},
      {id:'execute', role:'processor', completionRule:'registered_tool_finished'},
      {id:'validate', role:'checker', completionRule:'business_status_and_actual_output_verified'},
      {id:'deliver', role:'checker', completionRule:'all_required_steps_verified_no_unresolved_questions'},
    ],
  }));
  const mapped = new Set(definitions.flatMap(d => d.toolIds));
  const missing = catalog.filter(t => !mapped.has(t.id));
  if(missing.length) throw Error('Agent 工作流缺少能力绑定：' + missing.map(t => t.id).join(', '));
  const unknown = [...mapped].filter(id => !catalog.some(t => t.id === id));
  if(unknown.length) throw Error('Agent 工作流绑定未知工具：' + unknown.join(', '));
  return definitions;
}

export function verifyPlan(plan, catalog, workflows) {
  if(!plan || typeof plan !== 'object' || !Array.isArray(plan.steps) || !plan.steps.length || plan.steps.length > 24) throw Error('执行计划应包含 1–24 个真实步骤');
  const selected = plan.workflowIds || (plan.workflowId ? [plan.workflowId] : []);
  if(!selected.length || selected.some(id => !workflows.some(f => f.id === id))) throw Error('请选择已登记的内置工作流');
  const allowed = new Set(workflows.filter(f => selected.includes(f.id)).flatMap(f => f.toolIds));
  const ids = new Set();
  return plan.steps.map((step, index) => {
    const id = step.id || 'step-' + (index + 1);
    if(!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || ids.has(id)) throw Error('步骤编号无效或重复');
    if(!allowed.has(step.toolId) || !catalog.some(t => t.id === step.toolId)) throw Error('步骤工具不属于选定工作流：' + step.toolId);
    const dependencies = step.dependsOn || (index ? [plan.steps[index-1].id || 'step-' + index] : []);
    if(!Array.isArray(dependencies) || dependencies.some(dep => !ids.has(dep))) throw Error('步骤依赖必须指向此前已有步骤');
    if(!Array.isArray(step.files) || !step.parameters || typeof step.parameters !== 'object' || Array.isArray(step.parameters)) throw Error('每个步骤需要资料引用和参数对象');
    ids.add(id);
    return {id, title:String(step.title || catalog.find(t => t.id === step.toolId).name).slice(0,120), toolId:step.toolId, files:step.files, parameters:step.parameters, dependsOn:dependencies, parameterSources:step.parameterSources || {}, status:'pending', attempts:0, maxRepairAttempts:2};
  });
}
