import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ArticleMarkdown({ content }: { content: string }) {
  return <div className="article-prose"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
    // Article title already supplies the only h1.
    h1: ({ children }) => <h2>{children}</h2>,
    a: ({ href, children }) => <a href={href === '/para-clinicas' ? '/clinicas' : href}>{children}</a>,
    table: ({ children }) => <div className="article-table"><table>{children}</table></div>,
  }}>{content.replace(/^\*\*CTA:\*\*\s*/gm, '')}</Markdown></div>;
}
