import React from 'react';

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/30 px-4 py-6">
      <div className="mx-auto max-w-6xl text-center text-xs leading-6 text-muted-foreground sm:text-sm">
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
