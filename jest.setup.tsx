import '@testing-library/jest-dom';
import 'whatwg-fetch';

// Mock ResizeObserver for cmdk and other libraries
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollIntoView and other missing DOM methods
Element.prototype.scrollIntoView = jest.fn();

// Mock next/image to render a simple img tag
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return <img {...props} />;
  },
}));
