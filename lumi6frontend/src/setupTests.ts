import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from '@jest/globals';

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
}); 