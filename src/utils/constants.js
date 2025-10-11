/**
 * YouTube Music Playlist Extension - Constants
 * API エンドポイント、設定値、デフォルト値などの定数定義
 */

// API エンドポイント
export const API_ENDPOINTS = {
  BROWSE: 'browse',
  PLAYLIST_CREATE: 'playlist/create',
  PLAYLIST_EDIT: 'browse/edit_playlist',
};

// Browse ID
export const BROWSE_IDS = {
  LIBRARY_ARTISTS: 'FEmusic_library_corpus_track_artists',
  PLAYLISTS: 'FEmusic_liked_playlists',
};

// レート制限・タイムアウト設定
export const RATE_LIMITS = {
  CHANNEL_FETCH_DELAY: 500, // ms
  SONG_ADD_DELAY: 300, // ms
  API_TIMEOUT: 30000, // ms
  PAGE_LOAD_RETRY: 10,
  PAGE_LOAD_RETRY_DELAY: 1000, // ms
};

// デフォルト設定
export const DEFAULT_SETTINGS = {
  SONGS_PER_CHANNEL: 3,
  PLAYLIST_NAME: 'Latest from Subscriptions',
  FETCH_MODE: 'latest',
  MIN_SONGS: 1,
  MAX_SONGS: 10,
};

// メッセージアクション
export const MESSAGE_ACTIONS = {
  PING: 'ping',
  LOG: 'log',
  ERROR: 'error',
  FETCH_LATEST: 'fetchLatestSongs',
  FETCH_POPULAR: 'fetchPopularSongs',
};

// カスタムイベント名
export const CUSTOM_EVENTS = {
  API_REQUEST: 'YTMUSIC_API_REQUEST',
  API_RESPONSE: 'YTMUSIC_API_RESPONSE',
};

// YouTube Music クライアント設定
export const YT_MUSIC_CLIENT = {
  CLIENT_NAME: 'WEB_REMIX',
  DEFAULT_VERSION: '1.20241008.01.00',
  GL: 'JP',
  HL: 'ja',
};

// エラーメッセージ
export const ERROR_MESSAGES = {
  NO_ACTIVE_TAB: 'アクティブなタブが見つかりません',
  NOT_YT_MUSIC: 'YouTube Musicのページで実行してください。\nhttps://music.youtube.com を開いてから再度お試しください。',
  CONTENT_SCRIPT_FAILED: 'Content scriptの読み込みに失敗しました。\nページをリロードしてから再度お試しください。',
  NOT_LOGGED_IN: 'YouTube Musicにログインしていません。\n\nhttps://music.youtube.com でログインしてから再度お試しください。',
  NO_CHANNELS: '登録チャンネルが見つかりませんでした。YouTube Musicで登録チャンネルがあるか確認してください。',
  NO_SONGS: '楽曲を取得できませんでした',
  PAGE_LOAD_FAILED: 'YouTube Musicの読み込みに失敗しました。ページをリロードしてから再度お試しください。',
  CONFIG_NOT_FOUND: 'YouTube Music API設定が見つかりません',
  API_KEY_NOT_FOUND: 'APIキーまたはコンテキストが見つかりません',
  TIMEOUT: 'API呼び出しがタイムアウトしました',
  PLAYLIST_ID_FAILED: 'プレイリストIDを取得できませんでした',
};

// ステータスタイプ
export const STATUS_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
};

// 再生回数の単位変換
export const VIEW_COUNT_MULTIPLIERS = {
  K: 1000,
  M: 1000000,
  B: 1000000000,
};

// キャッシュ設定
export const CACHE_CONFIG = {
  DURATION: 3600000, // 1時間 (ms)
  CHANNEL_KEY: 'cached_channels',
  TIMESTAMP_KEY: 'cache_timestamp',
};

// プログレスステップ
export const PROGRESS_STEPS = {
  INIT: { percent: 10, text: 'YouTube Musicにアクセス中...' },
  CHECK_SCRIPT: { percent: 20, text: 'content scriptを確認中...' },
  GET_CHANNELS: { percent: 30, text: '登録チャンネルを取得中...' },
  COMPLETE: { percent: 100, text: '完了しました' },
};
