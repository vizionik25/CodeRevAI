import React from 'react';

interface NotificationProps {
  message: string | null;
  onDismiss: () => void;
}

const Notification = ({ message, onDismiss }: NotificationProps) => {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-xl p-4 bg-red-800 border border-red-600 text-white rounded-lg shadow-lg flex items-start justify-between z-50 animate-fade-in-down" role="alert">
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button onClick={onDismiss} className="-mt-1 -mr-1 p-1 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Dismiss notification">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default Notification;