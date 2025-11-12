'use client';

import React from 'react';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  return (
    <div
      role="alert"
      className="mb-4 flex items-start justify-between rounded-lg border border-red-500 bg-red-900/80 px-4 py-3 text-sm text-red-100 shadow-lg"
    >
      <p className="pr-4 font-medium">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="flex items-center rounded-md bg-red-800 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-red-100 transition hover:bg-red-700"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
