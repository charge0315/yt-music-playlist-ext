# API Documentation

YouTube Music Playlist Extension の内部API仕様とアーキテクチャドキュメント

## 目次

- [アーキテクチャ概要](#アーキテクチャ概要)
- [YouTube Music API](#youtube-music-api)
- [拡張機能のコンポーネント](#拡張機能のコンポーネント)
- [メッセージング](#メッセージング)
- [データフロー](#データフロー)
- [エラーハンドリング](#エラーハンドリング)

## アーキテクチャ概要

```
┌─────────────┐
│   Popup UI  │
│  (popup.js) │
└──────┬──────┘
       │ chrome.tabs.sendMessage
       ▼
┌─────────────────┐
│ Content Script  │
│  (content.js)   │
└────────┬────────┘
         │ CustomEvent
         ▼
┌──────────────────┐
│ Injected Script  │
│  (injected.js)   │
└────────┬─────────┘
         │ fetch
         ▼
┌──────────────────┐
│ YouTube Music    │
│   Internal API   │
└──────────────────┘
```

## YouTube Music API

### エンドポイント

YouTube Music は内部 API エンドポイント `https://music.youtube.com/youtubei/v1/{endpoint}` を使用します。

#### 1. browse

**用途**: コンテンツの取得（チャンネル、プレイリスト、ライブラリなど）

**リクエスト例**:
```javascript
{
  context: {
    client: {
      clientName: "WEB_REMIX",
      clientVersion: "1.20241008.01.00",
      gl: "JP",
      hl: "ja"
    }
  },
  browseId: "FEmusic_library_corpus_track_artists"
}
```

**レスポンス構造**:
```javascript
{
  contents: {
    singleColumnBrowseResultsRenderer: {
      tabs: [{
        tabRenderer: {
          content: {
            sectionListRenderer: {
              contents: [...]
            }
          }
        }
      }]
    }
  }
}
```

#### 2. playlist/create

**用途**: プレイリストの作成

**リクエスト例**:
```javascript
{
  context: {...},
  title: "My Playlist",
  description: "Auto-generated playlist",
  privacyStatus: "PRIVATE",
  videoIds: []
}
```

**レスポンス**:
```javascript
{
  playlistId: "PLxxxxxxxxxxxxxx"
}
```

#### 3. browse/edit_playlist

**用途**: プレイリストへの楽曲追加/削除

**リクエスト例**:
```javascript
{
  context: {...},
  playlistId: "PLxxxxxxxxxxxxxx",
  actions: [{
    action: "ACTION_ADD_VIDEO",
    addedVideoId: "xxxxxx"
  }]
}
```

### Browse IDs

| ID | 説明 |
|----|------|
| `FEmusic_library_corpus_track_artists` | ライブラリのアーティスト一覧 |
| `FEmusic_liked_playlists` | お気に入りプレイリスト |
| `UC{channel_id}` | 特定のチャンネル |

### API認証

YouTube Music API は Cookie ベースの認証を使用します:
- `SAPISID`, `HSID`, `SSID` などの Cookie が必要
- `credentials: 'include'` でリクエスト送信

## 拡張機能のコンポーネント

### 1. Popup (popup.js)

**役割**: ユーザーインターフェース

**主要機能**:
- 設定の読み込み・保存
- Content Script へのメッセージ送信
- 進捗状況の表示
- 結果の表示

**API**:
```javascript
class PopupController {
  constructor()
  async loadSettings()
  async saveSettings(settings)
  showStatus(message, type)
  showProgress(percent, text)
  showResults(songs)
}
```

### 2. Background Service Worker (background.js)

**役割**: バックグラウンド処理、ログ管理

**イベント**:
- `chrome.runtime.onInstalled`: インストール時の初期化
- `chrome.runtime.onMessage`: メッセージハンドリング
- `chrome.tabs.onUpdated`: タブ更新の監視

### 3. Content Script (content.js)

**役割**: YouTube Music ページでの主要ロジック実行

**主要関数**:

#### getSubscribedChannels()
```javascript
/**
 * @returns {Promise<Array<Channel>>} チャンネル一覧
 */
async function getSubscribedChannels()
```

#### getLatestSongsFromChannel(channel, count)
```javascript
/**
 * @param {Channel} channel
 * @param {number} count
 * @returns {Promise<Array<Song>>} 楽曲一覧
 */
async function getLatestSongsFromChannel(channel, count)
```

#### getPopularSongsFromChannel(channel, count)
```javascript
/**
 * @param {Channel} channel
 * @param {number} count
 * @returns {Promise<Array<Song>>} 人気曲一覧
 */
async function getPopularSongsFromChannel(channel, count)
```

#### getOrCreatePlaylist(playlistName)
```javascript
/**
 * @param {string} playlistName
 * @returns {Promise<Playlist>} プレイリスト
 */
async function getOrCreatePlaylist(playlistName)
```

#### addSongsToPlaylist(playlistId, songs)
```javascript
/**
 * @param {string} playlistId
 * @param {Array<Song>} songs
 * @returns {Promise<boolean>} 成功フラグ
 */
async function addSongsToPlaylist(playlistId, songs)
```

### 4. Injected Script (injected.js)

**役割**: ページコンテキストでの API 呼び出し

**処理フロー**:
1. `YTMUSIC_API_REQUEST` イベントを受信
2. `window.ytcfg` から API キーとコンテキストを取得
3. fetch で API 呼び出し
4. `YTMUSIC_API_RESPONSE` イベントで結果を返す

## メッセージング

### Popup → Content Script

```javascript
// メッセージ送信
chrome.tabs.sendMessage(tabId, {
  action: 'fetchLatestSongs',
  songsPerChannel: 3,
  playlistName: 'My Playlist'
});

// レスポンス
{
  success: true,
  totalSongs: 15,
  totalChannels: 5,
  playlistName: 'My Playlist',
  songs: [...]
}
```

### Content Script ↔ Injected Script

**リクエスト** (CustomEvent):
```javascript
document.dispatchEvent(new CustomEvent('YTMUSIC_API_REQUEST', {
  detail: {
    requestId: 'unique-id',
    endpoint: 'browse',
    body: {...}
  }
}));
```

**レスポンス** (CustomEvent):
```javascript
document.dispatchEvent(new CustomEvent('YTMUSIC_API_RESPONSE', {
  detail: {
    requestId: 'unique-id',
    success: true,
    data: {...}
  }
}));
```

## データフロー

### 楽曲取得の完全フロー

```
1. ユーザーがポップアップで「取得」ボタンをクリック
   ↓
2. Popup が Content Script にメッセージ送信
   ↓
3. Content Script が登録チャンネル一覧を取得
   ├─ Injected Script 経由で API 呼び出し
   └─ `browse` エンドポイント (FEmusic_library_corpus_track_artists)
   ↓
4. 各チャンネルから楽曲を取得
   ├─ 並列処理（レート制限付き）
   └─ `browse` エンドポイント (チャンネル ID)
   ↓
5. プレイリストを作成または取得
   ├─ 既存プレイリスト検索
   └─ なければ `playlist/create`
   ↓
6. プレイリストに楽曲を追加
   └─ `browse/edit_playlist`
   ↓
7. Content Script が Popup にレスポンス返送
   ↓
8. Popup が結果を表示
```

## エラーハンドリング

### エラーの種類

#### 1. 認証エラー
```javascript
{
  code: 'AUTH_ERROR',
  message: 'YouTube Musicにログインしていません'
}
```

#### 2. API エラー
```javascript
{
  code: 'API_ERROR',
  message: 'API呼び出しに失敗',
  statusCode: 400
}
```

#### 3. タイムアウトエラー
```javascript
{
  code: 'TIMEOUT_ERROR',
  message: 'API呼び出しがタイムアウトしました'
}
```

### リトライ戦略

```javascript
// 指数バックオフ
const retryAsync = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i < maxRetries - 1) {
        await wait(delay * (i + 1));
      } else {
        throw error;
      }
    }
  }
};
```

## パフォーマンス最適化

### 1. レート制限
```javascript
const RATE_LIMITS = {
  CHANNEL_FETCH_DELAY: 500, // ms
  SONG_ADD_DELAY: 300, // ms
};
```

### 2. 並列処理
```javascript
// チャンネルを5個ずつ並列処理
const chunks = chunkArray(channels, 5);
for (const chunk of chunks) {
  await Promise.all(chunk.map(processChannel));
}
```

### 3. キャッシング
```javascript
// チャンネル情報を1時間キャッシュ
const CACHE_DURATION = 3600000; // 1 hour
```

## 拡張方法

### 新しいフィルタの追加

```javascript
// 1. constants.js に追加
export const FILTERS = {
  GENRE: 'genre',
  RELEASE_DATE: 'releaseDate',
};

// 2. content.js に実装
async function filterSongsByGenre(songs, genre) {
  return songs.filter(song => song.genre === genre);
}

// 3. popup.js で UI 追加
```

### 新しいエンドポイントの追加

```javascript
// 1. constants.js
export const API_ENDPOINTS = {
  ...existing,
  NEW_ENDPOINT: 'new/endpoint',
};

// 2. content.js
async function callNewEndpoint(params) {
  return await callYTMusicAPI('new/endpoint', params);
}
```

## セキュリティ考慮事項

1. **XSS 対策**: すべての入力値をサニタイズ
2. **CSP**: Content Security Policy を適切に設定
3. **最小権限**: 必要最小限の権限のみ要求
4. **データ保護**: ユーザーデータをローカルのみに保存

## トラブルシューティング

### API キーが取得できない

**原因**: ページの読み込みが完了していない

**解決策**: `waitForPageLoad()` でリトライ

### プレイリストに追加できない

**原因**: レート制限

**解決策**: 1曲ずつ追加する フォールバック処理

### チャンネルが見つからない

**原因**: API レスポンス構造の変更

**解決策**: DOM から取得する フォールバック処理

## 参考資料

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [YouTube Music (非公式API情報)](https://github.com/sigma67/ytmusicapi)
