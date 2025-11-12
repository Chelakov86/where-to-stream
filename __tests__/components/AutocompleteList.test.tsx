import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AutocompleteList, AutocompleteItem } from '../../app/components/AutocompleteList';

const mockItems: AutocompleteItem[] = [
  { id: 1, type: 'movie', title: 'Inception', year: 2010, posterUrl: '/poster1.jpg' },
  { id: 2, type: 'tv', title: 'Breaking Bad', year: 2008, posterUrl: '/poster2.jpg' },
  { id: 3, type: 'movie', title: 'The Dark Knight', year: 2008 },
];

describe('AutocompleteList', () => {
  const onSelect = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    onSelect.mockClear();
    onClose.mockClear();
  });

  it('renders a list of items when open and items are provided', () => {
    render(
      <AutocompleteList items={mockItems} isOpen={true} onSelect={onSelect} onClose={onClose} />
    );
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
    expect(screen.getByText('The Dark Knight')).toBeInTheDocument();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AutocompleteList items={mockItems} isOpen={false} onSelect={onSelect} onClose={onClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when items is empty', () => {
    const { container } = render(
      <AutocompleteList items={[]} isOpen={true} onSelect={onSelect} onClose={onClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls onSelect with the correct item when an item is clicked', () => {
    render(
      <AutocompleteList items={mockItems} isOpen={true} onSelect={onSelect} onClose={onClose} />
    );
    fireEvent.click(screen.getByText('Breaking Bad'));
    expect(onSelect).toHaveBeenCalledWith(mockItems[1]);
  });

  it('highlights item on mouse enter and calls onSelect with the correct item on click', () => {
    render(
      <AutocompleteList items={mockItems} isOpen={true} onSelect={onSelect} onClose={onClose} />
    );
    const secondItem = screen.getByText('Breaking Bad').closest('li');
    expect(secondItem).not.toHaveClass('bg-gray-700');
    fireEvent.mouseEnter(secondItem!);
    expect(secondItem).toHaveClass('bg-gray-700');
    fireEvent.click(secondItem!);
    expect(onSelect).toHaveBeenCalledWith(mockItems[1]);
  });

  it('handles keyboard navigation and selection', () => {
    const { container } = render(
      <AutocompleteList items={mockItems} isOpen={true} onSelect={onSelect} onClose={onClose} />
    );
    const input = container.querySelector('ul'); // The list itself will capture these events

    // No item is highlighted initially
    expect(screen.getByText('Inception').closest('li')).not.toHaveClass('bg-gray-700');

    // Press down arrow, first item should be highlighted
    fireEvent.keyDown(input!, { key: 'ArrowDown' });
    expect(screen.getByText('Inception').closest('li')).toHaveClass('bg-gray-700');

    // Press down arrow, second item should be highlighted
    fireEvent.keyDown(input!, { key: 'ArrowDown' });
    expect(screen.getByText('Inception').closest('li')).not.toHaveClass('bg-gray-700');
    expect(screen.getByText('Breaking Bad').closest('li')).toHaveClass('bg-gray-700');

    // Press up arrow, first item should be highlighted again
    fireEvent.keyDown(input!, { key: 'ArrowUp' });
    expect(screen.getByText('Inception').closest('li')).toHaveClass('bg-gray-700');
    expect(screen.getByText('Breaking Bad').closest('li')).not.toHaveClass('bg-gray-700');

    // Press Enter, onSelect should be called with the first item
    fireEvent.keyDown(input!, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(mockItems[0]);
  });

  it('calls onClose when Escape is pressed', () => {
    const { container } = render(
      <AutocompleteList items={mockItems} isOpen={true} onSelect={onSelect} onClose={onClose} />
    );
    const input = container.querySelector('ul');
    fireEvent.keyDown(input!, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('wraps around when navigating with arrow keys', () => {
    const { container } = render(
      <AutocompleteList items={mockItems} isOpen={true} onSelect={onSelect} onClose={onClose} />
    );
    const input = container.querySelector('ul');

    // Press up arrow, last item should be highlighted
    fireEvent.keyDown(input!, { key: 'ArrowUp' });
    expect(screen.getByText('The Dark Knight').closest('li')).toHaveClass('bg-gray-700');

    // Press down arrow, first item should be highlighted
    fireEvent.keyDown(input!, { key: 'ArrowDown' });
    expect(screen.getByText('Inception').closest('li')).toHaveClass('bg-gray-700');
  });

  it('uses listbox semantics with options reflecting the highlighted state', () => {
    render(
      <AutocompleteList
        items={mockItems}
        isOpen={true}
        onSelect={onSelect}
        onClose={onClose}
        id="suggestions"
      />
    );

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('id', 'suggestions');

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(mockItems.length);
    options.forEach((option) => {
      expect(option).toHaveAttribute('aria-selected');
    });

    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
  });
});
