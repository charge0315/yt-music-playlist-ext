// ページコンテキストで実行されるスクリプト
// このスクリプトはYouTube Musicのページに注入され、
// 強化された設定取得ロジックでAPIを呼び出す

(function() {
  'use strict';

  /**
   * YouTube Music内部APIキーとコンテキストを取得 (injected.js版)
   */
  const getYTMusicConfig = () => {
    try {
      console.log('[Injected] YouTube Music API設定取得開始');

      // 方法1: window.ytcfg を使用（詳細デバッグ付き）
      if (window.ytcfg) {
        console.log('[Injected] ✓ window.ytcfg が存在');
        console.log('[Injected] ytcfgキー:', Object.keys(window.ytcfg));

        // 複数のパスを試行
        const dataPaths = [
          window.ytcfg.data_,
          window.ytcfg,
          window.ytcfg.get?.('INNERTUBE_API_KEY'),
          window.ytcfg.get?.('INNERTUBE_CONTEXT')
        ];

        for (let i = 0; i < dataPaths.length; i++) {
          const data = dataPaths[i];
          if (data && typeof data === 'object') {
            console.log(`[Injected] データパス${i}:`, Object.keys(data).slice(0, 10));

            const apiKey = data.INNERTUBE_API_KEY;
            const context = data.INNERTUBE_CONTEXT;

            if (apiKey && context) {
              console.log('[Injected] ✓ 方法1成功: API設定を取得 (window.ytcfg)');
              return { apiKey, context };
            }
          }
        }
      } else {
        console.log('[Injected] ✗ window.ytcfg は存在しません');
      }

      // 方法2: ページのscriptタグから抽出
      const scripts = document.querySelectorAll('script');
      console.log(`[Injected] ✓ scriptタグを検索中... (${scripts.length}個)`);

      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        const scriptContent = script.textContent;

        if (scriptContent.includes('INNERTUBE_API_KEY')) {
          console.log(`[Injected] スクリプト${i}でINNERTUBE_API_KEYを発見`);

          // INNERTUBE_API_KEYを抽出
          const apiKeyMatch = scriptContent.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);

          if (apiKeyMatch) {
            const apiKey = apiKeyMatch[1];
            console.log('[Injected] ✓ APIキーを抽出:', apiKey.substring(0, 10) + '...');

            // コンテキストも同じスクリプトから取得を試行
            if (scriptContent.includes('INNERTUBE_CONTEXT')) {
              console.log('[Injected] 同じスクリプトでINNERTUBE_CONTEXTも発見');

              // 複数のパターンでコンテキストを抽出
              const contextPatterns = [
                /"INNERTUBE_CONTEXT"\s*:\s*(\{[^}]+(?:\{[^}]*\}[^}]*)*\})/,
                /"INNERTUBE_CONTEXT"\s*:\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})/,
                /"INNERTUBE_CONTEXT"\s*:\s*(\{[\s\S]*?\n\s*\})/
              ];

              for (let j = 0; j < contextPatterns.length; j++) {
                const contextMatch = scriptContent.match(contextPatterns[j]);
                if (contextMatch) {
                  try {
                    const context = JSON.parse(contextMatch[1]);
                    console.log(`[Injected] ✓ 方法2成功: パターン${j}でコンテキストを解析`);

                    // 重要: ユーザー認証情報を追加
                    if (context.client) {
                      // セッション情報を追加
                      const cookies = document.cookie;
                      if (cookies.includes('SAPISID=') || cookies.includes('APISID=')) {
                        console.log('[Injected] 認証クッキーを検出、コンテキストに追加');

                        // SAP ISIDを抽出してuser contextに追加
                        const sapisidMatch = cookies.match(/SAPISID=([^;]+)/);
                        if (sapisidMatch) {
                          context.user = context.user || {};
                          context.user.sessionIndex = 0;
                          context.user.onBehalfOfUser = undefined;
                        }
                      }
                    }

                    return {
                      apiKey: apiKey,
                      context: context
                    };
                  } catch (e) {
                    console.log(`[Injected] パターン${j}のJSON解析失敗:`, e.message);
                    continue;
                  }
                }
              }
            }

            // コンテキストが取得できない場合、クライアント情報を収集
            console.log('[Injected] コンテキスト取得失敗、追加情報を収集中...');

            const versionMatch = scriptContent.match(/"clientVersion"\s*:\s*"([^"]+)"/);
            const nameMatch = scriptContent.match(/"clientName"\s*:\s*"([^"]+)"/);
            const glMatch = scriptContent.match(/"gl"\s*:\s*"([^"]+)"/);
            const hlMatch = scriptContent.match(/"hl"\s*:\s*"([^"]+)"/);

            const clientVersion = versionMatch ? versionMatch[1] : '1.20251006.03.00';
            const clientName = nameMatch ? nameMatch[1] : 'WEB_REMIX';
            const gl = glMatch ? glMatch[1] : 'JP';
            const hl = hlMatch ? hlMatch[1] : 'ja';

            console.log('[Injected] ✓ 方法2部分成功: APIキー + 推定コンテキスト');

            const context = {
              client: {
                clientName: clientName,
                clientVersion: clientVersion,
                gl: gl,
                hl: hl
              }
            };

            // セッション情報を追加
            const cookies = document.cookie;
            if (cookies.includes('SAPISID=') || cookies.includes('APISID=')) {
              console.log('[Injected] 認証クッキーを検出、ユーザーコンテキストを追加');
              context.user = {
                sessionIndex: 0,
                onBehalfOfUser: undefined
              };
            }

            return {
              apiKey: apiKey,
              context: context
            };
          }
        }
      }

      // 方法3: ページ全体のHTMLから抽出
      console.log('[Injected] ✓ 方法3: ページ全体のHTMLから検索');
      const pageContent = document.documentElement.innerHTML;

      const apiKeyMatch = pageContent.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
      const versionMatch = pageContent.match(/"clientVersion"\s*:\s*"([^"]+)"/);
      const nameMatch = pageContent.match(/"clientName"\s*:\s*"([^"]+)"/);

      if (apiKeyMatch) {
        const apiKey = apiKeyMatch[1];
        const clientVersion = versionMatch ? versionMatch[1] : '1.20251006.03.00';
        const clientName = nameMatch ? nameMatch[1] : 'WEB_REMIX';

        console.log('[Injected] ✓ 方法3成功: ページ全体からAPIキーを抽出');

        const context = {
          client: {
            clientName: clientName,
            clientVersion: clientVersion,
            gl: 'JP',
            hl: 'ja'
          }
        };

        // セッション情報を追加
        const cookies = document.cookie;
        if (cookies.includes('SAPISID=') || cookies.includes('APISID=')) {
          console.log('[Injected] 認証クッキーを検出、ユーザーコンテキストを追加');
          context.user = {
            sessionIndex: 0,
            onBehalfOfUser: undefined
          };
        }

        return {
          apiKey: apiKey,
          context: context
        };
      }

      console.log('[Injected] ✗ すべての方法で失敗');
      return null;
    } catch (error) {
      console.error('[Injected] ✗ 設定取得で例外エラー:', error);
      return null;
    }
  };

  // Content ScriptからのAPIリクエストをリッスン
  document.addEventListener('YTMUSIC_API_REQUEST', async (event) => {
    const { endpoint, body, requestId } = event.detail;

    try {
      console.log(`[Injected] API リクエスト受信: ${endpoint}`);

      // 強化された設定取得ロジックを使用
      const config = getYTMusicConfig();
      if (!config) {
        throw new Error('YouTube Music API設定が見つかりません');
      }

      const { apiKey, context } = config;
      console.log('[Injected] API設定取得成功:', {
        apiKey: apiKey.substring(0, 10) + '...',
        hasContext: !!context,
        hasUser: !!(context.user)
      });

      // APIリクエストを実行
      let requestBody = {
        context: context,
        ...body
      };

      console.log(`[Injected] API呼び出し実行: ${endpoint}`);

      // 認証ヘッダーを準備
      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-AuthUser': '0',
        'X-Origin': 'https://music.youtube.com',
        'Origin': 'https://music.youtube.com'
      };

      // SAPISID認証ヘッダーを追加
      try {
        const cookies = document.cookie;
        const sapisidMatch = cookies.match(/SAPISID=([^;]+)/);

        if (sapisidMatch) {
          const sapisid = sapisidMatch[1];
          const origin = 'https://music.youtube.com';
          const timestamp = Math.floor(Date.now() / 1000);

          // SAPISID hash生成
          const stringToHash = `${timestamp} ${sapisid} ${origin}`;
          const encoder = new TextEncoder();
          const data = encoder.encode(stringToHash);

          // SHA-1ハッシュを生成
          const hashBuffer = await crypto.subtle.digest('SHA-1', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          headers['Authorization'] = `SAPISIDHASH ${timestamp}_${hashHex}`;
          console.log('[Injected] SAPISID認証ヘッダーを追加');
        }

        // セッショントークンを追加
        const sessionTokenMatch = cookies.match(/YSC=([^;]+)/);
        if (sessionTokenMatch) {
          headers['X-Goog-Visitor-Id'] = sessionTokenMatch[1];
        }

        // 追加の認証ヘッダー
        headers['X-YouTube-Client-Name'] = '67';
        // Prefer clientVersion from context when available so requests look like the UI's
        try {
          const clientVersionFromContext = context && context.client && context.client.clientVersion;
          headers['X-YouTube-Client-Version'] = clientVersionFromContext ? clientVersionFromContext : '1.20251006.03.00';
        } catch (e) {
          headers['X-YouTube-Client-Version'] = '1.20251006.03.00';
        }

      } catch (authError) {
        console.log('[Injected] 認証ヘッダー生成エラー:', authError.message);
      }

      // API URL構築 - YouTube Music実際のエンドポイント形式を使用
      let apiUrl = `https://music.youtube.com/youtubei/v1/${endpoint}?key=${apiKey}`;

      // エンドポイント固有の調整
      if (endpoint === 'playlist/create') {
        // 実際のYouTube Musicプレイリスト作成APIを使用
        apiUrl = `https://music.youtube.com/youtubei/v1/playlist/create?key=${apiKey}`;

        // 基本的なリクエストボディ（nullやundefinedを含めない）
        requestBody = {
          context: context,
          title: body.title || body.playlistTitle || 'New Playlist',
          privacyStatus: body.privacyStatus || 'PRIVATE'  // PRIVATE, UNLISTED, PUBLIC
        };

        // オプションのパラメータを追加（値がある場合のみ）
        if (body.description) {
          requestBody.description = body.description;
        }

        // videoIdsは初期化時に動画を追加する場合のみ指定
        if (body.videoIds && body.videoIds.length > 0) {
          requestBody.videoIds = body.videoIds;
        }
      } else if (endpoint === 'playlist/delete') {
        // プレイリスト削除
        apiUrl = `https://music.youtube.com/youtubei/v1/playlist/delete?key=${apiKey}`;
        requestBody = {
          context: context,
          playlistId: body.playlistId
        };
      } else if (endpoint === 'browse/edit_playlist') {
        // プレイリスト編集（動画追加など）
        apiUrl = `https://music.youtube.com/youtubei/v1/browse/edit_playlist?key=${apiKey}`;

        // actionsが正しい形式か確認および補完
        const rawActions = body.actions || [];
        const enrichedActions = (rawActions || []).map(a => ({
          action: a.action,
          addedVideoId: a.addedVideoId || a.addedVideoId,
          dedupeOption: a.dedupeOption || 'DEDUPE_OPTION_CHECK',
          addedVideoPositionIfManualSort: (typeof a.addedVideoPositionIfManualSort === 'number') ? a.addedVideoPositionIfManualSort : 0,
          ...(a.params ? { params: a.params } : {})
        }));

        // playlistId 正規化（VL プレフィックスの補完/除去はページ側で試行）
        let pid = body.playlistId || '';
        if (typeof pid === 'string' && !pid) pid = '';

        // params のデフォルト（UIのリクエストで見られるもの）
        const editParams = (body && body.params) ? body.params : 'YAE%3D';

        // 最終的な requestBody を構築
        requestBody = {
          context: context,
          playlistId: pid,
          actions: enrichedActions,
          params: editParams,
          // include clickTracking if caller provided it (UI requests often include this)
          ...(body && body.clickTracking ? { clickTracking: body.clickTracking } : {}),
          // ルートレベルの dedupeOption を含める場合があるため、渡されたものを透過的に追加
          ...(body && body.dedupeOption ? { dedupeOption: body.dedupeOption } : {})
        };

        console.log('[Injected] browse/edit_playlist actions (enriched):', JSON.stringify(enrichedActions, null, 2));
      } else if (endpoint === 'playlist/get_add_to_playlist' ||
                 endpoint === 'browse/add_to_playlist' ||
                 endpoint === 'playlist/add_videos') {
        // これらのエンドポイントは存在しないため、browse/edit_playlistに変換
        console.log(`[Injected] ⚠️ エンドポイント ${endpoint} は存在しません。browse/edit_playlistに変換します`);

        apiUrl = `https://music.youtube.com/youtubei/v1/browse/edit_playlist?key=${apiKey}`;

        // videoIdsをactionsに変換
        const videoIds = body.videoIds || (body.videoId ? [body.videoId] : []);
        const actions = videoIds.map(videoId => ({
          action: 'ACTION_ADD_VIDEO',
          addedVideoId: videoId
        }));

        requestBody = {
          context: context,
          playlistId: body.playlistId,
          actions: actions
        };

        console.log('[Injected] 変換後のactions:', JSON.stringify(actions, null, 2));
      }

      console.log('[Injected] 最終API URL:', apiUrl);
      try {
        console.log('[Injected] 最終送信ヘッダー (raw):', JSON.stringify(headers));
      } catch (e) {
        console.log('[Injected] 最終送信ヘッダー: (非表示)');
      }
      try {
        console.log('[Injected] 最終リクエストボディ (raw):', JSON.stringify(requestBody, null, 2));
      } catch (e) {
        console.log('[Injected] 最終リクエストボディ: (非表示)');
      }

      // Temporary debug aid: expose last request for easy inspection from page console
      try {
        // Expose last request for debugging. Keep fields present so user can copy full payload.
        const lastReq = { apiUrl, headers, requestBody };
        try {
          Object.defineProperty(window, '__YTMUSIC_LAST_REQUEST__', { value: lastReq, configurable: true, writable: true });
        } catch (e) {
          // fallback assignment if defineProperty fails
          window.__YTMUSIC_LAST_REQUEST__ = lastReq;
        }
      } catch (e) {
        // ignore
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Injected] API呼び出し失敗:', response.status, errorText);

        // Content Scriptが診断できるよう、エラー時にヘッダーとボディを含めて返す
        document.dispatchEvent(new CustomEvent('YTMUSIC_API_RESPONSE', {
          detail: {
            requestId: requestId,
            success: false,
            error: `status=${response.status} - ${errorText}`,
            debug: {
              apiUrl: apiUrl,
              headers: headers,
              requestBody: requestBody,
              status: response.status,
              responseText: errorText
            }
          }
        }));

        throw new Error(`API呼び出しに失敗: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[Injected] API呼び出し成功: ${endpoint}`);

      // Content Scriptにレスポンスを送信
      document.dispatchEvent(new CustomEvent('YTMUSIC_API_RESPONSE', {
        detail: {
          requestId: requestId,
          success: true,
          data: data
        }
      }));

    } catch (error) {
      console.error('[Injected] API呼び出しエラー:', error);
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

  // SAPISID認証ヘッダーを生成する関数を追加
  document.addEventListener('YTMUSIC_GET_AUTH_HEADERS', async (event) => {
    const requestId = event.detail.requestId;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-AuthUser': '0',
        'X-Origin': window.location.origin,
        'Origin': window.location.origin
      };

      // SAPISID認証ヘッダーを追加
      const cookies = document.cookie;
      const sapisidMatch = cookies.match(/SAPISID=([^;]+)/);

      if (sapisidMatch) {
        const sapisid = sapisidMatch[1];
        const origin = window.location.origin;
        const timestamp = Math.floor(Date.now() / 1000);

        // SAPISID hash生成
        const stringToHash = `${timestamp} ${sapisid} ${origin}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(stringToHash);

        // SHA-1ハッシュを生成
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        headers['Authorization'] = `SAPISIDHASH ${timestamp}_${hashHex}`;
        console.log('[Injected] SAPISID認証ヘッダーを生成');
      }

      // セッショントークンを追加
      const sessionTokenMatch = cookies.match(/YSC=([^;]+)/);
      if (sessionTokenMatch) {
        headers['X-Goog-Visitor-Id'] = sessionTokenMatch[1];
      }

      // 追加の認証ヘッダー
      headers['X-YouTube-Client-Name'] = '67';
      try {
        // try to grab a client version from page ytcfg or context if available
        const clientVersion = (window.ytcfg && window.ytcfg.get && window.ytcfg.get('INNERTUBE_CONTEXT') && window.ytcfg.get('INNERTUBE_CONTEXT').client && window.ytcfg.get('INNERTUBE_CONTEXT').client.clientVersion) || '1.20251006.03.00';
        headers['X-YouTube-Client-Version'] = clientVersion;
      } catch (e) {
        headers['X-YouTube-Client-Version'] = '1.20251006.03.00';
      }

      // Content Scriptに認証ヘッダーを返送
      document.dispatchEvent(new CustomEvent('YTMUSIC_AUTH_HEADERS_RESPONSE', {
        detail: {
          requestId: requestId,
          success: true,
          headers: headers
        }
      }));

    } catch (error) {
      console.error('[Injected] 認証ヘッダー生成エラー:', error);
      // Content Scriptにエラーを送信
      document.dispatchEvent(new CustomEvent('YTMUSIC_AUTH_HEADERS_RESPONSE', {
        detail: {
          requestId: requestId,
          success: false,
          error: error.message
        }
      }));
    }
  });

  console.log('[Injected] YouTube Music API Injected Script: Loaded (Enhanced)');
})();
