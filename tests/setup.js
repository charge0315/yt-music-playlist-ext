/* eslint-env jest */
/**
 * Jest Setup File
 * Mock Chrome APIs and global objects
 */

// Mock Chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
    getURL: jest.fn((path) => `chrome-extension://fake-id/${path}`),
  },
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        callback && callback({});
        return Promise.resolve({});
      }),
      set: jest.fn((items, callback) => {
        callback && callback();
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        callback && callback();
        return Promise.resolve();
      }),
    },
    local: {
      get: jest.fn((keys, callback) => {
        callback && callback({});
        return Promise.resolve({});
      }),
      set: jest.fn((items, callback) => {
        callback && callback();
        return Promise.resolve();
      }),
    },
  },
  tabs: {
    query: jest.fn(() => Promise.resolve([])),
    sendMessage: jest.fn(() => Promise.resolve({})),
    onUpdated: {
      addListener: jest.fn(),
    },
  },
  scripting: {
    executeScript: jest.fn(() => Promise.resolve([])),
  },
};

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
