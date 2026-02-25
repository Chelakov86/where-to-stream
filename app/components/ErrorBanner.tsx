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
      className="mb-4 flex items-start justify-between rounded-xl glass-panel border-red-500/60 px-4 py-3 text-sm text-cream-text shadow-lg"
    >
      <p className="pr-4 font-medium">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="flex items-center rounded-lg bg-red-800/60 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-cream-text transition hover:bg-red-700/60"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
