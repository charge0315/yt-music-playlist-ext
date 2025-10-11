// ページコンテキストで実行されるスクリプト
// このスクリプトはYouTube Musicのページに注入され、
// window.ytcfgにアクセスしてAPIを呼び出す

(function() {
  'use strict';

  // Content ScriptからのAPIリクエストをリッスン
  document.addEventListener('YTMUSIC_API_REQUEST', async (event) => {
    const { endpoint, body, requestId } = event.detail;

    try {
      // window.ytcfgからAPI設定を取得
      const ytcfg = window.ytcfg;
      if (!ytcfg || !ytcfg.data_) {
        throw new Error('YouTube Music API設定が見つかりません');
      }

      const apiKey = ytcfg.data_.INNERTUBE_API_KEY;
      const context = ytcfg.data_.INNERTUBE_CONTEXT;

      if (!apiKey || !context) {
        throw new Error('APIキーまたはコンテキストが見つかりません');
      }

      // APIリクエストを実行
      const requestBody = {
        context: context,
        ...body
      };

      const response = await fetch(`https://music.youtube.com/youtubei/v1/${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-AuthUser': '0',
          'X-Origin': 'https://music.youtube.com',
          'Origin': 'https://music.youtube.com'
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API呼び出しに失敗: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Content Scriptにレスポンスを送信
      document.dispatchEvent(new CustomEvent('YTMUSIC_API_RESPONSE', {
        detail: {
          requestId: requestId,
          success: true,
          data: data
        }
      }));

    } catch (error) {
      // Content Scriptにエラーを送信
      document.dispatchEvent(new CustomEvent('YTMUSIC_API_RESPONSE', {
        detail: {
          requestId: requestId,
          success: false,
          error: error.message
        }
      }));
    }
  });

  console.log('YouTube Music API Injected Script: Loaded');
})();
