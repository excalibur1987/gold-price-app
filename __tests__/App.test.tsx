/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

beforeEach(() => {
  (globalThis as any).fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<div>24 Karat 300</div>'),
    }),
  );
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
