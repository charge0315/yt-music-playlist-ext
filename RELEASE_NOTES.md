# Release Notes v1.0.1

## 🚀 YouTube Music Playlist Extension v1.0.1

**リリース日**: 2025年10月12日

### 📥 ダウンロード
- [**yt-music-playlist-ext-v1.0.1.zip**](https://github.com/charge0315/yt-music-playlist-ext/releases/download/v1.0.1/yt-music-playlist-ext-v1.0.1.zip) (2.8MB)

### 🎯 主要改善点

#### 🔧 プレイリスト作成・削除の安定性向上
- **プレイリスト削除APIエラーの解決**: `ACTION_DELETE_PLAYLIST`エラーに対する複数削除方法の実装
- **代替プレイリスト名機能**: 削除API失敗時に自動的にタイムスタンプを付与
  - 例: `Latest from Subscriptions` → `Latest from Subscriptions (12/12 21:04)`
- **プレイリストID抽出の改善**: APIレスポンス解析 + 代替検索方式による確実な取得

#### 🛡️ 重複作成防止の強化
- **プレイリスト名ベースのロック**: 同名プレイリストの同時作成を防止
- **作成状態の可視化**: 現在作成中のプレイリストを詳細追跡
- **変数スコープ問題の解決**: `wasOverwritten`変数の適切な管理

#### ⚙️ 認証システムの強化
- **SAPISID認証の専用関数化**: より安定した認証ヘッダー生成
- **統一API呼び出し**: `callYTMusicAPI`による一貫した認証処理
- **エラーハンドリングの改善**: より具体的なエラーメッセージとログ

### 🆕 新機能
- ✨ **スマートな重複防止**: 削除不可時の自動代替名生成
- 📊 **詳細な進捗表示**: プレイリスト作成状況の可視化
- 🔄 **柔軟な成功判定**: エラーレスポンス以外は成功とみなす仕組み

### 🐛 修正されたバグ
- ❌ プレイリスト削除API (`ACTION_DELETE_PLAYLIST`) エラー
- ❌ レスポンス解析でのプレイリストID取得失敗
- ❌ 重複プレイリスト作成問題
- ❌ JavaScript変数スコープエラー

### 🛠️ 技術的改善
- **複数エンドポイント対応**: `playlist/delete`, `browse/edit_playlist`等を順次試行
- **非同期処理の最適化**: 削除後の適切な待機時間調整
- **コードの堅牢性**: より多くのエッジケースに対応

## 📦 インストール方法

### Chrome Web Storeから（準備中）
Chrome Web Storeでの公開準備中です。

### 手動インストール
1. [yt-music-playlist-ext-v1.0.1.zip](https://github.com/charge0315/yt-music-playlist-ext/releases/download/v1.0.1/yt-music-playlist-ext-v1.0.1.zip) をダウンロード
2. ZIPファイルを解凍
3. Chrome拡張機能管理画面 (`chrome://extensions/`) を開く
4. 「デベロッパーモード」を有効化
5. 「パッケージ化されていない拡張機能を読み込む」で解凍フォルダを選択

## 🔗 関連リンク
- **GitHub Repository**: https://github.com/charge0315/yt-music-playlist-ext
- **Issues**: https://github.com/charge0315/yt-music-playlist-ext/issues
- **Documentation**: https://github.com/charge0315/yt-music-playlist-ext/blob/main/README.md

## ⚠️ 使用上の注意
- YouTube Musicにログインした状態でご使用ください
- プレイリスト作成には数秒から数十秒かかる場合があります
- 大量のアーティストを登録している場合、処理時間が長くなることがあります

---

**前バージョンからのアップグレード**
設定は自動的に引き継がれます。拡張機能を更新後、ページをリロードしてください。