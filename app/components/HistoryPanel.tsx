import React from 'react';
import { HistoryItem } from '@/app/types';

interface HistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryItem[];
    onSelect: (item: HistoryItem) => void;
    onClear: () => void;
}

export const HistoryPanel = ({ isOpen, onClose, history, onSelect, onClear }: HistoryPanelProps) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
            aria-hidden="true"
        >
            <div
                className="fixed top-0 right-0 h-full w-full max-w-md bg-gray-800 shadow-xl z-50 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-100">Review History</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700" aria-label="Close history">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto">
                    {history.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            <p>No history yet.</p>
                            <p className="text-sm mt-2">Completed reviews will appear here.</p>
                        </div>
                    ) : (
                        <ul>
                            {history.map((item) => (
                                <li key={item.id} className="border-b border-gray-700">
                                    <button
                                        onClick={() => onSelect(item)}
                                        className="w-full text-left p-4 hover:bg-gray-700/50 transition-colors"
                                    >
                                        <p className="font-semibold text-gray-200 truncate">{item.fileName}</p>
                                        <div className="flex items-center flex-wrap gap-2 mt-1">
                                            <p className="text-sm text-gray-400">{item.language}</p>
                                            {(item.mode || ['comprehensive']).map(mode => (
                                                <span key={mode} className="px-2 py-0.5 text-xs font-medium bg-indigo-900 text-indigo-300 rounded-full capitalize">
                                                    {mode.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1.5">
                                            {new Date(item.timestamp).toLocaleString()}
                                        </p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {history.length > 0 && (
                    <div className="p-4 border-t border-gray-700">
                        <button
                            onClick={onClear}
                            className="w-full py-2 bg-red-800 hover:bg-red-700 text-white rounded-md transition-colors"
                        >
                            Clear History
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
