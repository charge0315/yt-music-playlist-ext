/**
 * YouTube Music Playlist Extension - Utility Functions
 * 共通のヘルパー関数とユーティリティ
 */

/**
 * 待機関数
 * @param {number} ms - 待機時間（ミリ秒）
 * @returns {Promise<void>}
 */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * リトライ機能付きの非同期関数実行
 * @param {Function} fn - 実行する非同期関数
 * @param {number} maxRetries - 最大リトライ回数
 * @param {number} delay - リトライ間の待機時間（ミリ秒）
 * @returns {Promise<any>} - 関数の実行結果
 */
export const retryAsync = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`リトライ ${i + 1}/${maxRetries} 失敗:`, error.message);

      if (i < maxRetries - 1) {
        await wait(delay * (i + 1)); // 指数バックオフ
      }
    }
  }

  throw lastError;
};

/**
 * 配列を指定されたサイズのチャンクに分割
 * @param {Array} array - 分割する配列
 * @param {number} size - チャンクのサイズ
 * @returns {Array<Array>} - チャンクの配列
 */
export const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * レート制限付きの非同期処理実行
 * @param {Array} items - 処理するアイテムの配列
 * @param {Function} processor - 各アイテムを処理する非同期関数
 * @param {number} delayMs - 各処理間の待機時間（ミリ秒）
 * @returns {Promise<Array>} - 処理結果の配列
 */
export const processWithRateLimit = async (items, processor, delayMs = 500) => {
  const results = [];

  for (const item of items) {
    try {
      const result = await processor(item);
      results.push(result);
    } catch (error) {
      console.error('処理エラー:', error);
      results.push(null);
    }

    if (delayMs > 0) {
      await wait(delayMs);
    }
  }

  return results;
};

/**
 * タイムアウト付きPromise実行
 * @param {Promise} promise - 実行するPromise
 * @param {number} timeoutMs - タイムアウト時間（ミリ秒）
 * @returns {Promise<any>} - Promiseの実行結果
 */
export const withTimeout = (promise, timeoutMs) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('タイムアウトしました')), timeoutMs)
    ),
  ]);
};

/**
 * 安全なJSON解析
 * @param {string} jsonString - JSON文字列
 * @param {any} defaultValue - エラー時のデフォルト値
 * @returns {any} - パースされたオブジェクトまたはデフォルト値
 */
export const safeJSONParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON解析エラー:', error);
    return defaultValue;
  }
};

/**
 * エラーメッセージを整形
 * @param {Error|string} error - エラーオブジェクトまたは文字列
 * @returns {string} - 整形されたエラーメッセージ
 */
export const formatErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'エラーが発生しました';
};

/**
 * デバウンス関数
 * @param {Function} func - デバウンスする関数
 * @param {number} wait - 待機時間（ミリ秒）
 * @returns {Function} - デバウンスされた関数
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * スロットル関数
 * @param {Function} func - スロットルする関数
 * @param {number} limit - 実行間隔（ミリ秒）
 * @returns {Function} - スロットルされた関数
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * 再生回数の文字列を数値に変換
 * @param {string} viewString - "1.2M" や "500K" のような文字列
 * @returns {number} - 数値
 */
export const parseViewCount = (viewString) => {
  if (!viewString) return 0;

  const str = viewString.toString().toUpperCase();
  const multipliers = {
    K: 1000,
    M: 1000000,
    B: 1000000000,
  };

  const match = str.match(/([\d.]+)([KMB])?/);
  if (!match) return 0;

  const number = parseFloat(match[1]);
  const multiplier = multipliers[match[2]] || 1;

  return Math.floor(number * multiplier);
};

/**
 * 入力値のサニタイゼーション
 * @param {string} input - 入力文字列
 * @returns {string} - サニタイズされた文字列
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>"']/g, '').trim();
};

/**
 * キャッシュが有効かチェック
 * @param {number} timestamp - キャッシュのタイムスタンプ
 * @param {number} duration - キャッシュの有効期間（ミリ秒）
 * @returns {boolean} - キャッシュが有効かどうか
 */
export const isCacheValid = (timestamp, duration) => {
  if (!timestamp) return false;
  return Date.now() - timestamp < duration;
};

/**
 * ログ出力のヘルパー
 * @param {string} message - ログメッセージ
 * @param {string} level - ログレベル ('info', 'warn', 'error')
 * @param {any} data - 追加のデータ
 */
export const log = (message, level = 'info', data = null) => {
  const timestamp = new Date().toISOString();
  const prefix = `[YT Music Extension ${timestamp}]`;

  switch (level) {
  case 'error':
    console.error(prefix, message, data || '');
    break;
  case 'warn':
    console.warn(prefix, message, data || '');
    break;
  default:
    console.log(prefix, message, data || '');
  }
};

/**
 * Chrome storage からデータを取得（Promise版）
 * @param {string|string[]|Object} keys - 取得するキー
 * @returns {Promise<Object>} - 取得したデータ
 */
export const getStorage = (keys) => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, resolve);
  });
};

/**
 * Chrome storage にデータを保存（Promise版）
 * @param {Object} items - 保存するデータ
 * @returns {Promise<void>}
 */
export const setStorage = (items) => {
  return new Promise((resolve) => {
    chrome.storage.sync.set(items, resolve);
  });
};

/**
 * Chrome storage からデータを削除（Promise版）
 * @param {string|string[]} keys - 削除するキー
 * @returns {Promise<void>}
 */
export const removeStorage = (keys) => {
  return new Promise((resolve) => {
    chrome.storage.sync.remove(keys, resolve);
  });
};
