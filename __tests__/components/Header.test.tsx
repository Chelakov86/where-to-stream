import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from '@/app/components/Header';

describe('Header', () => {
  it('renders the "WhereToStream" text', () => {
    render(<Header />);
    const heading = screen.getByText(/WhereToStream/i);
    expect(heading).toBeInTheDocument();
  });
});
