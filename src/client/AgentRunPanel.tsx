import React, {useEffect, useRef, useState} from 'react';
import {Eye, ExternalLink, FileText, Play, X} from 'lucide-react';
import {api} from './api';

export const agentStatus:Record<string,string>={running:'执行中',queued:'排队中',cancelling:'正在停止',succeeded:'步骤完成',completed:'已完成',failed:'未完成',stopped:'已停止',cancelled:'已取消',interrupted:'上次运行中断',waiting_for_user:'等待补充',awaiting_input:'等待补充',remote_pending:'远端处理中',submission_unknown:'提交状态待核对',pending:'待执行'};
const recoverable=(status:string)=>['stopped','interrupted','failed','waiting_for_user'].includes(status);

function FilePreview({value,onClose,onSource}:{value:any;onClose:()=>void;onSource:(source:any)=>void}) {
  const close=useRef<HTMLButtonElement>(null),container=useRef<HTMLDivElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement;close.current?.focus();return()=>previous?.focus();},[]);
  useEffect(()=>{close.current?.focus();},[value.name]);
  const keyDown=(event:React.KeyboardEvent)=>{if(event.key==='Escape')onClose();if(event.key==='Tab'){const elements=container.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');if(!elements?.length)return;const first=elements[0],last=elements[elements.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};
  const hasSources=value.sourceOrigins?.some(Boolean);
  const columnLabel=(column:string)=>({'_source_file':'来源文件','_source_sheet':'来源工作表','_source_row':'来源行','_row_id':'记录序号'}[column] || column);
  return <div className="agent-preview-backdrop" onClick={onClose}>
    <div ref={container} onKeyDown={keyDown} className="agent-preview-dialog" role="dialog" aria-modal="true" aria-label="文件预览" onClick={event=>event.stopPropagation()}>
      <div className="agent-panel-head"><div><strong>{value.name}</strong><p>{value.highlightedSourceRow?`来源第 ${value.highlightedSourceRow} 行。`:''}预览只显示样本，完整内容请打开文件查看。</p></div><button ref={close} aria-label="关闭文件预览" onClick={onClose}><X size={18}/></button></div>
      {value.text?<pre>{value.text}</pre>:value.preview?.length?<div className="agent-preview-table"><table>
        <thead><tr>{(value.columns || []).map((column:string,index:number)=><th key={index}>{columnLabel(column)}</th>)}{hasSources&&<th>资料来源</th>}</tr></thead>
        <tbody>{value.preview.map((row:any,index:number)=><tr key={index} className={value.highlightedSourceRow===value.sourceRows?.[index]?'agent-source-highlight':''} data-source-row={value.sourceRows?.[index]}>
          {(Array.isArray(row)?row:(value.columns || []).map((column:string)=>row[column])).map((cell:any,column:number)=><td key={column}>{cell==null?'':typeof cell==='object'?JSON.stringify(cell):String(cell)}</td>)}
          {hasSources&&<td>{value.sourceOrigins[index]&&<button onClick={()=>onSource(value.sourceOrigins[index])}>查看第 {value.sourceOrigins[index].row} 行来源</button>}</td>}
        </tr>)}</tbody>
      </table></div>:<p>文件没有可展示的文本样本，请打开成果查看。</p>}
    </div>
  </div>;
}

export function AgentRunPanel({record,onReload,onError}:{record:any;onReload:()=>Promise<any>;onError:(error:unknown)=>void}) {
  const [preview,setPreview]=useState<any>(null),[busy,setBusy]=useState(false);
  const tasks=record?.tasks || [],runs=record?.agentRuns || [],latest=runs.at(-1);
  const perform=async(work:()=>Promise<void>)=>{setBusy(true);try{await work();}catch(error){onError(error);}finally{setBusy(false);}};
  const resume=(run:any)=>perform(async()=>{await api('agent.resume',{id:run.id});await onReload();});
  return <div className="agent-results">
    {latest&&!record.streaming&&recoverable(latest.status)&&<div className="agent-resume-row"><span>{agentStatus[latest.status]}，已保存资料和执行结果。</span><button disabled={busy} onClick={()=>resume(latest)}><Play size={15} aria-hidden="true"/>继续任务</button></div>}
    {tasks.filter((task:any)=>task.result?.outputs?.length).map((task:any)=><section className="agent-result-card" key={task.id}><div className="agent-result-head"><FileText size={17} aria-hidden="true"/><strong>任务成果</strong><span>{agentStatus[task.status] || task.status}</span></div><p>{task.validationStatus==='passed'?'执行与文件完整性检查通过':'阶段成果已保留，请查看实际验证状态'}{task.result.inputRows!==undefined?` · 输入 ${task.result.inputRows} 行`:''}{task.result.rowCount!==undefined?` · 输出 ${task.result.rowCount} 行`:''}</p>{task.result.outputs.map((output:any,index:number)=><div className="agent-result-file" key={output.path || output.name+index}><span>{output.name}</span><button disabled={busy} onClick={()=>perform(async()=>{const value=await api('result.preview',{id:task.id,name:output.name,path:output.path});setPreview({...value,name:output.name});})}><Eye size={14} aria-hidden="true"/>预览</button><button disabled={busy} onClick={()=>perform(async()=>{await api('result.open',{id:task.id,name:output.name,path:output.path});})}><ExternalLink size={14} aria-hidden="true"/>打开成果</button></div>)}{task.result.warnings?.length>0&&<details><summary>查看 {task.result.warnings.length} 条提示</summary>{task.result.warnings.map((warning:string,index:number)=><p key={index}>{warning}</p>)}</details>}</section>)}
    {runs.length>0&&<details className="agent-run-records"><summary>执行记录与资料来源（{runs.length} 次）</summary>{runs.slice().reverse().map((run:any)=><section className="agent-run-record" key={run.id}><div className="agent-result-head"><strong>{agentStatus[run.status] || run.status}</strong><small>{new Date(run.startedAt || run.createdAt).toLocaleString('zh-CN')}</small></div><p>{run.objective}</p><ol>{run.steps.map((step:any)=><li key={step.id}><span>{record.calls?.find((call:any)=>call.id===step.callId)?.label || step.name}</span><small>{agentStatus[step.status] || step.status}</small>{step.result?.error&&<p>{step.result.error}</p>}</li>)}</ol><details><summary>本次资料来源（{run.inputs.length}）</summary>{run.inputs.map((input:any)=><button className="agent-source-row" key={input.id} disabled={busy} onClick={()=>perform(async()=>{const value=await api('agent.sourcePreview',{sessionId:record.id,id:run.id,inputId:input.id});setPreview({...value,name:input.path});})}><FileText size={14} aria-hidden="true"/><span>{input.path}</span><Eye size={14} aria-hidden="true"/></button>)}</details>{run.changedInputs?.length>0&&<p className="agent-changed-note">原资料有变化：{run.changedInputs.join('、')}。本次成果对应已保存快照。</p>}{recoverable(run.status)&&<button disabled={busy||record.streaming} onClick={()=>resume(run)}><Play size={14} aria-hidden="true"/>继续这次任务</button>}</section>)}</details>}
    {preview&&<FilePreview value={preview} onClose={()=>setPreview(null)} onSource={source=>perform(async()=>{const value=await api('agent.sourcePreview',{sessionId:source.sessionId,id:source.runId,inputId:source.inputId,row:source.row,sheet:source.sheet,headerRow:source.headerRow});setPreview({...value,name:source.path});})}/>}
  </div>;
}
