import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Bookmark } from 'lucide-react';
import EmptyState from '@/app/components/EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders the description and action when provided', () => {
    render(
      <EmptyState
        title="Nothing here"
        description="Try a different filter."
        action={<button type="button">Reset</button>}
      />
    );
    expect(screen.getByText('Try a different filter.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('renders the icon when provided', () => {
    render(<EmptyState title="Nothing here" icon={Bookmark} />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('has no alert role for the neutral tone', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces the danger tone as an alert', () => {
    render(<EmptyState title="Something broke" tone="danger" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something broke');
  });
});
