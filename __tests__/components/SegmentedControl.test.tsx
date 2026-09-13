import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SegmentedControl from '@/app/components/SegmentedControl';

const options = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'Series' },
] as const;

describe('SegmentedControl', () => {
  it('renders a labeled group with one button per option', () => {
    render(<SegmentedControl label="Type" options={options} value="all" onChange={jest.fn()} />);
    const group = screen.getByRole('group', { name: 'Type' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('marks the current value as pressed', () => {
    render(<SegmentedControl label="Type" options={options} value="movie" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Movies' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the selected value', async () => {
    const onChange = jest.fn();
    render(<SegmentedControl label="Type" options={options} value="all" onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Series' }));

    expect(onChange).toHaveBeenCalledWith('tv');
  });
});
