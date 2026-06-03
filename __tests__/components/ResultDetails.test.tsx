import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
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

type ResultDetailsProps = ComponentProps<typeof ResultDetails>;

const renderResultDetails = async (props: ResultDetailsProps) => {
  await act(async () => {
    render(<ResultDetails {...props} />);
  });
};

describe('ResultDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a loading indicator', () => {
    (fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<ResultDetails title={{ id: 123, type: 'movie' }} />);
    expect(screen.getByRole('status', { name: /loading title details/i })).toBeInTheDocument();
  });

  it('should show an error message on fetch failure', async () => {
    mockFetch({}, false);
    const handleError = jest.fn();
    await renderResultDetails({ title: { id: 123, type: 'movie' }, onError: handleError });
    expect(
      await screen.findByText(
        "We're having trouble fetching data right now. Please try again later."
      )
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(handleError).toHaveBeenCalledWith(
        "We're having trouble fetching data right now. Please try again later."
      )
    );
  });

  it('should render movie details and availability correctly', async () => {
    mockFetch(mockMovie);
    await renderResultDetails({ title: { id: mockMovie.id, type: 'movie' } });

    expect(await screen.findByText(mockMovie.title)).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('Movie')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Adventure')).toBeInTheDocument();
    expect(screen.getByText(mockMovie.overview)).toBeInTheDocument();
    expect(await screen.findByTestId('rating')).toHaveTextContent('8.5/10');
    expect(screen.getByText('1h 30m')).toBeInTheDocument();

    const userCountryTable = await screen.findByRole('table', {
      name: 'Available in Your Country (United States)',
    });
    const userCountryLink = within(userCountryTable).getByRole('link', {
      name: 'Watch',
    });
    expect(userCountryLink).toHaveAttribute('href', mockMovie.availability.userCountry!.watchLink);
    // Check for free and paid providers
    expect(within(userCountryTable).getByText('Pluto TV, Tubi')).toBeInTheDocument();
    expect(within(userCountryTable).getByText('Hulu, Max, Netflix')).toBeInTheDocument();

    // "Other Countries" is collapsed by default — expand it first
    const showButton = await screen.findByRole('button', { name: /available in.*other/i });
    fireEvent.click(showButton);

    const otherTable = await screen.findByRole('table', { name: 'Other Countries' });
    const otherLink = within(otherTable).getByRole('link', { name: 'Watch' });
    expect(otherLink).toHaveAttribute('href', mockMovie.availability.otherCountries[0].watchLink);
  });

  it('should render tv show details and availability correctly', async () => {
    mockFetch(mockTv);
    await renderResultDetails({ title: { id: mockTv.id, type: 'tv' } });

    expect(await screen.findByText(mockTv.title)).toBeInTheDocument();
    expect(screen.getByText('2021')).toBeInTheDocument();
    expect(screen.getByText('TV Show')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi & Fantasy')).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
    expect(screen.getByText(mockTv.overview)).toBeInTheDocument();
    expect(await screen.findByTestId('rating')).toHaveTextContent('9.0/10');
    expect(screen.getByText('45m')).toBeInTheDocument();

    // Check for Canada - emoji and name may be in separate elements
    expect((await screen.findAllByText(/Canada/)).length).toBeGreaterThan(0);
    // Verify flag image is present by alt text
    const canadaFlags = await screen.findAllByAltText('Canada flag');
    expect(canadaFlags.length).toBeGreaterThan(0);

    // Check that at least one of them is an image
    const flagImage = canadaFlags[0] as HTMLImageElement;
    expect(flagImage.src).toContain('ca.png');

    // Canada has no free providers (shows "-") and Crave as paid provider
    expect(screen.getAllByText('-').length).toBeGreaterThan(0); // For empty free providers
    expect(screen.getAllByText('Crave').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Watch' })).toHaveAttribute(
      'href',
      mockTv.availability.userCountry!.watchLink
    );
  });

  it('uses a level 2 heading for the details title', async () => {
    mockFetch(mockMovie);
    await renderResultDetails({ title: { id: mockMovie.id, type: 'movie' } });

    expect(
      await screen.findByRole('heading', { level: 2, name: mockMovie.title })
    ).toBeInTheDocument();
  });

  it('should show "No streaming availability found" when availability is empty', async () => {
    const movieWithoutAvailability = {
      ...mockMovie,
      detectedCountry: null,
      availability: {
        userCountry: null,
        otherCountries: [],
      },
    };
    mockFetch(movieWithoutAvailability);
    await renderResultDetails({
      title: { id: movieWithoutAvailability.id, type: 'movie' },
    });

    expect(await screen.findByText('No streaming availability found.')).toBeInTheDocument();
  });
});
