import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '@/app/components/Footer';

describe('Footer', () => {
  it('renders the TMDB disclaimer', () => {
    render(<Footer />);
    const tmdbDisclaimer = screen.getByText(
      /This product uses the TMDB API but is not endorsed or certified by TMDB./i
    );
    expect(tmdbDisclaimer).toBeInTheDocument();
  });

  it('renders the streaming availability disclaimer', () => {
    render(<Footer />);
    const availabilityDisclaimer = screen.getByText(
      /Streaming availability is based on public data sources and may be incomplete or out of date./i
    );
    expect(availabilityDisclaimer).toBeInTheDocument();
  });
});
