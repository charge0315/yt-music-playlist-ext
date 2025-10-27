# Copilot Instructions for AI Agents

## 🏗️ Big Picture & Architecture
  - `background.js`: Handles background tasks and API calls.
  - `content.js`: Runs in YouTube Music, fetches channel/song info.
  - `injected.js`: Injected for SAPISID authentication and direct API calls.
  - `popup.js`/`popup.html`: User interface for settings and playlist creation.
  - `utils.js`: Shared utility functions (retry, rate limit, error handling).

## 🛠️ Developer Workflows
  - Popup: Right-click icon → Inspect
  - Background: `chrome://extensions/` → Service Worker
  - Content: Inspect on YouTube Music page

```markdown
# Copilot Instructions for AI Agents

## 概要
このリポジトリは YouTube Music のプレイリスト自動生成 Chrome拡張（Manifest V3）です。

## 主要機能・構成
- Chrome拡張: background.js, content.js, injected.js, popup.js, utils.js
- API: YouTube Music 内部API (InnerTube)
- 主要コマンド: npm install, npm run build, npm test, npm run lint

## 開発・実行コマンド
- 依存インストール: npm install
- ビルド: npm run build
- テスト: npm test
- Lint/整形: npm run lint
- デバッグ: Chrome DevTools, Service Worker

## 注意点・運用ルール
- SAPISID認証必須
- レート制御（500ms間隔）
- 非公式APIのためYouTube仕様変更に注意
- テストはJest

---
このテンプレートは自動生成です。プロジェクト固有の注意点はREADMEも参照してください。
  - `injected.js` — ページコンテキストへ注入し SAPISID 認証や直接 API 呼び出しを行う
  - `popup.html` / `popup.js` — ユーザー設定と操作トリガー（ポップアップ UI）
  - `utils.js` — リトライ、レート制御、汎用ユーティリティ
- データフロー（簡潔）: ユーザー操作 → 登録チャンネル取得 → 楽曲取得 → プレイリスト作成/編集（`browse/edit_playlist` を優先）

## 開発ワークフロー（すぐ使えるコマンド）
- 依存インストール: `npm install`
- ビルド: `npm run build`（出力先: `dist/`）
- テスト: `npm test` / `npm run test:watch` / `npm run test:coverage`（Jest）
- Lint/整形: `npm run lint` / `npm run lint:fix` / `npm run format`
- デバッグ:
  - ポップアップ: アイコンを右クリック → 検証
  - バックグラウンド: `chrome://extensions/` → Service Worker を開く
  - コンテントスクリプト: YouTube Music ページで DevTools を使う

## プロジェクト固有の注意点
- 認証: すべての内部 API 呼び出しは SAPISID 認証を用いる（`injected.js` を参照）。
- フォールバック: プレイリスト作成は重複検知→タイムスタンプ付与などのフォールバックを持つ。
- レート制御: チャンネル処理間に約 500ms の間隔を設ける設計になっている。
- ロギング: 詳細ログは `localStorage.setItem('ytm-playlist-debug','true')` で有効化可能。
- テスト: `tests/` にユニットテスト（Jest）がある。

## 良く見るファイルとパターン（参照先）
- チャンネル・楽曲取得とプレイリストロジック: `content.js`
- 認証・直接 API 呼び出し: `injected.js`
- ポップアップ UI とイベント処理: `popup.js`
- 共通ユーティリティ（リトライ/フォールバック等）: `utils.js`

## 制限事項 / 既知のリスク
- Chrome / Chromium 系ブラウザ専用。
- 非公式な内部 API を利用しているため、YouTube 側の変更で動作が崩れる可能性がある。
- レート制限や地域制限の影響を受ける。

---

このファイルは簡潔に保ち、実装の変更があれば都度更新してください。

``` 
