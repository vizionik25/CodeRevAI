import React, { useState } from 'react';

interface LocalFolderWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dontShowAgain: boolean) => void;
}

export const LocalFolderWarningModal: React.FC<LocalFolderWarningModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [isAgreed, setIsAgreed] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    onConfirm(dontShowAgain);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose} aria-modal="true" role="dialog">
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-900 sm:mx-0 sm:h-10 sm:w-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-4 text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-100" id="modal-title">
                Security & Privacy Warning
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-400">
                  Before proceeding, please ensure the selected folder does not contain any sensitive data, such as <strong className="font-semibold text-yellow-400">.env files, API keys, passwords, or personal information.</strong>
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  The contents of the selected files will be sent to the AI for analysis.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="flex items-start text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="h-4 w-4 mt-0.5 rounded bg-gray-900 border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-3 text-gray-300">
                I have reviewed the folder and confirm it does not contain sensitive data.
              </span>
            </label>
            <label className="flex items-center text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="h-4 w-4 rounded bg-gray-900 border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-3 text-gray-400">Don't show this again</span>
            </label>
          </div>
        </div>
        <div className="bg-gray-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isAgreed}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors"
          >
            OK
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};