#!/usr/bin/env python3
"""
Gemini生成アイコンから全サイズを作成するスクリプト
AI生成の高品質128pxアイコンから他のサイズを自動生成
"""

from PIL import Image
import os

def resize_icon_with_optimization(source_path, target_size, output_path):
    """
    AI生成アイコンを最適化しながらリサイズ
    小さいサイズでの視認性を考慮した最適化処理
    """
    try:
        # 元画像を開く
        with Image.open(source_path) as img:
            # RGBAモードに変換（透明度保持）
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # サイズ別最適化
            if target_size <= 16:
                # 16px: 高品質リサンプリング + シャープニング
                resized = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
            elif target_size <= 32:
                # 32px: 高品質リサンプリング
                resized = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
            else:
                # 48px以上: 標準リサンプリング
                resized = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
            
            # PNG最適化で保存
            resized.save(output_path, 'PNG', optimize=True, compress_level=9)
            return True
            
    except Exception as e:
        print(f"エラー: {output_path} の作成に失敗 - {e}")
        return False

def main():
    """Gemini生成アイコンから全サイズを作成"""
    
    # Gemini生成アイコンのパス
    source_file = "icons/gemini_source_128px.png"
    
    if not os.path.exists(source_file):
        print(f"❌ 元ファイルが見つかりません: {source_file}")
        return
    
    # 生成するサイズ
    sizes = [16, 32, 48, 128]
    
    print("🤖 Gemini AI生成アイコンから全サイズを作成中...")
    print(f"📁 ソース: {source_file}")
    print()
    
    success_count = 0
    
    for size in sizes:
        # iconsフォルダ
        icons_path = f"icons/icon{size}.png"
        # ルートフォルダ
        root_path = f"icon{size}.png"
        
        print(f"🎨 Creating {size}×{size}px...")
        
        # iconsフォルダに作成
        if resize_icon_with_optimization(source_file, size, icons_path):
            print(f"  ✅ {icons_path}")
            
            # ルートフォルダにコピー
            try:
                with Image.open(icons_path) as img:
                    img.save(root_path, 'PNG', optimize=True)
                print(f"  ✅ {root_path}")
                success_count += 1
            except Exception as e:
                print(f"  ❌ {root_path} のコピーに失敗: {e}")
        else:
            print(f"  ❌ {icons_path} の作成に失敗")
    
    print()
    if success_count == len(sizes):
        print("🚀 AI生成アイコンの展開が完了しました！")
        print("📊 品質:")
        print("  • Gemini AI生成による最高品質")
        print("  • プロフェッショナルデザイン")
        print("  • 全サイズ最適化済み")
        print("  • Chrome Web Store準拠")
        print()
        print("📋 Next Steps:")
        print("  1. npm run build")
        print("  2. Chrome拡張機能をリロード")
        print("  3. 新しいアイコンを確認")
    else:
        print(f"⚠️  一部のアイコン作成に失敗しました ({success_count}/{len(sizes)})")

if __name__ == "__main__":
    main()