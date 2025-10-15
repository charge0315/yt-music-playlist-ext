# Copilot Instructions for AI Agents

## 🏗️ Big Picture & Architecture
- This is a Chrome extension (Manifest V3) for YouTube Music playlist automation.
- Main components:
  - `background.js`: Handles background tasks and API calls.
  - `content.js`: Runs in YouTube Music, fetches channel/song info.
  - `injected.js`: Injected for SAPISID authentication and direct API calls.
  - `popup.js`/`popup.html`: User interface for settings and playlist creation.
  - `utils.js`: Shared utility functions (retry, rate limit, error handling).
- Data flow: User triggers playlist creation → fetches channels/songs → creates/edits playlist via YouTube Music internal API (InnerTube).
- API endpoints: Prefer `browse/edit_playlist`, fallback to others if needed.

## 🛠️ Developer Workflows
- **Install:** `npm install`
- **Build:** `npm run build` (output: `dist/`)
- **Test:** `npm test`, `npm run test:watch`, `npm run test:coverage` (Jest)
- **Lint/Format:** `npm run lint`, `npm run lint:fix`, `npm run format`
- **Debug:** Use Chrome DevTools:
  - Popup: Right-click icon → Inspect
  - Background: `chrome://extensions/` → Service Worker
  - Content: Inspect on YouTube Music page
- **Extension Load:** Load unpacked from `dist/` in Chrome extensions page.

```markdown
# `copilot-instructions.md` — AI エージェント向けの短い手引き（日本語）

## 概要（プロジェクトの大局）
- このリポジトリは YouTube Music の内部 API (InnerTube) を使ってプレイリストを自動作成する Chrome 拡張（Manifest V3）です。
- 主要コンポーネント:
  - `background.js` — バックグラウンド処理、API 呼び出しの中継
  - `content.js` — YouTube Music ページ上でのチャンネル/楽曲取得ロジック
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
