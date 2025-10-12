# コントリビューションガイド

YouTube Music Playlist Extension への貢献をありがとうございます！

## 🐛 バグ報告

[Issues](https://github.com/charge0315/yt-music-playlist-ext/issues) で以下の情報を含めて報告してください：

- 問題の詳細な説明
- 再現手順
- 期待される動作と実際の動作
- 環境情報（OS、ブラウザ）
- スクリーンショット（該当する場合）

## 💡 機能要求

新機能のアイデアがあれば、Issueで議論しましょう。

## 🔧 開発貢献

1. リポジトリをフォーク
2. 機能ブランチを作成 (`feature/your-feature-name`)
3. 変更をコミット
4. テストを追加/更新
5. プルリクエストを作成

### 開発環境

```bash
npm install
npm run build
npm test
npm run lint
```

詳細は [DEVELOPMENT.md](DEVELOPMENT.md) を参照してください。

## 📝 ライセンス

貢献したコードは MIT ライセンスの下で公開されます。

### 機能提案

新機能の提案は歓迎します! Issueで以下を説明してください:

- **機能の説明**
- **なぜその機能が必要か**
- **可能であれば、実装案**

### プルリクエスト

1. **フォーク**してクローン
```bash
git clone https://github.com/YOUR_USERNAME/yt-music-playlist-ext.git
cd yt-music-playlist-ext
```

2. **ブランチを作成**
```bash
git checkout -b feature/your-feature-name
```

3. **変更を加える**
   - コードスタイルガイドに従う
   - テストを追加/更新する
   - ドキュメントを更新する

4. **テストを実行**
```bash
npm test
npm run lint
```

5. **コミット**
```bash
git commit -m "feat: add new feature"
```

コミットメッセージは[Conventional Commits](https://www.conventionalcommits.org/)に従ってください:
- `feat:` 新機能
- `fix:` バグ修正
- `docs:` ドキュメントのみの変更
- `style:` コードの動作に影響しない変更（フォーマットなど）
- `refactor:` リファクタリング
- `test:` テストの追加や修正
- `chore:` ビルドプロセスや補助ツールの変更

6. **プッシュ**
```bash
git push origin feature/your-feature-name
```

7. **プルリクエストを作成**

## 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# Lintの実行
npm run lint

# テストの実行
npm test

# ウォッチモードでテスト
npm run test:watch
```

## コードスタイル

- **ESLint**と**Prettier**を使用
- インデント: スペース2つ
- セミコロン: 必須
- クォート: シングルクォート推奨

自動フォーマット:
```bash
npm run format
```

## テスト

- 新機能には必ずテストを追加
- バグ修正には回帰テストを追加
- テストカバレッジ80%以上を目指す

```bash
# カバレッジ付きテスト
npm run test:coverage
```

## ディレクトリ構造

```
src/
├── background/   # バックグラウンドスクリプト
├── content/      # コンテンツスクリプト
├── popup/        # ポップアップUI
└── utils/        # ユーティリティ関数
tests/            # テストファイル
docs/             # ドキュメント
```

## リリースプロセス

メンテナーのみ:

1. バージョン番号を更新（`package.json`, `manifest.json`）
2. `CHANGELOG.md`を更新
3. タグを作成: `git tag v1.x.x`
4. プッシュ: `git push --tags`

## 質問がある場合

- Issueで質問を作成
- [Discussions](https://github.com/charge0315/yt-music-playlist-ext/discussions)で議論

## ライセンス

このプロジェクトに貢献することで、あなたの貢献がMITライセンスの下でライセンスされることに同意したものとみなされます。
