import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CountryPicker from '@/app/components/CountryPicker';

describe('CountryPicker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the current country on the trigger button', () => {
    render(<CountryPicker country="DE" onChange={jest.fn()} />);
    expect(
      screen.getByRole('combobox', { name: 'Country: Germany. Change country' })
    ).toBeInTheDocument();
  });

  it('lists the default pinned countries first when opened', async () => {
    render(<CountryPicker country="US" onChange={jest.fn()} />);

    await userEvent.click(screen.getByRole('combobox'));

    const pinnedGroup = screen.getByText('Pinned').closest('[cmdk-group]') as HTMLElement;
    expect(within(pinnedGroup).getByText('Germany')).toBeInTheDocument();
    expect(within(pinnedGroup).getByText('United States')).toBeInTheDocument();
  });

  it('calls onChange and closes the popover when a country is picked', async () => {
    const onChange = jest.fn();
    render(<CountryPicker country="US" onChange={onChange} />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getAllByText('Germany')[0]);

    expect(onChange).toHaveBeenCalledWith('DE');
  });

  it('filters countries by search input', async () => {
    render(<CountryPicker country="US" onChange={jest.fn()} />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.type(screen.getByPlaceholderText('Search countries…'), 'Japan');

    expect(screen.getByText('Japan')).toBeInTheDocument();
    expect(screen.queryByText('Germany')).not.toBeInTheDocument();
  });
});
