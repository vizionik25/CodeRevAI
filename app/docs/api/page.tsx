import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

export const dynamic = 'force-static';

async function getApiDocs() {
    const filePath = path.join(process.cwd(), 'docs', 'api.md');
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
}

export default async function ApiDocsPage() {
    const markdown = await getApiDocs();

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <a href="/dashboard/api-keys" className="text-indigo-400 hover:underline mb-6 inline-block">
                    ← Back to API Keys
                </a>
                <article className="prose prose-invert prose-lg max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                    <SyntaxHighlighter
                                        style={vscDarkPlus as any}
                                        language={match[1]}
                                        PreTag="div"
                                        {...props}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                ) : (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            },
                        }}
                    >
                        {markdown}
                    </ReactMarkdown>
                </article>
            </div>
        </div>
    );
}
