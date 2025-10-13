# YouTube Music Playlist Extension

YouTube Musicの登録チャンネルから楽曲を自動収集し、YouTubeプレイリストを作成するChrome拡張機能

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 概要

この拡張機能は、YouTube Musicで登録しているアーティスト/チャンネルから、最新の楽曲や人気曲を自動的に収集し、YouTubeプレイリストを作成します。お気に入りのアーティストの新曲や代表曲を簡単にプレイリストにまとめることができます。

## 🎵 主な機能

### 📀 2つの取得モード
- **最新曲モード**: 各チャンネルから最新アップロードされた楽曲を収集
- **人気曲モード**: 各チャンネルで最も再生回数の多い楽曲を収集

### 🔄 自動プレイリスト管理
- **スマートな重複防止**: 同名プレイリストの自動検出・削除
- **代替名機能**: 削除不可時はタイムスタンプ付きプレイリスト名を自動生成
- **モード別プレイリスト名**:
  - 最新曲: `Latest from Subscriptions`
  - 人気曲: `Popular from Subscriptions`
- **作成状態管理**: 重複作成を防ぐプレイリスト名ベースのロック機能

### ⚙️ 柔軟な設定
- チャンネルごとの取得曲数設定（1-10曲）
- カスタムプレイリスト名
- 設定の自動保存

### 🛡️ 堅牢性
- **多段階認証**: SAPISID認証による安全なAPI接続
- **複数API対応**: プレイリスト作成・削除の複数エンドポイント試行
- **代替ID取得**: APIレスポンス解析 + 検索による確実なプレイリストID取得
- **エラー自動復旧**: 失敗時の自動フォールバック処理

## 📥 インストール

### 前提条件
- Google Chrome または Chromiumベースのブラウザ（Edge, Brave等）
- YouTube Musicアカウント
- 登録チャンネル/アーティスト

### インストール手順

1. **リポジトリをクローン**
```bash
git clone https://github.com/charge0315/yt-music-playlist-ext.git
cd yt-music-playlist-ext
```

2. **依存関係をインストール**
```bash
npm install
```

3. **ビルド**
```bash
npm run build
```

4. **Chrome拡張機能ページを開く**
- Chromeで `chrome://extensions/` にアクセス
- または メニュー → その他のツール → 拡張機能

5. **デベロッパーモードを有効化**
- 右上の「デベロッパーモード」トグルをONにする

6. **拡張機能を読み込む**
- 「パッケージ化されていない拡張機能を読み込む」をクリック
- `dist` ディレクトリを選択

## 🚀 使い方

### 1. 拡張機能を起動
YouTube Music (https://music.youtube.com) を開いて、拡張機能アイコンをクリックします。

### 2. 設定を選択
- **取得モード**: 最新曲または人気曲を選択
- **取得曲数**: 各チャンネルから取得する楽曲数（1-10曲）
- **プレイリスト名**: 作成するプレイリストの名前（オプション）

### 3. プレイリスト作成
「再生リストを作成」ボタンをクリックして処理を開始します。

処理中は進行状況がリアルタイムで表示されます：
- 🔍 **楽曲検索**: アーティストごとの楽曲発見プロセス
- ⏱️ **進行表示**: 現在の処理状況とステップ
- 📊 **統計情報**: 取得済み楽曲数と成功率

### 4. 結果確認
- ✅ YouTubeプレイリストが自動作成されます
- 📊 取得された楽曲一覧が表示されます
- 🔗 作成されたプレイリストへのリンクが提供されます

## 💡 使用例

### シナリオ1: 最新曲プレイリスト
1. **最新曲モード**を選択
2. 各チャンネルから**3曲ずつ**取得
3. プレイリスト名：`Latest from Subscriptions`
4. → お気に入りアーティストの新曲を網羅したプレイリストが完成！

### シナリオ2: 人気曲コレクション
1. **人気曲モード**を選択
2. 各チャンネルから**5曲ずつ**取得
3. カスタムプレイリスト名：`My Top Hits 2024`
4. → 人気の代表曲を集めたベストヒットプレイリストが完成！

## 🔧 技術仕様

- **フレームワーク**: Manifest V3 Chrome Extension
- **言語**: JavaScript (ES6+)
- **API**: YouTube Music内部API (InnerTube API)
- **認証**: SAPISID認証
- **テスト**: Jest
- **ビルド**: Node.js

## 📁 プロジェクト構造

```
yt-music-playlist-ext/
├── icons/                  # 拡張機能アイコン
├── scripts/                # ビルドスクリプト
├── tests/                  # テストファイル
├── background.js           # バックグラウンドスクリプト
├── content.js              # コンテンツスクリプト
├── injected.js             # 注入スクリプト
├── popup.html              # ポップアップHTML
├── popup.js                # ポップアップロジック
├── popup.css               # ポップアップスタイル
├── utils.js                # ユーティリティ関数
├── manifest.json           # 拡張機能マニフェスト
├── package.json            # npm設定
├── jest.config.js          # Jest設定
├── .eslintrc.js            # ESLint設定
├── .prettierrc             # Prettier設定
├── CHANGELOG.md            # 変更履歴
├── CONTRIBUTING.md         # 貢献ガイド
├── DEVELOPMENT.md          # 開発ドキュメント
├── SECURITY.md             # セキュリティポリシー
└── README.md               # このファイル
```

## 🛠️ 開発

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/charge0315/yt-music-playlist-ext.git
cd yt-music-playlist-ext

# 依存関係のインストール
npm install
```

### 開発コマンド

```bash
# コードのリント
npm run lint

# リントエラーを自動修正
npm run lint:fix

# コードフォーマット
npm run format

# フォーマットチェック
npm run format:check

# テストの実行
npm test

# テスト (watch モード)
npm run test:watch

# カバレッジ付きテスト
npm run test:coverage

# ビルド
npm run build

# Zipアーカイブの作成
npm run build:zip

# 開発用ウォッチモード
npm run watch
```

### デバッグ

#### Chrome Developer Toolsを使用する場合
- **Popup**: アイコンを右クリック → 「検証」
- **Background**: `chrome://extensions/` → 「service worker」をクリック
- **Content Script**: YouTube Musicページで開発者ツールを開く

## 🧪 テスト

このプロジェクトは Jest を使用してテストを実行しています。

```bash
# すべてのテストを実行
npm test

# カバレッジレポート生成
npm run test:coverage
```

## ⚠️ 制限事項

### 技術的制限

1. **非公式API使用**
   - YouTube Musicの公式APIは存在しません
   - 内部APIを使用しているため、YouTube側の仕様変更で動作しなくなる可能性があります

2. **レート制限**
   - 過度なAPI呼び出しはアカウント制限につながる可能性があります

3. **ブラウザ依存**
   - Chrome/Chromiumベースのブラウザでのみ動作します

### 機能的制限

1. **登録チャンネルのみ対象**
   - YouTube Musicで登録しているチャンネル/アーティストのみが対象です

2. **手動実行**
   - 現時点では自動実行機能はありません

3. **地域制限**
   - 一部の地域制限コンテンツは取得できません

## トラブルシューティング

### よくある問題と解決方法

#### 問題: 「YouTube Musicのページで実行してください」と表示される
**解決方法:**
1. https://music.youtube.com にアクセス
2. ページが完全に読み込まれたことを確認
3. 拡張機能を再度実行

#### 問題: 登録チャンネルが取得できない
**解決方法:**
1. YouTube Musicアカウントにログイン
2. チャンネル/アーティストを登録
3. ページをリロードして再試行

#### 問題: プレイリストが作成されない
**解決方法:**
1. ブラウザの開発者ツール（F12）を開く
2. Consoleタブでエラーメッセージを確認
3. ページをリロードして再試行

## FAQ

### Q: この拡張機能は安全ですか？
A: はい。すべてのコードはオープンソースで公開されており、悪意のある動作は含まれていません。

### Q: YouTube Musicの利用規約に違反しませんか？
A: この拡張機能は、ブラウザで通常行う操作を自動化しているだけです。ただし、YouTube Musicの内部APIを使用しているため、将来的に利用が制限される可能性はあります。

### Q: 無料で使えますか？
A: はい、完全に無料です。オープンソースで提供されています。

### Q: YouTube Music Premiumが必要ですか？
A: いいえ、無料アカウントでも使用できます。

### Q: 他のブラウザで使えますか？
A: Chrome/Chromiumベースのブラウザ（Edge, Brave等）で動作します。Firefoxには対応していません。

## 📝 ライセンス

[MIT License](LICENSE) - 自由に使用、修正、配布が可能です。

## 🤝 コントリビューション

バグ報告や機能要求は [Issues](https://github.com/charge0315/yt-music-playlist-ext/issues) でお願いします。

プルリクエストを歓迎します！詳細は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

## 📖 ドキュメント

- [CHANGELOG.md](CHANGELOG.md) - 変更履歴
- [CONTRIBUTING.md](CONTRIBUTING.md) - 貢献ガイドライン
- [DEVELOPMENT.md](DEVELOPMENT.md) - 開発者向け詳細ドキュメント
- [SECURITY.md](SECURITY.md) - セキュリティポリシー

## 作者

**charge0315**
- GitHub: [@charge0315](https://github.com/charge0315)

## 謝辞

- [ytmusicapi](https://github.com/sigma67/ytmusicapi) - YouTube Music APIの理解に参考にさせていただきました
- YouTube Music - 素晴らしい音楽ストリーミングサービス

---

**注意**: この拡張機能は非公式であり、YouTube/Google Inc.とは関係ありません。
