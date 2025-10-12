# Changelog

YouTube Music Playlist Extension の変更履歴

## [1.0.1] - 2025-10-12

### 🔧 バグ修正・改善
- **プレイリスト作成の安定性向上**: 
  - プレイリストID抽出ロジックの改善（代替検索方式を追加）
  - レスポンス成功判定の強化
  - 重複作成防止機能の強化（プレイリスト名ベースのロック機能）
- **プレイリスト削除処理の改善**:
  - 複数の削除方法を順次試行（`playlist/delete`、`browse/edit_playlist`等）
  - 削除API失敗時の代替策（タイムスタンプ付きプレイリスト名）
  - 削除失敗でもプレイリスト作成を継続する仕組み
- **認証システムの強化**:
  - SAPISID認証ヘッダー生成の専用関数化
  - `callYTMusicAPI`による統一された認証処理
  - より安定した内部API呼び出し
- **エラーハンドリングの改善**:
  - `STATUS_FAILED`レスポンスの詳細分析
  - より具体的なエラーメッセージの提供
  - プレイリスト作成状況の詳細ログ

### 🎯 機能追加
- **代替プレイリスト名機能**: 削除API利用不可時に自動的にタイムスタンプを付与
  - 例: "Latest from Subscriptions" → "Latest from Subscriptions (12/12 14:30)"
- **プレイリスト作成状態の可視化**: 作成中プレイリストの詳細追跡
- **より柔軟な成功判定**: エラーレスポンス以外は成功とみなす仕組み

### 🛠️ 技術改善
- **変数スコープ問題の解決**: `wasOverwritten`変数を関数レベルで適切に管理
- **非同期処理の最適化**: プレイリスト作成後の検索待機時間の調整
- **コードの堅牢性向上**: より多くのエッジケースに対応

## [1.0.0] - 2025-10-12

### ✨ 新機能
- **2つの取得モード**: 最新曲/人気曲から選択可能
- **自動プレイリスト作成**: YouTube Musicチャンネルから楽曲を収集してYouTubeプレイリストを生成
- **プレイリスト上書き機能**: 同名プレイリストの重複を防止
- **モード別プレイリスト名**: 
  - 最新曲: `Latest from Subscriptions`
  - 人気曲: `Popular from Subscriptions`
- **柔軟な設定**: チャンネルごとの取得曲数設定（1-10曲）
- **カスタムアイコン**: YouTube Music → YouTube変換をイメージしたデザイン

### 🔧 技術改善
- **Manifest V3対応**: 最新のChrome拡張機能仕様
- **複数API対応**: YouTube Music内部API + YouTube Data API v3
- **SAPISID認証**: 安全な認証システム
- **エラー復旧**: 複数エンドポイント試行とフォールバック処理
- **堅牢性**: タイムアウト処理と非同期エラーハンドリング

### 🛠️ 開発環境
- **テスト**: Jest テストフレームワーク
- **コード品質**: ESLint + Prettier
- **ビルドシステム**: Node.js ビルドスクリプト
- **CI/CD**: GitHub Actions (予定)

### 🎯 主要機能
- YouTube Music登録チャンネルから楽曲自動収集
- 個別動画検索とプレイリスト追加
- 設定の自動保存と復元
- リアルタイム進捗表示
- エラー時の詳細情報表示

---

このプロジェクトは [Semantic Versioning](https://semver.org/) に従います。

### Added
- 初回リリース
- 登録チャンネルから最新曲を取得する機能
- 登録チャンネルから人気曲を取得する機能
- プレイリストの自動作成・管理
- 取得曲数のカスタマイズ
- プレイリスト名のカスタマイズ
- リアルタイム進捗表示
- エラーハンドリング

### Features
- YouTube Music 内部 API との統合
- Content Script によるページコンテキスト実行
- Chrome Extension Manifest V3 対応
- 日本語 UI

[Unreleased]: https://github.com/charge0315/yt-music-playlist-ext/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/charge0315/yt-music-playlist-ext/releases/tag/v1.0.0
