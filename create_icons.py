#!/usr/bin/env python3
"""
YouTube Music Playlist Extension アイコン作成スクリプト
YouTube Music から YouTube への変換をイメージしたアイコンを生成
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    """指定されたサイズでアイコンを作成"""
    # キャンバス作成
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # サイズに応じた調整
    if size <= 16:
        line_width = 1
        font_size = 6
        arrow_size = 2
    elif size <= 32:
        line_width = 2
        font_size = 8
        arrow_size = 3
    elif size <= 48:
        line_width = 3
        font_size = 12
        arrow_size = 4
    else:  # 128px
        line_width = 4
        font_size = 16
        arrow_size = 6

    # YouTube Music側（左側）- 音符アイコン
    ytm_color = '#FF6D00'  # YouTube Music オレンジ
    center_y = size // 2
    
    # 音符の描画（左側）
    note_x = size // 4
    note_size = size // 6
    
    # 音符の丸部分
    draw.ellipse([
        note_x - note_size//2, 
        center_y - note_size//4, 
        note_x + note_size//2, 
        center_y + note_size//4
    ], fill=ytm_color)
    
    # 音符の棒
    draw.rectangle([
        note_x + note_size//3, 
        center_y - note_size*2, 
        note_x + note_size//3 + line_width, 
        center_y
    ], fill=ytm_color)
    
    # 矢印（中央）
    arrow_color = '#1976D2'  # 青色の矢印
    arrow_start_x = size // 2 - arrow_size * 2
    arrow_end_x = size // 2 + arrow_size * 2
    
    # 矢印の本体
    draw.rectangle([
        arrow_start_x, 
        center_y - line_width//2, 
        arrow_end_x - arrow_size, 
        center_y + line_width//2
    ], fill=arrow_color)
    
    # 矢印の頭部
    draw.polygon([
        (arrow_end_x - arrow_size, center_y - arrow_size),
        (arrow_end_x, center_y),
        (arrow_end_x - arrow_size, center_y + arrow_size)
    ], fill=arrow_color)
    
    # YouTube側（右側）- 再生ボタン
    yt_color = '#FF0000'  # YouTube 赤
    play_x = size * 3 // 4
    play_size = size // 6
    
    # 再生ボタンの三角形
    draw.polygon([
        (play_x - play_size//2, center_y - play_size//2),
        (play_x + play_size//2, center_y),
        (play_x - play_size//2, center_y + play_size//2)
    ], fill=yt_color)
    
    # 再生ボタンの枠
    draw.ellipse([
        play_x - play_size, 
        center_y - play_size, 
        play_x + play_size, 
        center_y + play_size
    ], outline=yt_color, width=line_width)
    
    return img

def main():
    """メイン関数 - 各サイズのアイコンを生成"""
    # iconsディレクトリが存在しない場合は作成
    icons_dir = "icons"
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)
    
    # 各サイズのアイコンを作成
    sizes = [16, 32, 48, 128]
    
    for size in sizes:
        print(f"Creating icon{size}.png...")
        icon = create_icon(size)
        icon.save(f"{icons_dir}/icon{size}.png", "PNG")
        print(f"✓ icon{size}.png created successfully")
    
    print("\n🎵 All icons created successfully!")
    print("Icons represent: YouTube Music → YouTube conversion")

if __name__ == "__main__":
    main()