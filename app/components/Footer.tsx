import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-transparent border-t border-golden-bronze/30 p-4 mt-8">
      <div className="container mx-auto text-center text-sm text-cream-text/50">
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
