import ReactMarkdown from 'react-markdown'

import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'; // To handle line breaks
import rehypeRaw from 'rehype-raw' // 新增：用于解析 HTML

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

import { useTheme } from 'next-themes';

import ImageLoader from './ImageLoader';
import { useGlobalVariableContext } from 'contexts/GlobalVariableContext';

export function Mdx({ source }: { source: string }) {

    const { theme, resolvedTheme } = useTheme();
    const { clientConfig } = useGlobalVariableContext()

    // 延迟渲染，直到 theme 确定
    if (!theme && !resolvedTheme) {
        return null; // 或者加载指示器
    }

    return (
        <div className='markdown-body'>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                rehypePlugins={[rehypeRaw]}
                components={{
                    code: ({ children = [], className, ...props }) => {
                        // 
                        const match = /language-(\w+)/.exec(className || '')
                        return match ? (<SyntaxHighlighter
                            language={match?.[1]}
                            showLineNumbers={true}
                            style={theme == "dark" ? (oneDark as any) : (oneLight as any)}
                            PreTag='div'
                            className='syntax-hight-wrapper transition-colors duration-300'
                        >
                            {children as string[]}
                        </SyntaxHighlighter>) : (
                            <code {...props} className={className}>
                                {children}
                            </code>
                        )
                    },
                    img: ({ node: _node, ...props }) => (
                        <ImageLoader
                            src={props.src || clientConfig.DefaultBGImage}
                            alt={props.alt || ""}
                            className="w-full h-full object-cover"
                        />
                    ),
                }}
                skipHtml={false}
            >{source.replace(/<br\s*\/?>/g, "\n")}</ReactMarkdown>
        </div>
    )
}