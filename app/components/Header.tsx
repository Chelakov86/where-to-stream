import React from 'react';
import Link from 'next/link';

const Header = () => {
  return (
    <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-50 bg-[#1A0F1F]/80 backdrop-blur-md border-b border-[#4A3B28]/40">
      <div className="flex items-center gap-2">
        {/* Play circle icon */}
        <svg
          className="w-8 h-8 text-primary-gold"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
        <Link href="/" className="text-xl font-bold tracking-tight text-white focus:outline-none">
          WhereToStream
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {/* Bell / notifications icon */}
        <button
          className="text-white/60 hover:text-white transition-colors"
          aria-label="Notifications"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>
        {/* User avatar */}
        <div className="w-9 h-9 rounded-full bg-primary-gold/10 border border-primary-gold/20 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-primary-gold/20 transition-colors">
          <svg
            className="w-5 h-5 text-primary-gold"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        </div>
      </div>
    </header>
  );
};

export default Header;
