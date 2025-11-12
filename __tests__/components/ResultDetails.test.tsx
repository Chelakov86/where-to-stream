import { render, screen, waitFor, within } from '@testing-library/react';
import ResultDetails from '@/app/components/ResultDetails';
import { mockMovie, mockTv } from '../../test/mocks';

// Mock fetch
global.fetch = jest.fn();

const mockFetch = (data: any, ok = true) => {
  (fetch as jest.Mock).mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  });
};

describe('ResultDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a loading indicator', () => {
    mockFetch(mockMovie);
    render(<ResultDetails title={{ id: 123, type: 'movie' }} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show an error message on fetch failure', async () => {
    mockFetch({}, false);
    render(<ResultDetails title={{ id: 123, type: 'movie' }} />);
    await waitFor(() => {
      expect(
        screen.getByText('We’re having trouble fetching data right now. Please try again later.')
      ).toBeInTheDocument();
    });
  });

  it('should render movie details and availability correctly', async () => {
    mockFetch(mockMovie);
    render(<ResultDetails title={{ id: mockMovie.id, type: 'movie' }} />);

    await waitFor(async () => {
      expect(screen.getByText(mockMovie.title)).toBeInTheDocument();
      expect(screen.getByText('2023')).toBeInTheDocument();
      expect(screen.getByText('Movie')).toBeInTheDocument();
      expect(screen.getByText('Action, Adventure')).toBeInTheDocument();
      expect(screen.getByText(mockMovie.overview)).toBeInTheDocument();
      const rating = await screen.findByTestId('rating');
      expect(rating).toHaveTextContent('Rating: 8.5/10');
      expect(screen.getByText('1h 30m')).toBeInTheDocument();

      // Preferred Countries
      const preferredTable = screen.getByRole('table', {
        name: 'Available in Your Region',
      });
      const preferredLink = within(preferredTable).getByRole('link', {
        name: 'Watch',
      });
      expect(preferredLink).toHaveAttribute(
        'href',
        mockMovie.availability.preferredCountries[0].watchLink
      );
      expect(within(preferredTable).getByText('Yes')).toBeInTheDocument();
      expect(within(preferredTable).getByText('Hulu, Max')).toBeInTheDocument();

      // Other Countries
      const otherTable = screen.getByRole('table', { name: 'Other Countries' });
      const otherLink = within(otherTable).getByRole('link', { name: 'Watch' });
      expect(otherLink).toHaveAttribute('href', mockMovie.availability.otherCountries[0].watchLink);
    });
  });

  it('should render tv show details and availability correctly', async () => {
    mockFetch(mockTv);
    render(<ResultDetails title={{ id: mockTv.id, type: 'tv' }} />);

    await waitFor(async () => {
      expect(screen.getByText(mockTv.title)).toBeInTheDocument();
      expect(screen.getByText('2021')).toBeInTheDocument();
      expect(screen.getByText('TV Show')).toBeInTheDocument();
      expect(screen.getByText('Sci-Fi & Fantasy, Drama')).toBeInTheDocument();
      expect(screen.getByText(mockTv.overview)).toBeInTheDocument();
      const rating = await screen.findByTestId('rating');
      expect(rating).toHaveTextContent('Rating: 9.0/10');
      expect(screen.getByText('45m')).toBeInTheDocument();

      // Preferred Countries
      expect(screen.getByText('🇨🇦 Canada')).toBeInTheDocument();
      expect(screen.getAllByText('No')[0]).toBeInTheDocument(); // For Netflix
      expect(screen.getByText('Crave')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Watch' })).toHaveAttribute(
        'href',
        mockTv.availability.preferredCountries[0].watchLink
      );
    });
  });

  it('should show "No streaming availability found" when availability is empty', async () => {
    const movieWithoutAvailability = {
      ...mockMovie,
      availability: {
        preferredCountries: [],
        otherCountries: [],
      },
    };
    mockFetch(movieWithoutAvailability);
    render(<ResultDetails title={{ id: movieWithoutAvailability.id, type: 'movie' }} />);

    await waitFor(() => {
      expect(screen.getByText('No streaming availability found')).toBeInTheDocument();
    });
  });
});
