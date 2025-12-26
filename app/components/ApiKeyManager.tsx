'use client';

import * as ReactImport from 'react';
const React: any = ReactImport;
import { useApiErrorDisplay } from '../hooks/useApiErrorDisplay';
import Notification from './Notification';

interface ApiKey {
    id: string;
    name: string;
    createdAt: string;
    lastUsed: string | null;
    isActive: boolean;
}

export default function ApiKeyManager() {
    const [keys, setKeys] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [newKeyName, setNewKeyName] = React.useState('');
    const [createdKey, setCreatedKey] = React.useState(null);
    const { error, displayError, clearError } = useApiErrorDisplay();

    React.useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/keys');
            if (!res.ok) throw new Error('Failed to fetch keys');
            const data = await res.json();
            setKeys(data);
        } catch (err) {
            displayError(err, 'fetch_keys');
        } finally {
            setIsLoading(false);
        }
    };

    const createKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;

        try {
            setIsLoading(true);
            const res = await fetch('/api/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create key');
            }

            const data = await res.json();
            setCreatedKey(data.key); // Display the full key once
            setNewKeyName('');
            fetchKeys();
        } catch (err) {
            displayError(err, 'create_key');
        } finally {
            setIsLoading(false);
        }
    };

    const revokeKey = async (id: string) => {
        if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;

        try {
            setIsLoading(true);
            const res = await fetch(`/api/keys?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to revoke key');
            fetchKeys();
        } catch (err) {
            displayError(err, 'revoke_key');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-8">
            <h2 className="text-xl font-semibold mb-4">API Keys</h2>
            <p className="text-gray-600 mb-6 text-sm">
                Generate API keys to integrate CodeRevAI with third-party tools like Make.com, Zapier, or n8n.
            </p>

            <Notification message={error} onDismiss={clearError} />

            {/* Create Key Form */}
            <form onSubmit={createKey} className="flex gap-4 mb-8">
                <input
                    type="text"
                    placeholder="Key Name (e.g. Make.com Integration)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !newKeyName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {isLoading ? 'Creating...' : 'Create Key'}
                </button>
            </form>

            {/* New Key Display Modal/Alert */}
            {createdKey && (
                <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-green-800 font-medium">New API Key Created</h3>
                        <button
                            onClick={() => setCreatedKey(null)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                        Copy this key now. You won't be able to see it again!
                    </p>
                    <div className="flex gap-2">
                        <code className="flex-1 p-2 bg-white border border-green-200 rounded font-mono text-sm break-all">
                            {createdKey}
                        </code>
                        <button
                            onClick={() => copyToClipboard(createdKey)}
                            className="px-3 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
                        >
                            Copy
                        </button>
                    </div>
                </div>
            )}

            {/* Keys List */}
            <div className="space-y-4">
                {keys.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No API keys found.</p>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-700">Name</th>
                                    <th className="px-4 py-3 font-medium text-gray-700">Created</th>
                                    <th className="px-4 py-3 font-medium text-gray-700">Last Used</th>
                                    <th className="px-4 py-3 font-medium text-gray-700">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {keys.map((key: ApiKey) => (
                                    <tr key={key.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{key.name}</td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {new Date(key.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {key.lastUsed ? new Date(key.lastUsed).toLocaleString() : 'Never'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => revokeKey(key.id)}
                                                className="text-red-600 hover:text-red-800 text-xs font-medium border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                                            >
                                                Revoke
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
