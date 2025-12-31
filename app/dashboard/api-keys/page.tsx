'use client';

import React from 'react';
import { Header } from '../../components/Header';
import ApiKeyManager from '../../components/ApiKeyManager';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export default function ApiKeysPage() {
    const { isLoaded, isSignedIn } = useUser();

    if (isLoaded && !isSignedIn) {
        redirect('/');
    }

    if (!isLoaded) {
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-200">Loading...</div>;
    }

    return (
        <div className="bg-gray-900 min-h-screen text-gray-200 font-sans">
            <Header onToggleHistory={() => { }} /> {/* History toggle not strictly needed here, pass no-op */}

            <main className="container mx-auto p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
                            API Settings
                        </h1>
                        <p className="text-gray-400">
                            Manage your API keys for external integrations.
                        </p>
                    </div>

                    <ApiKeyManager />
                </div>
            </main>
        </div>
    );
}
