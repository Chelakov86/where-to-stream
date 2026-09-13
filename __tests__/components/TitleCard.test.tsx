import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TitleCard from '@/app/components/TitleCard';

describe('TitleCard', () => {
  it('links to the title page for the country', () => {
    render(
      <TitleCard
        title={{
          id: 1399,
          type: 'tv',
          title: 'Game of Thrones',
          year: 2011,
          rating: 8.46,
          posterUrl: 'https://image.tmdb.org/t/p/w342/got.jpg',
        }}
        country="DE"
      />
    );

    const link = screen.getByRole('link', { name: /Game of Thrones/ });
    expect(link).toHaveAttribute('href', '/title/tv/1399?country=DE');
    expect(link).toHaveTextContent('Series');
    expect(link).toHaveTextContent('2011');
    expect(link).toHaveTextContent('Rating8.5');
  });

  it('handles a missing poster, year and rating', () => {
    render(<TitleCard title={{ id: 1, type: 'movie', title: 'Unknown' }} country="US" />);

    const link = screen.getByRole('link', { name: /Unknown/ });
    expect(link).toHaveTextContent('Film');
    expect(link).toHaveTextContent('No poster');
    expect(link).toHaveTextContent('—');
    expect(link).not.toHaveTextContent('Rating');
  });
});
