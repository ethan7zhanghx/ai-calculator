'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';

const ArchitecturePage = () => {
  const [mermaidCode, setMermaidCode] = useState('');
  const [mermaidLoaded, setMermaidLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/get-architecture-md', { cache: 'no-store' })
      .then((res) => res.text())
      .then((text) => {
        // Extract only the code from the mermaid block
        const match = text.match(/```mermaid\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          setMermaidCode(match[1]);
        }
      });
  }, []);

  useEffect(() => {
    if (mermaidLoaded && mermaidCode) {
      // A small delay to ensure the DOM is fully updated before Mermaid runs.
      // This helps prevent race conditions.
      setTimeout(() => {
        try {
          // Ensure the container is clean before rendering
          const container = document.querySelector('.mermaid');
          if (container) {
            container.innerHTML = mermaidCode;
            window.mermaid.run({ nodes: [container] });
          }
        } catch (e: any) {
          console.error("Mermaid rendering failed:", e);
          const container = document.querySelector('.mermaid');
          if (container) {
            container.innerHTML = `图表渲染失败: ${e.message}`;
          }
        }
      }, 100);
    }
  }, [mermaidLoaded, mermaidCode]);

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"
        onLoad={() => {
          window.mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
          setMermaidLoaded(true);
        }}
      />
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">技术架构图</h1>
        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
          {mermaidCode ? (
            <div className="mermaid" key={mermaidCode}>
              {/* Mermaid will render the content here */}
            </div>
          ) : (
            <p>正在加载架构图...</p>
          )}
        </div>
        <hr className="my-8" />
        <article className="prose dark:prose-invert max-w-none">
            <h2>技术栈说明</h2>
            <ol>
                <li><strong>前端 (Frontend)</strong>:
                    <ul>
                        <li><strong>框架</strong>: <strong>Next.js</strong> (with App Router) 和 <strong>React.js</strong> 用于构建用户界面。</li>
                        <li><strong>语言</strong>: <strong>TypeScript</strong> 提供类型安全和更好的开发体验。</li>
                        <li><strong>UI/样式</strong>: <strong>Tailwind CSS</strong> 用于功能优先的样式设计，并由 <strong>Shadcn UI</strong> 提供预构建的、可访问的组件库。</li>
                    </ul>
                </li>
                <li><strong>后端 (Backend)</strong>:
                    <ul>
                        <li><strong>框架</strong>: <strong>Next.js API 路由</strong> 提供后端接口，运行在 <strong>Node.js</strong> 环境中。</li>
                        <li><strong>认证</strong>: 使用 <strong>JSON Web Tokens (JWT)</strong> 来保护 API 路由和管理用户会话。</li>
                        <li><strong>核心逻辑</strong>: 所有业务逻辑（如评估、计算）都用 <strong>TypeScript</strong> 编写，并组织在 <code>/lib</code> 目录中。</li>
                    </ul>
                </li>
                <li><strong>数据层 (Data Layer)</strong>:
                    <ul>
                        <li><strong>ORM</strong>: <strong>Prisma</strong> 作为对象关系映射器 (ORM)，为数据库操作提供类型安全的接口。客户端在 <code>lib/prisma.ts</code> 中配置。</li>
                        <li><strong>数据库</strong>: 应用配置为在开发中使用 <strong>SQLite</strong>，并可切换到 <strong>PostgreSQL</strong> 用于生产环境。</li>
                    </ul>
                </li>
                <li><strong>部署与开发 (Deployment & Development)</strong>:
                    <ul>
                        <li><strong>托管</strong>: 项目已设置为在 <strong>Vercel</strong> 上部署，该平台为 Next.js 应用进行了优化（如 <code>vercel.json</code> 所示）。</li>
                        <li><strong>版本控制</strong>: 代码库在 <strong>Git</strong> 仓库中进行管理。</li>
                    </ul>
                </li>
            </ol>
        </article>
      </div>
    </>
  );
};

declare global {
  interface Window {
    mermaid: any;
  }
}

export default ArchitecturePage;
