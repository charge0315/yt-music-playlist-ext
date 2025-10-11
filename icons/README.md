# アイコンについて

このディレクトリには拡張機能のアイコンを配置してください。

## 必要なアイコンサイズ

Chrome拡張機能では以下のサイズのアイコンが必要です:

- `icon16.png` - 16x16ピクセル (ツールバー、ファビコン)
- `icon32.png` - 32x32ピクセル (Retinaディスプレイ対応)
- `icon48.png` - 48x48ピクセル (拡張機能管理ページ)
- `icon128.png` - 128x128ピクセル (Chrome Web Store、インストール時)

## アイコンデザインガイドライン

### 推奨事項
- **シンプルで認識しやすいデザイン**にする
- **YouTube Musicのテーマカラー**（赤系 #FF0000）を使用
- **音楽やプレイリスト**をイメージさせるモチーフ
  - 音符 (♪, ♫)
  - プレイリストアイコン
  - YouTube Musicロゴ風
- **背景は透過PNG**を推奨
- **コントラスト**を高くして視認性を確保

### 避けるべきこと
- 複雑すぎるデザイン
- 小さいサイズで認識できない細かいディテール
- YouTube の公式ロゴの無断使用（商標権）

## アイコン作成ツール

### オンラインツール
- [Favicon Generator](https://www.favicon-generator.org/) - 簡単にアイコン生成
- [Real Favicon Generator](https://realfavicongenerator.net/) - 全サイズ一括生成
- [Canva](https://www.canva.com/) - デザインツール
- [Figma](https://www.figma.com/) - プロフェッショナルなデザイン

### デスクトップツール
- Adobe Illustrator / Photoshop
- GIMP (無料)
- Inkscape (無料、ベクター)

## 暫定アイコンの作成

開発中に暫定で使用する簡易アイコンの作成方法:

### 方法1: ImageMagick (コマンドライン)

```bash
# 赤い四角に白い音符
convert -size 128x128 xc:red -font Arial-Bold -pointsize 80 -fill white -gravity center -annotate +0+0 "♪" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 32x32 icon32.png
convert icon128.png -resize 16x16 icon16.png
```

### 方法2: Python + Pillow

```python
from PIL import Image, ImageDraw, ImageFont

def create_icon(size, filename):
    img = Image.new('RGB', (size, size), color='red')
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype('arial.ttf', int(size * 0.6))
    draw.text((size//2, size//2), '♪', fill='white', font=font, anchor='mm')
    img.save(filename)

create_icon(128, 'icon128.png')
create_icon(48, 'icon48.png')
create_icon(32, 'icon32.png')
create_icon(16, 'icon16.png')
```

### 方法3: オンラインで生成

1. [Favicon.io](https://favicon.io/favicon-generator/) にアクセス
2. テキスト: "YM" または "♪"
3. 背景色: #FF0000 (赤)
4. フォント色: #FFFFFF (白)
5. ダウンロードして `icons/` に配置

## アイコンの確認

アイコンが正しく設定されているか確認:

1. `chrome://extensions/` で拡張機能を開く
2. ツールバーにアイコンが表示されているか確認
3. 拡張機能管理ページでアイコンが表示されているか確認

## トラブルシューティング

### アイコンが表示されない
- ファイル名が正確か確認 (`icon16.png`, `icon32.png` など)
- `manifest.json` のパスが正しいか確認
- ファイルサイズが0バイトでないか確認
- PNG形式であることを確認

### アイコンがぼやける
- 各サイズごとに個別に最適化されたアイコンを作成
- ベクター形式から各サイズにエクスポート
- アンチエイリアシングの設定を確認

