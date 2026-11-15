import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import AvailabilityPanel from '@/app/components/AvailabilityPanel';
import { mockMovie } from '../mocks';

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
      screen.getByRole('link', { name: 'View watch options on TMDB (opens in a new tab)' })
    ).toHaveAttribute('href', 'https://example.com/watch/us');
  });

  it('highlights providers that are on the user services', () => {
    render(<AvailabilityPanel title={mockMovie} country="US" services={[8]} />);

    expect(screen.getByRole('status')).toHaveTextContent('Included in your services');
    const netflix = screen.getByText('Netflix').closest('li')!;
    expect(within(netflix).getByText('(one of your services)')).toBeInTheDocument();
  });

  it('lists all offer groups as information with one shared, keyboard-accessible TMDB action', async () => {
    const user = userEvent.setup();
    const watchLink = 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=US';
    const title = {
      ...mockMovie,
      availability: {
        ...mockMovie.availability,
        US: {
          ...mockMovie.availability.US,
          ...mockMovie.availability.DE,
          countryCode: 'US',
          watchLink,
          flatrate: mockMovie.availability.US.flatrate,
          free: mockMovie.availability.US.free,
        },
      },
    };
    render(<AvailabilityPanel title={title} country="US" services={[8]} />);

    for (const name of ['Stream with a subscription', 'Free & ad-supported', 'Rent', 'Buy']) {
      expect(screen.getByRole('heading', { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    for (const item of screen.getAllByRole('listitem')) {
      expect(within(item).queryByRole('link')).not.toBeInTheDocument();
      expect(item.querySelector('[tabindex]')).toBeNull();
    }
    const action = screen.getByRole('link', {
      name: 'View watch options on TMDB (opens in a new tab)',
    });
    expect(action).toHaveAttribute('href', watchLink);
    expect(action).toHaveAttribute('target', '_blank');
    expect(action).toHaveAttribute('rel', 'noopener noreferrer');
    expect(action).toHaveTextContent('View watch options on TMDB (opens in a new tab)');
    expect(screen.getAllByRole('link')).toHaveLength(2);
    await user.tab();
    await user.tab();
    expect(action).toHaveFocus();
    const activated = jest.fn((event: MouseEvent) => event.preventDefault());
    action.addEventListener('click', activated);
    await user.keyboard('{Enter}');
    expect(activated).toHaveBeenCalledTimes(1);
  });

  it('keeps provider information without inventing an action when the country has no URL', () => {
    render(
      <AvailabilityPanel
        title={{
          ...mockMovie,
          availability: {
            ...mockMovie.availability,
            US: { ...mockMovie.availability.US, watchLink: undefined },
          },
        }}
        country="US"
        services={[8]}
      />
    );
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('(one of your services)')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /TMDB|Watch on/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('links to the country comparison', () => {
    render(<AvailabilityPanel title={mockMovie} country="DE" services={[]} />);

    expect(screen.getByRole('status')).toHaveTextContent('Rent or buy only');
    expect(screen.getByRole('link', { name: 'Compare 3 countries' })).toHaveAttribute(
      'href',
      '/title/movie/550/countries?country=DE'
    );
  });

  it.each(['US', 'FR'])('preserves comparison context in %s', (country) => {
    const returnTo = '/?q=fight&type=movie&page=3&country=DE';
    render(
      <AvailabilityPanel title={mockMovie} country={country} services={[]} returnTo={returnTo} />
    );
    const expected = `/title/movie/550/countries?country=${country}&returnTo=${encodeURIComponent(returnTo)}`;
    expect(screen.getByRole('link', { name: 'Compare 3 countries' })).toHaveAttribute(
      'href',
      expected
    );
    if (country === 'FR') {
      expect(
        screen.getByRole('link', { name: 'See the 3 countries that carry it' })
      ).toHaveAttribute('href', expected);
    }
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
