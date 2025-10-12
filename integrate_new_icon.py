#!/usr/bin/env python3
"""
新しいGeminiアイコンを統合するスクリプト
添付されたGemini AI生成アイコンから全サイズを作成
"""

from PIL import Image
import os

def process_new_gemini_icon():
    """新しいGeminiアイコンを処理して全サイズ作成"""
    
    # 新しいGeminiアイコンのファイル名候補
    possible_names = [
        "icons/Gemini_Generated_Image_taiszxtaiszxtais.png",  # 最新のGeminiファイル
        "icons/gemini_new_icon.png",
        "gemini_new_icon.png"
    ]
    
    source_file = None
    
    # ファイルを検索
    for name in possible_names:
        if '*' in name:
            # ワイルドカード検索
            import glob
            matches = glob.glob(name)
            if matches:
                source_file = matches[0]
                break
        elif os.path.exists(name):
            source_file = name
            break
    
    if not source_file:
        print("❌ 新しいGeminiアイコンファイルが見つかりません")
        print("📋 以下のいずれかの名前で保存してください:")
        for name in possible_names:
            print(f"   • {name}")
        return False
    
    print(f"🤖 新しいGemini AI生成アイコンを処理中...")
    print(f"📁 ソース: {source_file}")
    
    # 元の画像情報を確認
    try:
        with Image.open(source_file) as img:
            print(f"📊 元画像サイズ: {img.size}")
            print(f"📊 元画像モード: {img.mode}")
    except Exception as e:
        print(f"❌ 画像の読み込みに失敗: {e}")
        return False
    
    # バックアップ作成
    if os.path.exists("icons/gemini_source_128px.png"):
        backup_name = "icons/gemini_source_128px_backup.png"
        try:
            import shutil
            shutil.copy("icons/gemini_source_128px.png", backup_name)
            print(f"💾 旧アイコンをバックアップ: {backup_name}")
        except Exception as e:
            print(f"⚠️ バックアップ作成に失敗: {e}")
    
    # 新しいアイコンをマスターファイルとして設定
    master_file = "icons/gemini_source_128px.png"
    try:
        import shutil
        shutil.copy(source_file, master_file)
        print(f"✅ 新しいアイコンをマスターファイルに設定: {master_file}")
    except Exception as e:
        print(f"❌ マスターファイル設定に失敗: {e}")
        return False
    
    # 全サイズ生成
    sizes = [16, 32, 48, 128]
    success_count = 0
    
    print("\n🎨 全サイズアイコンを生成中...")
    
    for size in sizes:
        icons_path = f"icons/icon{size}.png"
        root_path = f"icon{size}.png"
        
        try:
            with Image.open(master_file) as img:
                # RGBAモードに変換
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                
                # 高品質リサイズ
                resized = img.resize((size, size), Image.Resampling.LANCZOS)
                
                # 保存
                resized.save(icons_path, 'PNG', optimize=True)
                resized.save(root_path, 'PNG', optimize=True)
                
                print(f"  ✅ {size}×{size}px → {icons_path} & {root_path}")
                success_count += 1
                
        except Exception as e:
            print(f"  ❌ {size}×{size}px 生成失敗: {e}")
    
    print(f"\n🚀 処理完了: {success_count}/{len(sizes)} サイズ生成成功")
    
    if success_count == len(sizes):
        print("✨ 新しいGemini AIアイコンの統合が完了しました！")
        print("\n📋 Next Steps:")
        print("  1. npm run build")
        print("  2. Chrome拡張機能をリロード")
        print("  3. 新しい美しいアイコンを確認！")
        return True
    else:
        print("⚠️ 一部のサイズ生成に失敗しました")
        return False

if __name__ == "__main__":
    process_new_gemini_icon()