# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- プロジェクト構造の大幅な改善
- 型定義ファイル (types.js) の追加
- 定数ファイル (constants.js) の追加
- 改善されたヘルパー関数 (helpers.js)
- Jest によるテスト環境の構築
- ESLint と Prettier の設定
- 包括的なドキュメント (CONTRIBUTING.md, SECURITY.md, API.md)
- CI/CD パイプライン (GitHub Actions)
- ビルドスクリプト

### Changed
- ディレクトリ構造を `src/` フォルダに整理
- エラーハンドリングの強化
- コードの可読性とメンテナンス性の向上

### Fixed
- 各種バグ修正

## [1.0.0] - 2025-10-12

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
