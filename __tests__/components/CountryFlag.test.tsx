import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CountryFlag from '@/app/components/CountryFlag';

describe('CountryFlag', () => {
  it('renders a flag image for a valid country code', () => {
    render(<CountryFlag code="DE" />);
    const img = document.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://flagcdn.com/w40/de.png');
  });

  it('applies a custom className alongside the defaults', () => {
    render(<CountryFlag code="US" className="custom-class" />);
    const img = document.querySelector('img');
    expect(img).toHaveClass('custom-class');
    expect(img).toHaveClass('rounded-[2px]');
  });

  it('renders nothing for an invalid country code', () => {
    const { container } = render(<CountryFlag code="INVALID" />);
    expect(container).toBeEmptyDOMElement();
  });
});
