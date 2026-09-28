import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from './api';

interface MarkdownMessageProps {
  text: string;
  onError: (e: unknown) => void;
}

export function MarkdownMessage({ text, onError }: MarkdownMessageProps) {
  return (
    <div className="markdown-message">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => {
            if (/^https?:\/\//i.test(href || '')) {
              return (
                <a href={href} onClick={e => {
                  e.preventDefault();
                  api('link.open', { url: href }).catch(onError);
                }}>
                  {children}
                </a>
              );
            }
            return <span>{children}</span>;
          },
          img: ({ alt }) => (
            <span className="markdown-image-note">
              [图片：{alt || '外部图片未自动加载'}]
            </span>
          ),
          table: ({ children }) => (
            <div className="markdown-table">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
