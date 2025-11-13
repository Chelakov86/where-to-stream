import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SearchHistory from '../../app/components/SearchHistory';
import { SearchHistoryItem } from '../../app/types';

const createHistoryItem = (
  id: number,
  type: 'movie' | 'tv',
  title: string,
  minutesAgo: number = 0,
  year?: number
): SearchHistoryItem => {
  const timestamp = Date.now() - minutesAgo * 60 * 1000;
  return {
    id,
    type,
    title,
    year,
    timestamp,
  };
};

describe('SearchHistory', () => {
  const mockOnSelectTitle = jest.fn();
  const mockOnRemoveItem = jest.fn();
  const mockOnClearHistory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render search history section', () => {
      render(
        <SearchHistory
          history={[]}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      expect(screen.getByText('Search History')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Show/ })).toBeInTheDocument();
    });

    it('should show empty message when history is empty and expanded', () => {
      render(
        <SearchHistory
          history={[]}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      const showButton = screen.getByRole('button', { name: /Show/ });
      fireEvent.click(showButton);

      expect(
        screen.getByText('No viewed titles yet. Titles you view will appear here.')
      ).toBeInTheDocument();
    });

    it('should not show Clear All button when history is empty', () => {
      render(
        <SearchHistory
          history={[]}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      // Expand to check even when expanded
      fireEvent.click(screen.getByRole('button', { name: /Show/ }));

      expect(
        screen.queryByRole('button', { name: /Clear all search history/ })
      ).not.toBeInTheDocument();
    });

    it('should not show Clear All button when collapsed', () => {
      const history = [createHistoryItem(1, 'movie', 'Test Movie', 0, 2020)];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      // When collapsed, Clear All should not be visible
      expect(
        screen.queryByRole('button', { name: /Clear all search history/ })
      ).not.toBeInTheDocument();
    });

    it('should show Clear All button when expanded and history has items', () => {
      const history = [createHistoryItem(1, 'movie', 'Test Movie', 0, 2020)];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      // Expand first
      fireEvent.click(screen.getByRole('button', { name: /Show/ }));

      // Now Clear All should be visible
      expect(screen.getByRole('button', { name: /Clear all search history/ })).toBeInTheDocument();
    });

    it('should render history items when expanded', () => {
      const history = [
        createHistoryItem(1, 'movie', 'First Movie', 10, 2020),
        createHistoryItem(2, 'tv', 'Second Show', 5, 2021),
      ];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      const showButton = screen.getByRole('button', { name: /Show/ });
      fireEvent.click(showButton);

      expect(screen.getByText(/First Movie/)).toBeInTheDocument();
      expect(screen.getByText(/Second Show/)).toBeInTheDocument();
    });

    it('should hide history items when collapsed', () => {
      const history = [createHistoryItem(1, 'movie', 'Test Movie', 0, 2020)];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      // Initially collapsed
      expect(screen.queryByText(/Test Movie/)).not.toBeInTheDocument();

      // Expand
      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      expect(screen.getByText(/Test Movie/)).toBeInTheDocument();

      // Collapse
      fireEvent.click(screen.getByRole('button', { name: /Hide/ }));
      expect(screen.queryByText(/Test Movie/)).not.toBeInTheDocument();
    });
  });

  describe('timestamp formatting', () => {
    it('should display "Just now" for very recent views', () => {
      const history = [createHistoryItem(1, 'movie', 'Recent Movie', 0, 2020)];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should display minutes ago for recent views', () => {
      const history = [createHistoryItem(1, 'movie', 'Recent Movie', 5, 2020)];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
    });

    it('should display hours ago for older views', () => {
      const history = [createHistoryItem(1, 'movie', 'Older Movie', 120, 2020)]; // 2 hours ago
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });

    it('should display "Yesterday" for views from yesterday', () => {
      const history = [createHistoryItem(1, 'movie', 'Yesterday Movie', 24 * 60, 2020)]; // 24 hours ago
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });
  });

  describe('title formatting', () => {
    it('should display title with type and year when all present', () => {
      const history = [createHistoryItem(1, 'movie', 'Test Movie', 0, 2020)];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      expect(screen.getByText(/Test Movie.*2020.*Movie/)).toBeInTheDocument();
    });

    it('should display type correctly for movies and TV shows', () => {
      const history = [
        createHistoryItem(1, 'movie', 'Movie Title', 0, 2020),
        createHistoryItem(2, 'tv', 'TV Show Title', 0, 2021),
      ];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      expect(screen.getByText(/Movie Title.*Movie/)).toBeInTheDocument();
      expect(screen.getByText(/TV Show Title.*TV Show/)).toBeInTheDocument();
    });

    it('should display title without year when year is not present', () => {
      const history = [createHistoryItem(1, 'movie', 'Movie Without Year', 0)];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      expect(screen.getByText(/Movie Without Year.*Movie/)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onSelectTitle when clicking a history item', () => {
      const history = [createHistoryItem(123, 'movie', 'Test Movie', 0, 2020)];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      const titleButton = screen.getByRole('button', {
        name: /View.*Test Movie/,
      });
      fireEvent.click(titleButton);

      expect(mockOnSelectTitle).toHaveBeenCalledTimes(1);
      expect(mockOnSelectTitle).toHaveBeenCalledWith(123, 'movie');
    });

    it('should call onRemoveItem when clicking delete button', async () => {
      const history = [createHistoryItem(123, 'movie', 'Test Movie', 0, 2020)];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      const deleteButton = screen.getByRole('button', {
        name: /Remove.*Test Movie/,
      });
      fireEvent.click(deleteButton);

      expect(mockOnRemoveItem).toHaveBeenCalledTimes(1);
      expect(mockOnRemoveItem).toHaveBeenCalledWith(0);
    });

    it('should call onClearHistory when clicking Clear All and user confirms', () => {
      // Mock window.confirm to return true
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      const history = [
        createHistoryItem(1, 'movie', 'First Movie', 0, 2020),
        createHistoryItem(2, 'tv', 'Second Show', 0, 2021),
      ];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      // Expand first
      fireEvent.click(screen.getByRole('button', { name: /Show/ }));

      const clearButton = screen.getByRole('button', {
        name: /Clear all search history/,
      });
      fireEvent.click(clearButton);

      expect(window.confirm).toHaveBeenCalledTimes(1);
      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to clear all viewed titles from your history? This action cannot be undone.'
      );
      expect(mockOnClearHistory).toHaveBeenCalledTimes(1);

      // Restore original confirm
      window.confirm = originalConfirm;
    });

    it('should not call onClearHistory when user cancels confirmation', () => {
      // Mock window.confirm to return false
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => false);

      const history = [
        createHistoryItem(1, 'movie', 'First Movie', 0, 2020),
        createHistoryItem(2, 'tv', 'Second Show', 0, 2021),
      ];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      // Expand first
      fireEvent.click(screen.getByRole('button', { name: /Show/ }));

      const clearButton = screen.getByRole('button', {
        name: /Clear all search history/,
      });
      fireEvent.click(clearButton);

      expect(window.confirm).toHaveBeenCalledTimes(1);
      expect(mockOnClearHistory).not.toHaveBeenCalled();

      // Restore original confirm
      window.confirm = originalConfirm;
    });

    it('should show delete button on hover', async () => {
      const history = [createHistoryItem(123, 'movie', 'Test Movie', 0, 2020)];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      const historyItem = screen.getByText(/Test Movie/).closest('div');
      expect(historyItem).toBeInTheDocument();

      // Delete button should be hidden initially (opacity-0)
      const deleteButton = screen.getByRole('button', {
        name: /Remove.*Test Movie/,
      });
      expect(deleteButton).toHaveClass('opacity-0');
    });
  });

  describe('display limits', () => {
    it('should show only first 10 items by default', () => {
      const history = Array.from({ length: 15 }, (_, i) =>
        createHistoryItem(i, 'movie', `Movie ${i}`, 0, 2000 + i)
      );
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      expect(screen.getByText(/Movie 0/)).toBeInTheDocument();
      expect(screen.getByText(/Movie 9/)).toBeInTheDocument();
      expect(screen.queryByText(/Movie 10/)).not.toBeInTheDocument();
      expect(screen.getByText(/Show 5 more/)).toBeInTheDocument();
    });

    it('should show all items when "Show more" is clicked', () => {
      const history = Array.from({ length: 15 }, (_, i) =>
        createHistoryItem(i, 'movie', `Movie ${i}`, 0, 2000 + i)
      );
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      fireEvent.click(screen.getByRole('button', { name: /Show 5 more/ }));

      expect(screen.getByText(/Movie 0/)).toBeInTheDocument();
      expect(screen.getByText(/Movie 14/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Show less/ })).toBeInTheDocument();
    });

    it('should hide "Show more" button when all items are displayed', () => {
      const history = Array.from({ length: 5 }, (_, i) =>
        createHistoryItem(i, 'movie', `Movie ${i}`, 0, 2000 + i)
      );
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));
      expect(screen.queryByRole('button', { name: /Show.*more/ })).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const history = [createHistoryItem(123, 'movie', 'Test Movie', 0, 2020)];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /Show/ });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      expect(toggleButton).toHaveAttribute('aria-controls', 'search-history-list');

      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have accessible labels for all buttons', () => {
      const history = [createHistoryItem(123, 'movie', 'Test Movie', 0, 2020)];
      render(
        <SearchHistory
          history={history}
          onSelectTitle={mockOnSelectTitle}
          onRemoveItem={mockOnRemoveItem}
          onClearHistory={mockOnClearHistory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Show/ }));

      expect(screen.getByRole('button', { name: /View.*Test Movie/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Remove.*Test Movie/ })).toBeInTheDocument();
      // Clear All button should be visible when expanded
      expect(screen.getByRole('button', { name: /Clear all search history/ })).toBeInTheDocument();
    });
  });
});
