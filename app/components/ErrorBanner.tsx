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
      className="mb-4 flex items-start justify-between rounded-xl border border-red-300/30 bg-red-950/80 px-4 py-3 text-sm text-red-100 shadow-lg"
    >
      <p className="pr-4 font-medium">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="flex items-center rounded-md bg-red-300/15 px-2 py-1 text-xs font-black uppercase tracking-wide text-red-100 transition hover:bg-red-300/25"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
