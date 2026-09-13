import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FiltersBar from '@/app/components/FiltersBar';
import { DEFAULT_SEARCH_PAGE_STATE, SearchPageState } from '@/app/utils/searchPageState';
import { mockGenres } from '../../test/mocks';

const renderBar = (overrides: Partial<SearchPageState> = {}, hasServices = false) => {
  const onChange = jest.fn();
  render(
    <FiltersBar
      state={{ ...DEFAULT_SEARCH_PAGE_STATE, ...overrides }}
      genres={mockGenres}
      hasServices={hasServices}
      onChange={onChange}
    />
  );
  return onChange;
};

describe('FiltersBar', () => {
  it('switches the media type', async () => {
    const onChange = renderBar();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Series' }));
    expect(onChange).toHaveBeenCalledWith({ type: 'tv' });
  });

  it('disables "only my services" until services are picked', async () => {
    renderBar();
    expect(screen.getByRole('switch', { name: 'Only my services' })).toBeDisabled();
  });

  it('toggles "only my services"', async () => {
    const onChange = renderBar({}, true);
    await userEvent.click(screen.getByRole('switch', { name: 'Only my services' }));
    expect(onChange).toHaveBeenCalledWith({ mine: true });
  });

  it('offers "Best match" only while searching', async () => {
    const onChange = renderBar();
    const sort = screen.getByRole('combobox', { name: 'Sort results' });
    expect(sort).toHaveValue('popularity');
    expect(screen.queryByRole('option', { name: 'Best match' })).not.toBeInTheDocument();

    await userEvent.selectOptions(sort, 'rating');
    expect(onChange).toHaveBeenCalledWith({ sort: 'rating' });
  });

  it('defaults to "Best match" for a search', () => {
    renderBar({ query: 'dune' });
    expect(screen.getByRole('combobox', { name: 'Sort results' })).toHaveValue('relevance');
  });

  it('picks genres and ratings from the filters popover', async () => {
    const onChange = renderBar({ genreIds: [12] });
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));

    await userEvent.click(screen.getByRole('button', { name: 'Action' }));
    expect(onChange).toHaveBeenCalledWith({ genreIds: [12, 28] });

    await userEvent.click(screen.getByRole('button', { name: 'Adventure' }));
    expect(onChange).toHaveBeenCalledWith({ genreIds: [] });

    await userEvent.click(screen.getByRole('button', { name: '7+' }));
    expect(onChange).toHaveBeenCalledWith({ minRating: 7 });
  });

  it('commits a year only once four digits are typed', async () => {
    const onChange = renderBar();
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));

    await userEvent.type(screen.getByLabelText('Year from'), '2019');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ yearFrom: 2019 });
  });

  it('shows the active filter count and resets filters', async () => {
    const onChange = renderBar({ genreIds: [28], minRating: 7, language: 'de' });
    const trigger = screen.getByRole('button', { name: /Filters/ });
    expect(trigger).toHaveTextContent('3');

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(onChange).toHaveBeenCalledWith({
      genreIds: [],
      yearFrom: undefined,
      yearTo: undefined,
      minRating: 0,
      language: '',
    });
  });
});
