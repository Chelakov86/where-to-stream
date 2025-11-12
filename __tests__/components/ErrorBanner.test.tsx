import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBanner from '@/app/components/ErrorBanner';

describe('ErrorBanner', () => {
  it('renders the provided message', () => {
    render(<ErrorBanner message="Something went wrong" onDismiss={() => {}} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss error/i })).toBeInTheDocument();
  });

  it('dismisses the banner when the close button is clicked', () => {
    const Wrapper = () => {
      const [visible, setVisible] = useState(true);
      return visible ? (
        <ErrorBanner
          message="Temporary outage"
          onDismiss={() => {
            setVisible(false);
          }}
        />
      ) : (
        <div data-testid="fallback">Hidden</div>
      );
    };

    render(<Wrapper />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss error/i }));

    expect(screen.queryByText('Temporary outage')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });
});

