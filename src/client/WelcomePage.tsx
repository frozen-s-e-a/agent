import React from 'react';
import { Folder, Sparkles } from 'lucide-react';

interface WelcomePageProps {
  toolCount: number;
  legacyToolCount: number;
  onCreateProject: () => void;
  onDemo: () => void;
}

export function WelcomePage({
  toolCount, legacyToolCount,
  onCreateProject, onDemo,
}: WelcomePageProps) {
  return (
    <div className="welcome">
      <div className="welcome-glow" aria-hidden="true"/>
      <div className="welcome-center">
        <div className="welcome-title">你好，准备开始审计了吗？</div>
        <div className="welcome-desc">
          输入任务描述开始对话，或使用输入框工具菜单选择（{toolCount} 个本地工具）
          {legacyToolCount > 0 && <span className="welcome-legacy-count"> · 原版兼容工具 {legacyToolCount} 项</span>}
        </div>
        <div className="welcome-actions">
          <button
            className="welcome-action"
            onClick={onCreateProject}
          >
            <span className="welcome-action-icon"><Folder size={20}/></span>
            <span>
              <strong>选择项目</strong>
              <small>划定资料范围</small>
            </span>
          </button>
          <button
            className="welcome-action"
            onClick={onDemo}
          >
            <span className="welcome-action-icon"><Sparkles size={20}/></span>
            <span>
              <strong>使用合成示例</strong>
              <small>快速体验完整流程</small>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
