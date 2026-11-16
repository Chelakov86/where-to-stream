import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FiltersBar from '@/app/components/FiltersBar';
import { DEFAULT_SEARCH_PAGE_STATE, SearchPageState } from '@/app/utils/searchPageState';
import { mockGenres } from '../mocks';

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

const renderLiveBar = (overrides: Partial<SearchPageState> = {}) => {
  const onChange = jest.fn();
  const Harness = () => {
    const [state, setState] = useState({ ...DEFAULT_SEARCH_PAGE_STATE, ...overrides });
    return (
      <FiltersBar
        state={state}
        genres={mockGenres}
        hasServices={false}
        onChange={(patch) => {
          onChange(patch);
          setState((current) => ({ ...current, ...patch }));
        }}
      />
    );
  };
  render(<Harness />);
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

describe('year drafts', () => {
  it('restores 2010 after deleting its last digit and tabbing away', async () => {
    const onChange = renderLiveBar({ yearFrom: 2010 });
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const from = screen.getByLabelText('Year from');
    await userEvent.click(from);
    await userEvent.keyboard('{End}{Backspace}');
    expect(from).toHaveValue('201');
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(from).toHaveValue('2010');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('restores an unset partial year to empty on blur', async () => {
    const onChange = renderLiveBar();
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    await userEvent.type(screen.getByLabelText('Year to'), '201');
    await userEvent.tab();
    expect(screen.getByLabelText('Year to')).toHaveValue('');
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(['Escape', 'outside'])('discards partial drafts on %s dismissal', async (dismiss) => {
    const onChange = renderLiveBar({ yearFrom: 2010 });
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    await userEvent.click(screen.getByLabelText('Year from'));
    await userEvent.keyboard('{End}{Backspace}');
    if (dismiss === 'Escape') await userEvent.keyboard('{Escape}');
    else await userEvent.click(screen.getByRole('combobox', { name: 'Sort results' }));
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    expect(screen.getByLabelText('Year from')).toHaveValue('2010');
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(['Year from', 'Year to'])('clears %s immediately', async (label) => {
    const onChange = renderLiveBar({ yearFrom: 2010, yearTo: 2020 });
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    await userEvent.clear(screen.getByLabelText(label));
    expect(screen.getByLabelText(label)).toHaveValue('');
    expect(onChange).toHaveBeenCalledWith({
      [label === 'Year from' ? 'yearFrom' : 'yearTo']: undefined,
    });
  });

  it('blocks inversion and commits both pending years when the other bound corrects it', async () => {
    const onChange = renderLiveBar({ yearFrom: 2010, yearTo: 2020 });
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const from = screen.getByLabelText('Year from');
    const to = screen.getByLabelText('Year to');
    await userEvent.click(from);
    await userEvent.keyboard('{Control>}a{/Control}2030');
    expect(from).toHaveValue('2030');
    expect(onChange).not.toHaveBeenCalled();
    expect(from).toHaveAttribute('aria-invalid', 'true');
    expect(to).toHaveAccessibleDescription(/Change either year/);
    await userEvent.click(to);
    await userEvent.keyboard('{Control>}a{/Control}2040');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ yearFrom: 2030, yearTo: 2040 });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(from).toHaveValue('2030');
    expect(to).toHaveValue('2040');
  });

  it('allows a rejected year to be corrected back to the active bound', async () => {
    const onChange = renderLiveBar({ yearFrom: 2010, yearTo: 2020 });
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const to = screen.getByLabelText('Year to');
    await userEvent.click(to);
    await userEvent.keyboard('{Control>}a{/Control}2000');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.keyboard('{Control>}a{/Control}2020');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(to).toHaveValue('2020');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('resets rejected drafts and responds to external year values', async () => {
    const props = { genres: mockGenres, hasServices: false, onChange: jest.fn() };
    const { rerender } = render(
      <FiltersBar
        {...props}
        state={{ ...DEFAULT_SEARCH_PAGE_STATE, yearFrom: 2010, yearTo: 2020 }}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    await userEvent.click(screen.getByLabelText('Year to'));
    await userEvent.keyboard('{Control>}a{/Control}2000');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(
      <FiltersBar
        {...props}
        state={{ ...DEFAULT_SEARCH_PAGE_STATE, yearFrom: 1990, yearTo: 2000 }}
      />
    );
    expect(screen.getByLabelText('Year from')).toHaveValue('1990');
    expect(screen.getByLabelText('Year to')).toHaveValue('2000');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    rerender(<FiltersBar {...props} state={DEFAULT_SEARCH_PAGE_STATE} />);
    expect(screen.getByLabelText('Year from')).toHaveValue('');
    expect(screen.getByLabelText('Year to')).toHaveValue('');
  });
});
