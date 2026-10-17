import React from 'react';
import {Check, Sparkles} from 'lucide-react';
import {ProjectForm} from './Projects';
import {ModelServiceForm} from './SettingsView';
import type {Boot, Project} from '../types';

interface Props {
  boot: Boot;
  onRefresh: () => Promise<Boot>;
  onProject: (project: Project) => void;
}

/** First run: connect a model service, then put the material into a project. */
export function Onboarding({boot, onRefresh, onProject}: Props) {
  const modelReady = !!boot.settings.baseUrl && !!boot.settings.model;
  const step = modelReady ? 2 : 1;
  return <div className="onboarding">
    <div className="onboarding-card">
      <div className="onboarding-brand"><span className="brand-mark"><Sparkles size={15} /></span><strong>审计 Agent</strong></div>
      <ol className="onboarding-steps">
        <li className={step === 1 ? 'current' : 'done'}><span>{step > 1 ? <Check size={12} /> : 1}</span>连接模型服务</li>
        <li className={step === 2 ? 'current' : ''}><span>2</span>建立项目</li>
      </ol>
      {step === 1 ? <>
        <h1>先连接模型服务</h1>
        <p className="muted">填写企业模型网关的地址和密钥，获取模型列表后选择文本模型。模型需要兼容 OpenAI 接口并支持工具调用。</p>
        <ModelServiceForm boot={boot} onRefresh={onRefresh} onboarding />
      </> : <>
        <h1>把资料放进一个项目</h1>
        <p className="muted">选择存放本次审计资料的文件夹。Agent 只在项目范围内读取资料，原文件不会被修改，成果另存。</p>
        <ProjectForm onCreated={onProject} />
      </>}
    </div>
  </div>;
}
