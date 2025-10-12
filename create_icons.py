#!/usr/bin/env python3
"""
YouTube Music Playlist Extension アイコン作成スクリプト (プロフェッショナル版)
洗練されたデザインでYouTube Music から YouTube への変換を表現
"""

from PIL import Image, ImageDraw
import os

def create_icon(size):
    """指定されたサイズでプロフェッショナルなアイコンを作成"""
    # キャンバス作成（透明背景）
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # サイズに応じた調整
    padding = size // 8
    center_x = size // 2
    center_y = size // 2
    
    if size <= 16:
        line_width = 1
        shadow_offset = 1
    elif size <= 32:
        line_width = 2
        shadow_offset = 1
    elif size <= 48:
        line_width = 3
        shadow_offset = 2
    else:  # 128px
        line_width = 4
        shadow_offset = 3

    # カラーパレット
    ytm_orange = '#FF6D00'  # YouTube Music オレンジ
    yt_red = '#FF0000'      # YouTube レッド
    arrow_color = '#666666'  # アロー グレー
    shadow_color = (0, 0, 0, 60)  # 半透明の影
    
    # === 左側: YouTube Music アイコン ===
    # 丸い背景（シャドウ）
    left_circle_size = size // 3
    left_x = padding + left_circle_size // 2
    
    # 影の描画
    draw.ellipse([
        left_x - left_circle_size//2 + shadow_offset,
        center_y - left_circle_size//2 + shadow_offset,
        left_x + left_circle_size//2 + shadow_offset,
        center_y + left_circle_size//2 + shadow_offset
    ], fill=shadow_color)
    
    # メイン円の描画
    draw.ellipse([
        left_x - left_circle_size//2,
        center_y - left_circle_size//2,
        left_x + left_circle_size//2,
        center_y + left_circle_size//2
    ], fill=ytm_orange, outline='white', width=max(1, line_width//2))
    
    # 音符の描画
    note_size = left_circle_size // 3
    note_x = left_x
    note_y = center_y
    
    # 音符のヘッド（楕円）
    draw.ellipse([
        note_x - note_size//3,
        note_y - note_size//6,
        note_x + note_size//6,
        note_y + note_size//3
    ], fill='white')
    
    # 音符のステム（縦線）
    if size > 16:  # 小さすぎる場合は省略
        draw.line([
            (note_x + note_size//6, note_y - note_size//6),
            (note_x + note_size//6, note_y - note_size)
        ], fill='white', width=max(1, line_width//2))
    
    # === 中央: 変換アロー ===
    arrow_width = size // 6
    arrow_height = size // 12
    arrow_x = center_x
    
    # アローの影
    arrow_shadow_points = [
        (arrow_x - arrow_width//2 + shadow_offset, center_y - arrow_height//2 + shadow_offset),
        (arrow_x + arrow_width//4 + shadow_offset, center_y - arrow_height//2 + shadow_offset),
        (arrow_x + arrow_width//4 + shadow_offset, center_y - arrow_height + shadow_offset),
        (arrow_x + arrow_width//2 + shadow_offset, center_y + shadow_offset),
        (arrow_x + arrow_width//4 + shadow_offset, center_y + arrow_height + shadow_offset),
        (arrow_x + arrow_width//4 + shadow_offset, center_y + arrow_height//2 + shadow_offset),
        (arrow_x - arrow_width//2 + shadow_offset, center_y + arrow_height//2 + shadow_offset)
    ]
    draw.polygon(arrow_shadow_points, fill=shadow_color)
    
    # メインアロー
    arrow_points = [
        (arrow_x - arrow_width//2, center_y - arrow_height//2),
        (arrow_x + arrow_width//4, center_y - arrow_height//2),
        (arrow_x + arrow_width//4, center_y - arrow_height),
        (arrow_x + arrow_width//2, center_y),
        (arrow_x + arrow_width//4, center_y + arrow_height),
        (arrow_x + arrow_width//4, center_y + arrow_height//2),
        (arrow_x - arrow_width//2, center_y + arrow_height//2)
    ]
    draw.polygon(arrow_points, fill=arrow_color, outline='white', width=1)
    
    # === 右側: YouTube アイコン ===
    # 角丸四角形の背景（シャドウ）
    right_size = size // 3
    right_x = size - padding - right_size // 2
    corner_radius = right_size // 6
    
    # 影の描画
    if hasattr(draw, 'rounded_rectangle'):  # Pillow 8.2.0+
        draw.rounded_rectangle([
            right_x - right_size//2 + shadow_offset,
            center_y - right_size//2 + shadow_offset,
            right_x + right_size//2 + shadow_offset,
            center_y + right_size//2 + shadow_offset
        ], radius=corner_radius, fill=shadow_color)
        
        # メイン四角形の描画
        draw.rounded_rectangle([
            right_x - right_size//2,
            center_y - right_size//2,
            right_x + right_size//2,
            center_y + right_size//2
        ], radius=corner_radius, fill=yt_red, outline='white', width=max(1, line_width//2))
    else:
        # 古いPillowバージョン用のフォールバック
        draw.rectangle([
            right_x - right_size//2 + shadow_offset,
            center_y - right_size//2 + shadow_offset,
            right_x + right_size//2 + shadow_offset,
            center_y + right_size//2 + shadow_offset
        ], fill=shadow_color)
        
        draw.rectangle([
            right_x - right_size//2,
            center_y - right_size//2,
            right_x + right_size//2,
            center_y + right_size//2
        ], fill=yt_red, outline='white', width=max(1, line_width//2))
    
    # 再生ボタンの描画（三角形）
    play_size = right_size // 3
    play_x = right_x + play_size // 8  # 少し右寄り
    
    play_points = [
        (play_x - play_size//3, center_y - play_size//2),
        (play_x - play_size//3, center_y + play_size//2),
        (play_x + play_size//2, center_y)
    ]
    draw.polygon(play_points, fill='white')
    
    return img

def main():
    """メイン関数 - 各サイズのプロフェッショナルなアイコンを生成"""
    # iconsディレクトリが存在しない場合は作成
    icons_dir = "icons"
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)
    
    # 各サイズのアイコンを作成
    sizes = [16, 32, 48, 128]
    
    print("🎨 Creating professional YouTube Music Playlist Extension icons...")
    print("Design: YouTube Music (orange circle + music note) → Arrow → YouTube (red rounded square + play button)")
    print()
    
    for size in sizes:
        print(f"Creating icon{size}.png...")
        icon = create_icon(size)
        
        # アイコンを保存（高品質設定）
        icon.save(f"{icons_dir}/icon{size}.png", "PNG", optimize=True)
        
        # ルートディレクトリにもコピー（manifest.json用）
        icon.save(f"icon{size}.png", "PNG", optimize=True)
        
        print(f"✓ icon{size}.png created successfully")
    
    print("\n🚀 All professional icons created successfully!")
    print("Features:")
    print("  • Modern flat design with shadows")
    print("  • High contrast for visibility")
    print("  • Proper YouTube Music → YouTube branding")
    print("  • Multiple sizes for all use cases")
    print("  • Optimized PNG format")

if __name__ == "__main__":
    main()