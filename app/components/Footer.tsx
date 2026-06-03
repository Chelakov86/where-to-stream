import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#0b0e13]/90 px-5 py-6">
      <div className="mx-auto max-w-7xl text-center text-xs leading-6 text-text-secondary sm:text-sm">
        <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        <p>
          Streaming availability is based on public data sources and may be incomplete or out of
          date.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
