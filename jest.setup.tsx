import '@testing-library/jest-dom';
import 'whatwg-fetch';

// Mock next/image to render a simple img tag
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return <img {...props} />;
  },
}));
