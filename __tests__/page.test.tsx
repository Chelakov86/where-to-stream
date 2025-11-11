import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

describe('HomePage', () => {
  it('renders the main heading', () => {
    render(<HomePage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('WhereToStream');
  });

  it('renders the description text', () => {
    render(<HomePage />);
    expect(
      screen.getByText(/Find where your favorite movies and TV shows are streaming/i)
    ).toBeInTheDocument();
  });

  it('applies dark theme classes', () => {
    const { container } = render(<HomePage />);
    const main = container.querySelector('main');
    expect(main).toHaveClass('min-h-screen');
  });
});
