/**
 * Type Definitions for YouTube Music Playlist Extension
 * JSDoc type definitions for better IDE support and documentation
 */

/**
 * @typedef {Object} Channel
 * @property {string} id - チャンネルID
 * @property {string} name - チャンネル名
 * @property {string} browseId - Browse ID (YouTube Music内部ID)
 */

/**
 * @typedef {Object} Song
 * @property {string} title - 曲のタイトル
 * @property {string} channel - チャンネル名
 * @property {string} channelId - チャンネルID
 * @property {string} videoId - ビデオID
 * @property {string} url - 曲のURL
 * @property {number} [viewCount] - 再生回数（オプション）
 */

/**
 * @typedef {Object} Playlist
 * @property {string} id - プレイリストID
 * @property {string} name - プレイリスト名
 * @property {string} [browseId] - Browse ID（オプション）
 * @property {string} [description] - プレイリストの説明（オプション）
 */

/**
 * @typedef {Object} YTMusicConfig
 * @property {string} apiKey - YouTube Music APIキー
 * @property {YTMusicContext} context - APIコンテキスト
 */

/**
 * @typedef {Object} YTMusicContext
 * @property {YTMusicClient} client - クライアント情報
 */

/**
 * @typedef {Object} YTMusicClient
 * @property {string} clientName - クライアント名 (例: "WEB_REMIX")
 * @property {string} clientVersion - クライアントバージョン
 * @property {string} gl - 地域コード (例: "JP")
 * @property {string} hl - 言語コード (例: "ja")
 */

/**
 * @typedef {Object} APIRequestEvent
 * @property {string} requestId - リクエストID
 * @property {string} endpoint - APIエンドポイント
 * @property {Object} body - リクエストボディ
 */

/**
 * @typedef {Object} APIResponseEvent
 * @property {string} requestId - リクエストID
 * @property {boolean} success - 成功フラグ
 * @property {Object} [data] - レスポンスデータ（成功時）
 * @property {string} [error] - エラーメッセージ（失敗時）
 */

/**
 * @typedef {Object} FetchResult
 * @property {boolean} success - 成功フラグ
 * @property {number} [totalSongs] - 取得した曲の総数（成功時）
 * @property {number} [totalChannels] - 処理したチャンネル数（成功時）
 * @property {string} [playlistName] - プレイリスト名（成功時）
 * @property {Array<SimpleSong>} [songs] - 取得した曲のリスト（成功時）
 * @property {string} [error] - エラーメッセージ（失敗時）
 */

/**
 * @typedef {Object} SimpleSong
 * @property {string} channel - チャンネル名
 * @property {string} title - 曲のタイトル
 */

/**
 * @typedef {Object} ExtensionSettings
 * @property {number} songsPerChannel - 各チャンネルから取得する曲数
 * @property {string} playlistName - プレイリスト名
 * @property {'latest'|'popular'} fetchMode - 取得モード
 */

/**
 * @typedef {Object} MessageRequest
 * @property {string} action - アクション名
 * @property {number} [songsPerChannel] - 各チャンネルから取得する曲数
 * @property {string} [playlistName] - プレイリスト名
 * @property {string} [message] - ログメッセージ
 */

/**
 * @typedef {Object} LogMessage
 * @property {string} action - 'log' または 'error'
 * @property {string} message - ログメッセージ
 * @property {Object} [data] - 追加データ
 * @property {string} [timestamp] - タイムスタンプ
 */

/**
 * @typedef {Object} CacheData
 * @property {Array<Channel>} channels - キャッシュされたチャンネル一覧
 * @property {number} timestamp - キャッシュのタイムスタンプ
 */

/**
 * @typedef {'info'|'success'|'error'|'warning'} StatusType
 */

/**
 * @typedef {Object} ProgressInfo
 * @property {number} percent - 進捗率（0-100）
 * @property {string} text - 進捗メッセージ
 */

export {};
