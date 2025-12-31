import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
                <article className="prose prose-invert prose-lg max-w-none prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-code:text-indigo-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {markdown}
                    </ReactMarkdown>
                </article>
            </div>
        </div>
    );
}
