import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import type { PluggableList } from 'unified';

export type MarkdownRendererProps = {
  content: string;
  /** Override default element renderers */
  components?: Components;
  /** Extra remark plugins */
  remarkPlugins?: PluggableList;
  /** Extra rehype plugins */
  rehypePlugins?: PluggableList;
  className?: string;
};

/**
 * Renders raw markdown content using react-markdown.
 * Drop-in component — accepts remark/rehype plugin lists and custom renderers.
 *
 * @example
 * <MarkdownRenderer
 *   content={post.content}
 *   components={{ h1: ({ children }) => <h1 className="hero">{children}</h1> }}
 * />
 */
export function MarkdownRenderer({
  content,
  components,
  remarkPlugins,
  rehypePlugins,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
