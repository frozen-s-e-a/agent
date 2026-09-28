import React from 'react';
import { Folder, ShieldCheck, FileText } from 'lucide-react';
import type { Tool, Project } from './types';

interface WelcomePageProps {
  toolCount: number;
  project: Project | undefined;
  tools: Tool[];
  onCreateProject: () => void;
  onOpenSearch: () => void;
  onOpenTool: (t: Tool) => void;
  onDemo: () => void;
}

export function WelcomePage({
  toolCount, project, tools,
  onCreateProject, onOpenSearch, onOpenTool, onDemo,
}: WelcomePageProps) {
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    (e.currentTarget as HTMLElement).style.setProperty('--x', `${x}%`);
    (e.currentTarget as HTMLElement).style.setProperty('--y', `${y}%`);
  };

  return (
    <div className="welcome">
      <div className="welcome-glow" aria-hidden="true"/>
      <div className="welcome-center">
        <div className="welcome-title">你好，准备开始审计了吗？</div>
        <div className="welcome-desc">
          输入任务描述开始对话，或从 {toolCount} 个本地工具中选择
        </div>
        <div className="welcome-actions">
          <button
            className="welcome-action"
            onClick={onCreateProject}
            onMouseMove={handleMouseMove}
          >
            <span className="welcome-action-icon"><Folder size={20}/></span>
            <span>
              <strong>选择项目</strong>
              <small>划定资料范围</small>
            </span>
          </button>
          <button
            className="welcome-action"
            onClick={onOpenSearch}
            onMouseMove={handleMouseMove}
          >
            <span className="welcome-action-icon"><FileText size={20}/></span>
            <span>
              <strong>浏览工具</strong>
              <small>从 {toolCount} 个工具中选择</small>
            </span>
          </button>
        </div>
      </div>
      {project && (
        <div className="work-scope">
          <ShieldCheck size={14}/>
          <span>当前工作范围：{project.name}</span>
        </div>
      )}
    </div>
  );
}
