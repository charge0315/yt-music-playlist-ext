#!/usr/bin/env python3
"""
新しいGeminiアイコンを統合するスクリプト
Gemini_Generated_Image_4ctqwd4ctqwd4ctq.pngから各サイズのアイコンを生成
"""

import os
import sys
from PIL import Image

def create_icon_sizes(source_path, output_dir):
    """
    ソースアイコンから各サイズのアイコンを生成
    """
    # 必要なアイコンサイズ
    sizes = [16, 24, 32, 48, 64, 128, 256, 512]
    
    # ソース画像を開く
    try:
        source_img = Image.open(source_path)
        print(f"✓ ソース画像読み込み成功: {source_path}")
        print(f"  元サイズ: {source_img.size}")
        
        # RGBA形式に変換（透明度サポート）
        if source_img.mode != 'RGBA':
            source_img = source_img.convert('RGBA')
            print("  RGBA形式に変換しました")
        
    except Exception as e:
        print(f"❌ ソース画像の読み込みに失敗: {e}")
        return False
    
    # 各サイズでアイコンを生成
    generated_files = []
    
    for size in sizes:
        try:
            # 高品質リサイズ
            resized_img = source_img.resize((size, size), Image.Resampling.LANCZOS)
            
            # ファイル名とパス
            filename = f"icon{size}.png"
            output_path = os.path.join(output_dir, filename)
            
            # 保存
            resized_img.save(output_path, "PNG", optimize=True)
            generated_files.append(filename)
            
            print(f"  ✓ {filename} 生成完了 ({size}x{size})")
            
        except Exception as e:
            print(f"  ❌ {size}x{size} アイコンの生成に失敗: {e}")
    
    # 元画像も保存（ソース用）
    try:
        source_backup = os.path.join(output_dir, "icon_source_gemini.png")
        source_img.save(source_backup, "PNG", optimize=True)
        generated_files.append("icon_source_gemini.png")
        print(f"  ✓ ソース画像バックアップ: icon_source_gemini.png")
    except Exception as e:
        print(f"  ❌ ソース画像の保存に失敗: {e}")
    
    print(f"\n🎉 アイコン生成完了! {len(generated_files)}個のファイルを生成しました")
    return generated_files

def update_manifest_icons(manifest_path, icon_dir):
    """
    manifest.jsonのアイコン参照を更新
    """
    try:
        import json
        
        # manifest.jsonを読み込み
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        
        # アイコン設定を更新
        manifest["icons"] = {
            "16": f"{icon_dir}/icon16.png",
            "24": f"{icon_dir}/icon24.png", 
            "32": f"{icon_dir}/icon32.png",
            "48": f"{icon_dir}/icon48.png",
            "64": f"{icon_dir}/icon64.png",
            "128": f"{icon_dir}/icon128.png",
            "256": f"{icon_dir}/icon256.png",
            "512": f"{icon_dir}/icon512.png"
        }
        
        # action（ツールバーアイコン）も更新
        if "action" in manifest:
            manifest["action"]["default_icon"] = {
                "16": f"{icon_dir}/icon16.png",
                "24": f"{icon_dir}/icon24.png",
                "32": f"{icon_dir}/icon32.png"
            }
        
        # manifest.jsonに書き戻し
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        
        print(f"✓ manifest.json更新完了: {manifest_path}")
        return True
        
    except Exception as e:
        print(f"❌ manifest.json更新に失敗: {e}")
        return False

def main():
    # パス設定
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = script_dir  # スクリプトがプロジェクトルートにある
    icons_dir = os.path.join(project_root, "icons")
    
    # Geminiアイコンのパス
    source_icon = os.path.join(icons_dir, "Gemini_Generated_Image_c371ldc371ldc371.png")
    
    # ファイル存在確認
    if not os.path.exists(source_icon):
        print(f"❌ ソースアイコンが見つかりません: {source_icon}")
        return False
    
    print("🚀 Gemini生成アイコンの統合を開始...")
    print(f"📁 プロジェクトルート: {project_root}")
    print(f"📁 アイコンディレクトリ: {icons_dir}")
    print(f"🎨 ソースアイコン: {source_icon}")
    print()
    
    # アイコン生成
    generated_files = create_icon_sizes(source_icon, icons_dir)
    
    if not generated_files:
        print("❌ アイコン生成に失敗しました")
        return False
    
    # manifest.json更新
    manifest_path = os.path.join(project_root, "manifest.json") 
    if os.path.exists(manifest_path):
        update_manifest_icons(manifest_path, "icons")
    else:
        print(f"⚠️ manifest.jsonが見つかりません: {manifest_path}")
    
    print("\n🎉 Geminiアイコンの統合が完了しました!")
    print("\n📝 次のステップ:")
    print("1. 拡張機能をリロードして新しいアイコンを確認")
    print("2. ビルドコマンド (npm run build) でdistフォルダを更新")
    print("3. 変更をコミット・プッシュ")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)