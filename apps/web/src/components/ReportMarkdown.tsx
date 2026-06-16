'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Renders an audit report (Markdown) as cleanly formatted UI. */
export function ReportMarkdown({ children }: { children: string }) {
  return (
    <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-white mt-2 mb-3 border-b border-zinc-800 pb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-white mt-5 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-zinc-100 mt-4 mb-1.5">{children}</h3>
          ),
          p: ({ children }) => <p className="text-zinc-400">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 text-zinc-400">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 text-zinc-400">{children}</ol>,
          li: ({ children }) => <li className="text-zinc-400">{children}</li>,
          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-indigo-500/40 pl-3 italic text-zinc-500">{children}</blockquote>
          ),
          code: ({ className, children }) => {
            const isBlock = (className || '').includes('language-');
            return isBlock ? (
              <code className="block bg-[#0d1117] border border-zinc-800 rounded-lg p-3 my-2 text-xs font-mono text-zinc-300 overflow-x-auto">
                {children}
              </code>
            ) : (
              <code className="bg-zinc-800/60 text-amber-300 rounded px-1.5 py-0.5 text-[0.85em] font-mono">{children}</code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="w-full text-xs border border-zinc-800 rounded-lg">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-zinc-900/60">{children}</thead>,
          th: ({ children }) => (
            <th className="text-left px-3 py-2 font-medium text-zinc-400 border-b border-zinc-800">{children}</th>
          ),
          td: ({ children }) => <td className="px-3 py-2 text-zinc-400 border-b border-zinc-800/50">{children}</td>,
          hr: () => <hr className="border-zinc-800 my-4" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
