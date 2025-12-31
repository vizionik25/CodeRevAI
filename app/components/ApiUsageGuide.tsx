'use client';

import * as ReactImport from 'react';
const React: any = ReactImport;

export default function ApiUsageGuide() {
    const [baseUrl, setBaseUrl] = React.useState('');

    React.useEffect(() => {
        setBaseUrl(window.location.origin);
    }, []);

    const exampleCurl = `curl -X POST ${baseUrl}/api/review-code \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "function hello() { console.log(\\"world\\"); }",
    "filename": "hello.js"
  }'`;

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-indigo-400">Integration Guide</h3>
                <a
                    href="/docs/api"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white font-semibold transition-colors text-sm"
                >
                    📖 View Full API Documentation
                </a>
            </div>
            <div className="space-y-6">
                <div>
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Base Endpoint</h4>
                    <code className="bg-gray-900 px-3 py-2 rounded text-gray-300 font-mono text-sm block border border-gray-700">
                        {baseUrl}/api
                    </code>
                </div>

                <div>
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Available Endpoints</h4>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                            <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded text-xs font-mono font-bold">POST</span>
                            <span className="font-mono">/review-code</span>
                            <span className="text-gray-500">- Review a specific code snippet</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded text-xs font-mono font-bold">POST</span>
                            <span className="font-mono">/review-repo</span>
                            <span className="text-gray-500">- Review an entire repository</span>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Example Request (cURL)</h4>
                    <div className="relative group">
                        <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto border border-gray-700 text-sm font-mono text-gray-300">
                            {exampleCurl}
                        </pre>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400">
                        Authentication is required. Provide your API key in the <code className="text-indigo-300">Authorization</code> header as a Bearer token.
                    </p>
                </div>
            </div>
        </div>
    );
}
