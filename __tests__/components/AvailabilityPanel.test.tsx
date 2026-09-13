import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvailabilityPanel from '@/app/components/AvailabilityPanel';
import { mockMovie } from '../../test/mocks';

describe('AvailabilityPanel', () => {
  it('shows the verdict and offer groups for the country', () => {
    render(<AvailabilityPanel title={mockMovie} country="US" services={[]} />);

    expect(
      screen.getByRole('heading', { name: 'Where to watch in United States' })
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Free to watch');
    expect(
      screen.getByText('Stream with a subscription · Included in the plan')
    ).toBeInTheDocument();
    expect(screen.getByText('Free & ad-supported · No subscription needed')).toBeInTheDocument();
    expect(screen.queryByText('Rent · One-off payment')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Watch on Netflix (opens in a new tab)' })
    ).toHaveAttribute('href', 'https://example.com/watch/us');
  });

  it('highlights providers that are on the user services', () => {
    render(<AvailabilityPanel title={mockMovie} country="US" services={[8]} />);

    expect(screen.getByRole('status')).toHaveTextContent('Included in your services');
    const netflix = screen.getByRole('link', { name: 'Watch on Netflix (opens in a new tab)' });
    expect(within(netflix).getByText('(one of your services)')).toBeInTheDocument();
  });

  it('links to the country comparison', () => {
    render(<AvailabilityPanel title={mockMovie} country="DE" services={[]} />);

    expect(screen.getByRole('status')).toHaveTextContent('Rent or buy only');
    expect(screen.getByRole('link', { name: 'Compare 3 countries' })).toHaveAttribute(
      'href',
      '/title/movie/550/countries?country=DE'
    );
  });

  it('points to other countries when the title is not available locally', () => {
    render(<AvailabilityPanel title={mockMovie} country="FR" services={[]} />);

    expect(screen.getByRole('status')).toHaveTextContent('Not available here');
    expect(screen.getByRole('link', { name: 'See the 3 countries that carry it' })).toHaveAttribute(
      'href',
      '/title/movie/550/countries?country=FR'
    );
  });

  it('explains when there is no data anywhere', () => {
    render(
      <AvailabilityPanel title={{ ...mockMovie, availability: {} }} country="US" services={[]} />
    );

    expect(screen.getByRole('status')).toHaveTextContent('No streaming data');
    expect(screen.queryByRole('link', { name: /compare/i })).not.toBeInTheDocument();
  });
});
