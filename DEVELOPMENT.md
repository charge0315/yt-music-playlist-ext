# 開発ドキュメント

## 🚀 開発環境セットアップ

### 必要な環境
- Node.js 16.0+
- npm または yarn
- Chrome ブラウザ

### インストール
```bash
# リポジトリをクローン
git clone https://github.com/charge0315/yt-music-playlist-ext.git
cd yt-music-playlist-ext

# 依存関係をインストール
npm install

# 開発ビルド
npm run build

# テスト実行
npm test

# リント実行
npm run lint
```

## 📁 プロジェクト構造

```
yt-music-playlist-ext/
├── manifest.json          # Chrome拡張機能マニフェスト
├── popup.html/js/css      # ユーザーインターフェース
├── content.js             # YouTube Music連携スクリプト
├── injected.js            # ページ内API呼び出し
├── background.js          # バックグラウンドスクリプト
├── utils.js               # ユーティリティ関数
├── create_icons.py        # アイコン生成スクリプト
├── icons/                 # 拡張機能アイコン
├── src/                   # ソースコード構造
├── tests/                 # テストファイル
├── scripts/               # ビルドスクリプト
└── dist/                  # ビルド出力先
```

## 🛠️ 主要コンポーネント

### Content Script (`content.js`)
- YouTube Music登録チャンネル取得
- 楽曲検索とプレイリスト作成
- YouTube Music内部API連携

### Injected Script (`injected.js`)
- SAPISID認証
- YouTube Music API直接呼び出し
- ページコンテキスト内での実行

### Popup Interface (`popup.js`)
- ユーザー設定管理
- プレイリスト作成トリガー
- 進捗表示とエラーハンドリング

## 🧪 テスト

```bash
# 全テスト実行
npm test

# 監視モード
npm run test:watch

# カバレッジ
npm run test:coverage
```

## 📦 ビルド

```bash
# 本番ビルド
npm run build

# 監視モード（開発用）
npm run watch
```

## 🔧 API仕様

### YouTube Music内部API
- エンドポイント: `youtubei/v1/*`
- 認証: SAPISID
- 主要API: `search`, `browse`, `browse/edit_playlist`

### フォールバック戦略
1. `browse/edit_playlist` (推奨)
2. `playlist/get_add_to_playlist`
3. `browse/add_to_playlist`
4. `playlist/add_videos` (非推奨)

## 🐛 デバッグ

Chrome DevToolsで以下を確認：
- Console: ログとエラーメッセージ
- Network: API呼び出し
- Extensions: 拡張機能の状態

```javascript
// ログレベル設定
localStorage.setItem('ytm-playlist-debug', 'true');
```

## 🤝 コントリビューション

1. Issueで議論
2. フォーク
3. 機能ブランチ作成
4. テスト追加
5. プルリクエスト作成

詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照。
    method: 'POST',
    body: JSON.stringify({ context, ...body }),
    credentials: 'include'
  }
);
```

#### 主要エンドポイント

- `browse` - コンテンツの取得（チャンネル、プレイリストなど）
- `playlist/create` - プレイリストの作成
- `browse/edit_playlist` - プレイリストの編集

#### データフロー

1. `getSubscribedChannels()` - 登録チャンネル一覧を取得
2. `getLatestSongsFromChannel()` - 各チャンネルから最新曲を取得
3. `getOrCreatePlaylist()` - プレイリストを作成または取得
4. `addSongsToPlaylist()` - プレイリストに楽曲を追加

### 4. Utilities (utils.js)

共通のユーティリティ関数：
- リトライロジック
- レート制限
- タイムアウト処理
- エラーハンドリング

## YouTube Music API構造

### レスポンス構造の例

登録チャンネル取得のレスポンス：
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

### browseId の種類

- `FEmusic_library_corpus_track_artists` - ライブラリのアーティスト
- `FEmusic_liked_playlists` - お気に入りプレイリスト
- `UC...` - チャンネルID
- `VL...` - プレイリストID

## デバッグ方法

### 1. コンソールログの確認

Chrome DevToolsでYouTube Musicページのコンソールを開き、以下を確認：
```javascript
// YouTube Music設定の確認
console.log(window.ytcfg);

// APIキーの確認
console.log(window.ytcfg.data_.INNERTUBE_API_KEY);
```

### 2. ネットワークタブの監視

DevToolsのNetworkタブで `youtubei` をフィルタリングして、
実際のAPI呼び出しとレスポンスを確認できます。

### 3. 拡張機能のログ

バックグラウンドページのコンソールを確認：
1. `chrome://extensions/` を開く
2. 「サービスワーカー」のリンクをクリック
3. ログが表示されます

## 既知の制限事項

### 1. 非公式API

YouTube Musicの公式APIは存在しません。
この拡張機能は内部APIを使用しているため、
YouTubeの仕様変更により動作しなくなる可能性があります。

### 2. レート制限

過度なAPI呼び出しはアカウント制限につながる可能性があります。
現在は各チャンネル処理後に500msの待機時間を設けています。

### 3. DOM構造の依存

フォールバック処理ではDOM構造に依存しており、
YouTube MusicのUI更新で動作しなくなる可能性があります。

## トラブルシューティング

### チャンネルが取得できない

1. YouTube Musicにログインしているか確認
2. 実際に登録チャンネルがあるか確認
3. `getSubscribedChannelsFromDOM()` のDOMセレクタが正しいか確認

### プレイリストが作成できない

1. YouTube Musicアカウントにプレイリスト作成権限があるか確認
2. APIエンドポイント `playlist/create` が正しいか確認
3. 既存のプレイリスト使用を試す

### 楽曲が追加されない

1. 取得した楽曲のvideoIdが正しいか確認
2. プレイリストIDが正しい形式か確認
3. レート制限に引っかかっていないか確認

## 今後の改善案

1. **パフォーマンス最適化**
   - 並列処理の導入
   - キャッシュの実装

2. **機能追加**
   - 定期実行機能
   - 重複曲の除外
   - チャンネルごとの取得曲数カスタマイズ
   - 既存プレイリストの選択UI

3. **エラーハンドリング強化**
   - より詳細なエラーメッセージ
   - 部分的な成功の処理

4. **テスト**
   - ユニットテストの追加
   - E2Eテストの実装

## 参考リンク

- [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [ytmusicapi (非公式YouTube Music API)](https://github.com/sigma67/ytmusicapi)
- [Chrome Extension Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
