import {workflowDefinitions} from '../workflows/definitions.mjs';

// Bind every registered independent capability to a versioned built-in flow.
// The model chooses steps inside these boundaries; users never author graphs.
export const AGENT_WORKFLOW_VERSION = 'audit-workflows/1';
export const AGENT_PLAN_VERSION = 'audit-plan/1';

function stageContract(flow, stage, index) {
  const previous = flow.stages[index - 1];
  return {
    id:stage.id,
    kind:stage.kind,
    title:stage.title,
    description:stage.description,
    required:!stage.optional,
    optional:!!stage.optional,
    dependsOn:previous ? [previous.id] : [],
    toolIds:[...stage.tools],
    version:AGENT_WORKFLOW_VERSION,
    context:{required:['original_requirements','input_versions','unresolved_questions','dependency_results','actual_execution_status'],evidence:'read_saved_inputs_or_validated_task_results',allowedReadTools:['list_local_files','preview_local_file','get_agent_evidence','get_task_result','load_task_outputs','read_agent_result'],outputCheck:stage.kind==='execute'?'verifyTaskArtifacts':'persist_node_record'},
    inputs:stage.kind === 'execute' ? {files:'selected_project_or_attachment_files', parameters:'tool_contract'} : {files:'user_selected_scope'},
    outputs:[...stage.outputs],
    completion:stage.kind === 'execute' ? 'task.succeeded_and_result_validated' : stage.kind === 'review' ? 'review_record_saved' : 'scope_recorded',
    failure:'retain_actual_error_and_enter_repair_or_waiting_state',
  };
}

export function buildAgentWorkflows(catalog) {
  const definitions = workflowDefinitions.map(flow => ({
    id:flow.id, version:AGENT_WORKFLOW_VERSION, planVersion:AGENT_PLAN_VERSION, title:flow.title,
    goal:flow.description, toolIds:[...new Set(flow.stages.flatMap(stage => stage.tools))],
    skillIds:({monthly:['monthly-analysis-mcp'], workpaper:['detailed-table-generation'], ledger:['jet-test'], external:['related-party-identification','cicpa-query']})[flow.id] || [],
    inputHint:flow.inputHint, note:flow.note,
    stages:flow.stages.map((stage,index)=>stageContract(flow,stage,index)),
    nodes:[
      {id:'scope', role:'coordinator', completionRule:'requirements_and_input_scope_saved', required:true},
      {id:'understand', role:'processor', completionRule:'parameters_have_sources_or_questions', required:true},
      {id:'execute', role:'processor', completionRule:'registered_tool_finished', required:true},
      {id:'validate', role:'checker', completionRule:'business_status_and_actual_output_verified', required:true},
      {id:'deliver', role:'checker', completionRule:'all_required_steps_verified_no_unresolved_questions', required:true},
    ],
    contract:{inputScope:'project_or_conversation_attachments', outputs:'stage_outputs_and_result_refs', state:'external_persistent_run', modelMayOnlyUseRegisteredTools:true},
  }));
  const mapped = new Set(definitions.flatMap(d => d.toolIds));
  const missing = catalog.filter(t => !mapped.has(t.id));
  if(missing.length) throw Error('Agent 工作流缺少能力绑定：' + missing.map(t => t.id).join(', '));
  const unknown = [...mapped].filter(id => !catalog.some(t => t.id === id));
  if(unknown.length) throw Error('Agent 工作流绑定未知工具：' + unknown.join(', '));
  return definitions;
}

export function workflowForTool(toolId, workflows) {
  return workflows.flatMap(flow => flow.stages.filter(stage => stage.toolIds.includes(toolId)).map(stage => ({
    workflowId:flow.id,
    stageId:stage.id,
    stageTitle:stage.title,
    required:stage.required,
    toolId,
  })));
}

export function verifyWorkflowPlan(plan, catalog, workflows) {
  const steps = verifyPlan(plan, catalog, workflows);
  const selected = plan.workflowIds || (plan.workflowId ? [plan.workflowId] : []);
  const stages = workflows.filter(flow => selected.includes(flow.id)).flatMap(flow => flow.stages.map(stage => ({...stage, workflowId:flow.id})));
  for (const step of steps) {
    const matches = stages.filter(stage => stage.toolIds.includes(step.toolId));
    if (!matches.length) throw Error('步骤没有对应的已登记节点：' + step.toolId);
    if (step.stageId && !matches.some(stage => stage.id === step.stageId)) throw Error('步骤节点与工具绑定不一致：' + step.id);
    const stage = matches.find(item => item.id === step.stageId) || matches[0];
  }
  return steps.map(step => {
    const stage = stages.find(item => item.toolIds.includes(step.toolId) && (!step.stageId || item.id === step.stageId));
    return {...step, stageId:stage?.id, workflowId:stage?.workflowId};
  });
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
    // Steps without dependsOn are independent; ordering is only enforced where the model declared it.
    const dependencies = step.dependsOn || [];
    if(!Array.isArray(dependencies) || dependencies.some(dep => !ids.has(dep))) throw Error('步骤依赖必须指向此前已有步骤');
    if(!Array.isArray(step.files) || step.files.some(file => typeof file !== 'string' || !file.trim()) || !step.parameters || typeof step.parameters !== 'object' || Array.isArray(step.parameters)) throw Error('每个步骤需要资料引用和参数对象');
    ids.add(id);
    return {id, title:String(step.title || catalog.find(t => t.id === step.toolId).name).slice(0,120), toolId:step.toolId, stageId:step.stageId, files:[...step.files], parameters:step.parameters, dependsOn:[...dependencies], parameterSources:step.parameterSources || {}, status:'pending', attempts:0, maxRepairAttempts:2};
  });
}
