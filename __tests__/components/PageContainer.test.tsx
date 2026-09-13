import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PageContainer from '@/app/components/PageContainer';

describe('PageContainer', () => {
  it('renders its children inside the centered content column', () => {
    render(
      <PageContainer>
        <p>Content</p>
      </PageContainer>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('merges a custom className with the default layout classes', () => {
    render(
      <PageContainer className="custom-class" data-testid="container">
        <p>Content</p>
      </PageContainer>
    );
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('custom-class');
    expect(container).toHaveClass('mx-auto');
  });

  it('forwards arbitrary HTML attributes', () => {
    render(<PageContainer data-testid="container" aria-label="Page" />);
    expect(screen.getByTestId('container')).toHaveAttribute('aria-label', 'Page');
  });
});
