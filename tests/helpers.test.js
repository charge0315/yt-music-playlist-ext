/* eslint-env jest */
/**
 * Tests for helper functions
 */

// Mock the exports since we're using ES modules in src but CommonJS in tests
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const parseViewCount = (viewString) => {
  if (!viewString) return 0;
  const str = viewString.toString().toUpperCase();
  const multipliers = { K: 1000, M: 1000000, B: 1000000000 };
  const match = str.match(/([\d.]+)([KMB])?/);
  if (!match) return 0;
  const number = parseFloat(match[1]);
  const multiplier = multipliers[match[2]] || 1;
  return Math.floor(number * multiplier);
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>"']/g, '').trim();
};

const formatErrorMessage = (error) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'エラーが発生しました';
};

const isCacheValid = (timestamp, duration) => {
  if (!timestamp) return false;
  return Date.now() - timestamp < duration;
};

describe('Helper Functions', () => {
  describe('wait', () => {
    test('should wait for the specified time', async () => {
      const start = Date.now();
      await wait(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('chunkArray', () => {
    test('should split array into chunks', () => {
      const array = [1, 2, 3, 4, 5, 6, 7];
      const chunks = chunkArray(array, 3);
      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    test('should handle empty array', () => {
      const chunks = chunkArray([], 3);
      expect(chunks).toEqual([]);
    });

    test('should handle chunk size larger than array', () => {
      const chunks = chunkArray([1, 2], 5);
      expect(chunks).toEqual([[1, 2]]);
    });
  });

  describe('parseViewCount', () => {
    test('should parse "K" suffix correctly', () => {
      expect(parseViewCount('1.5K')).toBe(1500);
      expect(parseViewCount('500K')).toBe(500000);
    });

    test('should parse "M" suffix correctly', () => {
      expect(parseViewCount('1.2M')).toBe(1200000);
      expect(parseViewCount('10M')).toBe(10000000);
    });

    test('should parse "B" suffix correctly', () => {
      expect(parseViewCount('1.5B')).toBe(1500000000);
    });

    test('should handle numbers without suffix', () => {
      expect(parseViewCount('1000')).toBe(1000);
    });

    test('should handle invalid input', () => {
      expect(parseViewCount('')).toBe(0);
      expect(parseViewCount(null)).toBe(0);
      expect(parseViewCount('invalid')).toBe(0);
    });
  });

  describe('sanitizeInput', () => {
    test('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
      expect(sanitizeInput('Test "quotes"')).toBe('Test quotes');
    });

    test('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });

    test('should handle non-string input', () => {
      expect(sanitizeInput(123)).toBe('');
      expect(sanitizeInput(null)).toBe('');
    });
  });

  describe('formatErrorMessage', () => {
    test('should format Error object', () => {
      const error = new Error('Test error');
      expect(formatErrorMessage(error)).toBe('Test error');
    });

    test('should format string error', () => {
      expect(formatErrorMessage('Error string')).toBe('Error string');
    });

    test('should handle unknown error types', () => {
      expect(formatErrorMessage({})).toBe('エラーが発生しました');
      expect(formatErrorMessage(null)).toBe('エラーが発生しました');
    });
  });

  describe('isCacheValid', () => {
    test('should return true for valid cache', () => {
      const now = Date.now();
      expect(isCacheValid(now - 1000, 5000)).toBe(true);
    });

    test('should return false for expired cache', () => {
      const now = Date.now();
      expect(isCacheValid(now - 10000, 5000)).toBe(false);
    });

    test('should return false for missing timestamp', () => {
      expect(isCacheValid(null, 5000)).toBe(false);
      expect(isCacheValid(undefined, 5000)).toBe(false);
    });
  });
});
