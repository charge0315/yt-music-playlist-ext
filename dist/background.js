// バックグラウンドサービスワーカー

// インストール時の処理
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Music Playlist Extension installed');

  // デフォルト設定を保存
  chrome.storage.sync.set({
    songsPerChannel: 3,
    playlistName: 'Latest from Subscriptions'
  });
});

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'log') {
    console.log('[Content Script]:', request.message);
  }

  if (request.action === 'error') {
    console.error('[Content Script Error]:', request.message);
  }

  // Cookieを取得するリクエスト
  if (request.action === 'getCookies') {
    (async () => {
      try {
        const cookies = await chrome.cookies.getAll({ domain: '.youtube.com' });
        sendResponse({ success: true, cookies: cookies });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // 非同期レスポンス
  }

  return true;
});

// タブの更新を監視（オプション：将来的な自動実行用）
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('music.youtube.com')) {
    // YouTube Musicページが読み込まれた時の処理
    console.log('YouTube Music page loaded');
    // 自動で content.js を注入
    try {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn('content.js injection warning:', chrome.runtime.lastError.message);
        } else {
          console.log('content.js injected automatically');
        }
      });
    } catch (e) {
      console.error('Failed to inject content.js:', e.message);
    }
  }
});

// タブが切り替えられたときにも注入を試みる（ユーザーが別タブから切り替えてきた場合）
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await new Promise((resolve) => chrome.tabs.get(activeInfo.tabId, resolve));
    if (!tab || !tab.url) return;
    if (tab.url.includes('youtube.com')) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn('content.js injection onActivated warning:', chrome.runtime.lastError.message);
        } else {
          console.log('content.js injected onActivated');
        }
      });
    }
  } catch (e) {
    console.error('onActivated error:', e.message);
  }
});
