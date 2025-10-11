// ユーティリティ関数

/**
 * リトライ機能付きの非同期関数実行
 * @param {Function} fn - 実行する非同期関数
 * @param {number} maxRetries - 最大リトライ回数
 * @param {number} delay - リトライ間の待機時間（ミリ秒）
 * @returns {Promise<any>} - 関数の実行結果
 */
const retryAsync = async (fn, maxRetries = 3, delay = 1000) => {
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
 * 待機関数
 * @param {number} ms - 待機時間（ミリ秒）
 * @returns {Promise<void>}
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 配列を指定されたサイズのチャンクに分割
 * @param {Array} array - 分割する配列
 * @param {number} size - チャンクのサイズ
 * @returns {Array<Array>} - チャンクの配列
 */
const chunkArray = (array, size) => {
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
const processWithRateLimit = async (items, processor, delayMs = 500) => {
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
const withTimeout = (promise, timeoutMs) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('タイムアウトしました')), timeoutMs)
    )
  ]);
};

/**
 * 安全なJSON解析
 * @param {string} jsonString - JSON文字列
 * @param {any} defaultValue - エラー時のデフォルト値
 * @returns {any} - パースされたオブジェクトまたはデフォルト値
 */
const safeJSONParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON解析エラー:', error);
    return defaultValue;
  }
};

/**
 * エラーメッセージを整形
 * @param {Error} error - エラーオブジェクト
 * @returns {string} - 整形されたエラーメッセージ
 */
const formatErrorMessage = (error) => {
  if (error.message) {
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
const debounce = (func, wait) => {
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
const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
