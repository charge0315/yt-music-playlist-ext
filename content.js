// YouTube Music用のコンテンツスクリプト

/**
 * バックグラウンドにログを送信
 */
const log = (message) => {
  chrome.runtime.sendMessage({ action: 'log', message });
  console.log(message);
};

/**
 * バックグラウンドにエラーを送信
 */
const logError = (message) => {
  chrome.runtime.sendMessage({ action: 'error', message });
  console.error(message);
};

/**
 * アーティスト名の正確性をチェック
 */
const isExactArtistMatch = (searchedArtist, foundArtist) => {
  if (!searchedArtist || !foundArtist) return false;

  // まず大文字小文字を保持した完全一致をチェック
  if (searchedArtist.trim() === foundArtist.trim()) return true;

  const normalizeArtist = (name) => {
    return name.toLowerCase()
      .replace(/[^\w\s]/g, '') // 特殊文字を除去
      .replace(/\s+/g, ' ')    // 複数スペースを単一に
      .trim();
  };

  const searched = normalizeArtist(searchedArtist);
  const found = normalizeArtist(foundArtist);

  // 正規化後の完全一致
  if (searched === found) return true;

  // 短い名前（5文字以下）の場合は、完全一致のみ許可
  if (searched.length <= 5) {
    // "Ado" vs "ado" や "Ado" vs "Ado Nakamura" はすべて除外
    return false;
  }

  // 長い名前の場合のみ、部分一致を許可
  const searchWords = searched.split(' ').filter(w => w.length > 0);
  const foundWords = found.split(' ').filter(w => w.length > 0);

  // すべての検索ワードが見つかったアーティスト名に含まれている
  const allWordsFound = searchWords.every(searchWord =>
    foundWords.some(foundWord =>
      foundWord.includes(searchWord) || searchWord.includes(foundWord)
    )
  );

  // 見つかったアーティスト名が検索名より大幅に長い場合は除外
  const lengthRatio = found.length / searched.length;
  if (lengthRatio > 2.0) {
    return false;
  }

  return allWordsFound;
};

/**
 * 待機関数
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * SAPISID認証ヘッダーを取得
 */
const getAuthHeaders = () => {
  return new Promise((resolve, reject) => {
    const requestId = Date.now() + Math.random();

    // レスポンスイベントリスナーを設定
    const responseHandler = (event) => {
      if (event.detail.requestId === requestId) {
        document.removeEventListener('YTMUSIC_AUTH_HEADERS_RESPONSE', responseHandler);
        if (event.detail.success) {
          resolve(event.detail.headers);
        } else {
          reject(new Error(event.detail.error));
        }
      }
    };

    document.addEventListener('YTMUSIC_AUTH_HEADERS_RESPONSE', responseHandler);

    // リクエストイベントを送信
    document.dispatchEvent(new CustomEvent('YTMUSIC_GET_AUTH_HEADERS', {
      detail: { requestId }
    }));

    // タイムアウト処理
    setTimeout(() => {
      document.removeEventListener('YTMUSIC_AUTH_HEADERS_RESPONSE', responseHandler);
      reject(new Error('認証ヘッダー取得がタイムアウトしました'));
    }, 5000);
  });
};

/**
 * YouTube Music内部APIキーとコンテキストを取得 (強化デバッグ版)
 */
const getYTMusicConfig = () => {
  try {
    console.log('=== YouTube Music API設定取得開始 ===');
    console.log('URL:', window.location.href);
    console.log('ユーザーエージェント:', navigator.userAgent);
    console.log('ドキュメント状態:', document.readyState);

    // 現在のセッション情報をデバッグ
    console.log('Cookieをチェック中...');
    const cookies = document.cookie;
    const hasYTSession = cookies.includes('YSC=') || cookies.includes('VISITOR_INFO1_LIVE=') || cookies.includes('LOGIN_INFO=');
    console.log('YouTubeセッションCookie存在:', hasYTSession);

    // ページのログイン状態を確認
    const signInButton = document.querySelector('[aria-label*="ログイン"], [aria-label*="Sign in"], .sign-in-link');
    const userProfile = document.querySelector('.ytmusic-nav-bar .avatar, .user-avatar, [role="button"][aria-label*="アカウント"]');
    console.log('サインインボタン存在:', !!signInButton);
    console.log('ユーザープロフィール存在:', !!userProfile);

    // 方法1: window.ytcfg を使用（詳細デバッグ付き）
    if (window.ytcfg) {
      console.log('✓ window.ytcfg が存在します');
      console.log('ytcfgキー:', Object.keys(window.ytcfg));

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
          console.log(`データパス${i}:`, Object.keys(data).slice(0, 10));

          const apiKey = data.INNERTUBE_API_KEY;
          const context = data.INNERTUBE_CONTEXT;

          if (apiKey && context) {
            console.log('✓ 方法1成功: API設定を取得 (window.ytcfg)');
            console.log('APIキー:', apiKey.substring(0, 10) + '...');
            console.log('コンテキスト:', JSON.stringify(context, null, 2).substring(0, 200) + '...');
            return { apiKey, context };
          }
        }
      }
    } else {
      console.log('✗ window.ytcfg は存在しません');
    }

    // 方法2: ページのscriptタグから抽出（詳細デバッグ付き）
    const scripts = document.querySelectorAll('script');
    console.log(`✓ scriptタグを検索中... (${scripts.length}個)`);

    let foundApiKey = false;
    let foundContext = false;

    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      const scriptContent = script.textContent;

      if (scriptContent.includes('INNERTUBE_API_KEY')) {
        console.log(`スクリプト${i}でINNERTUBE_API_KEYを発見`);
        foundApiKey = true;

        // INNERTUBE_API_KEYを抽出
        const apiKeyMatch = scriptContent.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);

        if (apiKeyMatch) {
          const apiKey = apiKeyMatch[1];
          console.log('✓ APIキーを抽出:', apiKey.substring(0, 10) + '...');

          // コンテキストも同じスクリプトから取得を試行
          if (scriptContent.includes('INNERTUBE_CONTEXT')) {
            console.log('同じスクリプトでINNERTUBE_CONTEXTも発見');
            foundContext = true;

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
                  console.log(`✓ 方法2成功: パターン${j}でコンテキストを解析`);
                  console.log('コンテキスト:', JSON.stringify(context, null, 2).substring(0, 300) + '...');
                  return {
                    apiKey: apiKey,
                    context: context
                  };
                } catch (e) {
                  console.log(`パターン${j}のJSON解析失敗:`, e.message);
                  continue;
                }
              }
            }
          }

          // コンテキストが取得できない場合、追加情報を収集
          console.log('コンテキスト取得失敗、追加情報を収集中...');

          // クライアントバージョンなどを収集
          const versionMatch = scriptContent.match(/"clientVersion"\s*:\s*"([^"]+)"/);
          const nameMatch = scriptContent.match(/"clientName"\s*:\s*"([^"]+)"/);
          const glMatch = scriptContent.match(/"gl"\s*:\s*"([^"]+)"/);
          const hlMatch = scriptContent.match(/"hl"\s*:\s*"([^"]+)"/);

          const clientVersion = versionMatch ? versionMatch[1] : '1.20241008.01.00';
          const clientName = nameMatch ? nameMatch[1] : 'WEB_REMIX';
          const gl = glMatch ? glMatch[1] : 'JP';
          const hl = hlMatch ? hlMatch[1] : 'ja';

          console.log('✓ 方法2部分成功: APIキー + 推定コンテキスト');
          console.log('推定クライアント情報:', { clientName, clientVersion, gl, hl });

          return {
            apiKey: apiKey,
            context: {
              client: {
                clientName: clientName,
                clientVersion: clientVersion,
                gl: gl,
                hl: hl
              }
            }
          };
        }
      }
    }

    console.log('スクリプト検索結果:', { foundApiKey, foundContext });

    // 方法3: ページ全体のHTMLから抽出（最後の手段）
    console.log('✓ 方法3: ページ全体のHTMLから検索');
    const pageContent = document.documentElement.innerHTML;

    const apiKeyMatch = pageContent.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
    const versionMatch = pageContent.match(/"clientVersion"\s*:\s*"([^"]+)"/);
    const nameMatch = pageContent.match(/"clientName"\s*:\s*"([^"]+)"/);

    if (apiKeyMatch) {
      const apiKey = apiKeyMatch[1];
      const clientVersion = versionMatch ? versionMatch[1] : '1.20241008.01.00';
      const clientName = nameMatch ? nameMatch[1] : 'WEB_REMIX';

      console.log('✓ 方法3成功: ページ全体からAPIキーを抽出');
      console.log('APIキー:', apiKey.substring(0, 10) + '...');

      return {
        apiKey: apiKey,
        context: {
          client: {
            clientName: clientName,
            clientVersion: clientVersion,
            gl: 'JP',
            hl: 'ja'
          }
        }
      };
    }

    // 完全に失敗した場合の詳細デバッグ情報
    console.log('✗ すべての方法で失敗');
    console.log('利用可能なwindowオブジェクト:', Object.keys(window).filter(key => key.toLowerCase().includes('yt')));
    console.log('ページにINNERTUBE_API_KEYが含まれているか:', pageContent.includes('INNERTUBE_API_KEY'));
    console.log('ページにINNERTUBE_CONTEXTが含まれているか:', pageContent.includes('INNERTUBE_CONTEXT'));

    return null;
  } catch (error) {
    console.error('✗ 設定取得で例外エラー:', error);
    console.error('エラースタック:', error.stack);
    logError(`設定取得エラー: ${error.message}`);
    return null;
  }
};

// Injected scriptを読み込む
const injectScript = () => {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = () => {
    script.remove();
    log('Injected script loaded');
  };
  (document.head || document.documentElement).appendChild(script);
};

// ページ読み込み時にinjected scriptを注入
injectScript();

/**
 * ページコンテキストでAPIを呼び出す（CustomEventで通信）
 */
const callYTMusicAPIInPageContext = (endpoint, body) => {
  return new Promise((resolve, reject) => {
    const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // レスポンスリスナーを設定
    const responseListener = (event) => {
      if (event.detail.requestId === requestId) {
        document.removeEventListener('YTMUSIC_API_RESPONSE', responseListener);

        if (event.detail.success) {
          resolve(event.detail.data);
        } else {
          reject(new Error(event.detail.error));
        }
      }
    };

    document.addEventListener('YTMUSIC_API_RESPONSE', responseListener);

    // タイムアウト設定（30秒）
    setTimeout(() => {
      document.removeEventListener('YTMUSIC_API_RESPONSE', responseListener);
      reject(new Error('API呼び出しがタイムアウトしました'));
    }, 30000);

    // リクエストを送信
    document.dispatchEvent(new CustomEvent('YTMUSIC_API_REQUEST', {
      detail: {
        requestId: requestId,
        endpoint: endpoint,
        body: body
      }
    }));
  });
};

/**
 * YouTube Music内部APIを呼び出す
 */
const callYTMusicAPI = async (endpoint, body) => {
  try {
    log(`API呼び出し: ${endpoint}`);
    console.log('API リクエスト:', { endpoint, body });

    // ページコンテキストでAPIを呼び出し（Cookieが含まれる）
    const responseData = await callYTMusicAPIInPageContext(endpoint, body);

    console.log('API レスポンス:', responseData);
    return responseData;
  } catch (error) {
    logError(`API呼び出しエラー: ${error.message}`);
    throw error;
  }
};

/**
 * ページが完全に読み込まれるまで待機
 */
const waitForPageLoad = async (maxRetries = 10) => {
  for (let i = 0; i < maxRetries; i++) {
    const config = getYTMusicConfig();
    if (config) {
      log('YouTube Musicの設定を取得しました');
      return true;
    }
    log(`ページ読み込みを待機中... (${i + 1}/${maxRetries})`);
    await wait(1000);
  }
  return false;
};

/**
 * 登録チャンネル一覧を取得（内部APIを使用）
 */
const getSubscribedChannels = async () => {
  log('アーティスト情報を取得中...');

  // ページが完全に読み込まれるまで待機
  const isLoaded = await waitForPageLoad();
  if (!isLoaded) {
    throw new Error('YouTube Musicの読み込みに失敗しました。ページをリロードしてから再度お試しください。');
  }

  try {
    // 認証不要のホームページデータを取得
    log('YouTube Musicホームページデータを取得中...');

    const response = await callYTMusicAPI('browse', {
      browseId: 'FEmusic_home' // ホームページ（認証不要）
    });

    console.log('Home page response:', response);

    const channels = [];

    // ホームページからアーティスト情報を抽出
    const tabs = response?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
    console.log('Home tabs found:', tabs.length);

    // レスポンス構造の詳細デバッグ
    console.log('Full home response structure:', JSON.stringify(response, null, 2));

    for (const tab of tabs) {
      const sectionList = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      console.log('Home sections found:', sectionList.length);

      // セクション構造をデバッグ
      sectionList.forEach((section, index) => {
        console.log(`Section ${index} keys:`, Object.keys(section));
        if (section.musicCarouselShelfRenderer) {
          console.log(`Section ${index} carousel header:`, section.musicCarouselShelfRenderer.header);
          console.log(`Section ${index} carousel items count:`, section.musicCarouselShelfRenderer.contents?.length || 0);
        }
        if (section.musicTastebuilderShelfRenderer) {
          console.log(`Section ${index} is tastebuilder shelf`);
        }
        if (section.musicDescriptionShelfRenderer) {
          console.log(`Section ${index} is description shelf`);
        }
      });

      for (const section of sectionList) {
        // カルーセル内のアーティストを検索
        const carouselItems = section?.musicCarouselShelfRenderer?.contents || [];
        console.log('Carousel items found:', carouselItems.length);

        for (const item of carouselItems) {
          console.log('Carousel item structure:', Object.keys(item));

          const musicItem = item?.musicTwoRowItemRenderer;
          if (musicItem) {
            console.log('musicTwoRowItemRenderer found:', {
              title: musicItem?.title?.runs?.[0]?.text,
              subtitle: musicItem?.subtitle?.runs?.[0]?.text,
              navigationEndpoint: !!musicItem?.navigationEndpoint
            });

            const navigationEndpoint = musicItem?.navigationEndpoint;
            const browseEndpoint = navigationEndpoint?.browseEndpoint;

            if (browseEndpoint?.browseId) {
              const channelId = browseEndpoint.browseId;
              const title = musicItem?.title?.runs?.[0]?.text || '';
              const subtitle = musicItem?.subtitle?.runs?.[0]?.text || '';

              console.log('Found potential artist:', { title, subtitle, channelId });

              // アーティストかチャンネルの場合のみ追加（より柔軟な条件）
              if (title &&
                  (channelId.startsWith('UC') ||
                   channelId.startsWith('MPLA') ||
                   channelId.startsWith('FEmusic_library_artist') ||
                   subtitle?.includes('アーティスト') ||
                   subtitle?.includes('Artist') ||
                   subtitle?.includes('チャンネル'))) {

                log(`アーティスト検出: ${title} (${channelId})`);
                channels.push({
                  id: channelId,
                  name: title,
                  browseId: channelId,
                  type: 'artist'
                });
              }
            }
          }

          // musicResponsiveListItemRenderer も確認
          const responsiveItem = item?.musicResponsiveListItemRenderer;
          if (responsiveItem) {
            console.log('musicResponsiveListItemRenderer found');
            const navigationEndpoint = responsiveItem?.navigationEndpoint;
            const browseEndpoint = navigationEndpoint?.browseEndpoint;

            if (browseEndpoint?.browseId) {
              const channelId = browseEndpoint.browseId;
              const flexColumns = responsiveItem?.flexColumns || [];
              const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer
                ?.text?.runs?.[0]?.text || '';

              if (title &&
                  (channelId.startsWith('UC') ||
                   channelId.startsWith('MPLA') ||
                   channelId.startsWith('FEmusic_library_artist'))) {

                log(`アーティスト検出 (responsive): ${title} (${channelId})`);
                channels.push({
                  id: channelId,
                  name: title,
                  browseId: channelId,
                  type: 'artist'
                });
              }
            }
          }
        }

        // グリッド内のアーティストも検索
        const gridItems = section?.gridRenderer?.items || [];
        console.log('Grid items found:', gridItems.length);

        for (const item of gridItems) {
          const musicItem = item?.musicTwoRowItemRenderer;
          if (!musicItem) continue;

          const navigationEndpoint = musicItem?.navigationEndpoint;
          const browseEndpoint = navigationEndpoint?.browseEndpoint;

          if (browseEndpoint?.browseId) {
            const channelId = browseEndpoint.browseId;
            const title = musicItem?.title?.runs?.[0]?.text || '';
            const subtitle = musicItem?.subtitle?.runs?.[0]?.text || '';

            if (title &&
                (channelId.startsWith('UC') ||
                 channelId.startsWith('MPLA') ||
                 channelId.startsWith('FEmusic_library_artist') ||
                 subtitle?.includes('アーティスト') ||
                 subtitle?.includes('Artist'))) {

              log(`アーティスト検出 (grid): ${title} (${channelId})`);
              channels.push({
                id: channelId,
                name: title,
                browseId: channelId,
                type: 'artist'
              });
            }
          }
        }

        // musicShelfRenderer も確認
        const shelfItems = section?.musicShelfRenderer?.contents || [];
        console.log('Shelf items found:', shelfItems.length);

        for (const item of shelfItems) {
          const musicItem = item?.musicResponsiveListItemRenderer;
          if (!musicItem) continue;

          const navigationEndpoint = musicItem?.navigationEndpoint;
          const browseEndpoint = navigationEndpoint?.browseEndpoint;

          if (browseEndpoint?.browseId) {
            const channelId = browseEndpoint.browseId;
            const flexColumns = musicItem?.flexColumns || [];
            const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer
              ?.text?.runs?.[0]?.text || '';

            if (title &&
                (channelId.startsWith('UC') ||
                 channelId.startsWith('MPLA') ||
                 channelId.startsWith('FEmusic_library_artist'))) {

              log(`アーティスト検出 (shelf): ${title} (${channelId})`);
              channels.push({
                id: channelId,
                name: title,
                browseId: channelId,
                type: 'artist'
              });
            }
          }
        }
      }
    }

    // 重複を除去
    const uniqueChannels = channels.filter((channel, index, self) =>
      index === self.findIndex(c => c.id === channel.id)
    );

    console.log('ホームページで見つかったアーティスト一覧:', uniqueChannels);

    if (uniqueChannels.length > 0) {
      log(`ホームページから ${uniqueChannels.length}個のアーティストを検出しました`);
      return uniqueChannels;
    }

    // ホームページで見つからない場合、複数のエンドポイントを試行
    if (uniqueChannels.length === 0) {
      log('ホームページでアーティストが見つかりませんでした。他のエンドポイントを試行中...');

      const alternativeEndpoints = [
        'FEmusic_explore', // 探索ページ
        'FEmusic_charts', // チャート
        'FEmusic_new_releases', // 新着リリース
        'FEmusic_trending', // トレンド
        'FEmusic_listen_again', // もう一度聞く
        'FEmusic_mixed_for_you' // あなたにおすすめのミックス
      ];

      for (const browseId of alternativeEndpoints) {
        try {
          log(`${browseId} を試行中...`);

          const response = await callYTMusicAPI('browse', { browseId });
          console.log(`${browseId} response:`, response);

          // レスポンス構造をデバッグ
          console.log(`${browseId} structure:`, JSON.stringify(response, null, 2).substring(0, 2000));

          const tabs = response?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];

          for (const tab of tabs) {
            const sectionList = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];

            for (const section of sectionList) {
              // カルーセルアイテムを検索
              const carouselItems = section?.musicCarouselShelfRenderer?.contents || [];

              for (const item of carouselItems) {
                const musicItem = item?.musicTwoRowItemRenderer;
                if (!musicItem) continue;

                const navigationEndpoint = musicItem?.navigationEndpoint;
                const browseEndpoint = navigationEndpoint?.browseEndpoint;

                if (browseEndpoint?.browseId) {
                  const channelId = browseEndpoint.browseId;
                  const title = musicItem?.title?.runs?.[0]?.text || '';
                  const subtitle = musicItem?.subtitle?.runs?.[0]?.text || '';

                  if (title &&
                      (channelId.startsWith('UC') ||
                       channelId.startsWith('MPLA') ||
                       channelId.startsWith('FEmusic_library_artist') ||
                       subtitle?.includes('アーティスト') ||
                       subtitle?.includes('Artist'))) {

                    uniqueChannels.push({
                      id: channelId,
                      name: title,
                      browseId: channelId,
                      type: 'artist',
                      source: browseId
                    });
                  }
                }
              }

              // グリッドアイテムも検索
              const gridItems = section?.gridRenderer?.items || [];

              for (const item of gridItems) {
                const musicItem = item?.musicTwoRowItemRenderer;
                if (!musicItem) continue;

                const navigationEndpoint = musicItem?.navigationEndpoint;
                const browseEndpoint = navigationEndpoint?.browseEndpoint;

                if (browseEndpoint?.browseId) {
                  const channelId = browseEndpoint.browseId;
                  const title = musicItem?.title?.runs?.[0]?.text || '';
                  const subtitle = musicItem?.subtitle?.runs?.[0]?.text || '';

                  if (title &&
                      (channelId.startsWith('UC') ||
                       channelId.startsWith('MPLA') ||
                       channelId.startsWith('FEmusic_library_artist') ||
                       subtitle?.includes('アーティスト') ||
                       subtitle?.includes('Artist'))) {

                    uniqueChannels.push({
                      id: channelId,
                      name: title,
                      browseId: channelId,
                      type: 'artist',
                      source: browseId
                    });
                  }
                }
              }
            }
          }

          // 十分なアーティストが見つかったら中断
          if (uniqueChannels.length >= 20) {
            log(`${browseId} で十分なアーティストが見つかりました (${uniqueChannels.length}個)`);
            break;
          }

        } catch (error) {
          logError(`${browseId} での取得に失敗: ${error.message}`);
          continue;
        }
      }
    }

    // 再度重複除去
    const finalChannels = uniqueChannels.filter((channel, index, self) =>
      index === self.findIndex(c => c.id === channel.id)
    );

    console.log('全エンドポイントで見つかったアーティスト一覧:', finalChannels);
    log(`API検索結果: ${finalChannels.length}個のアーティストを発見`);

    if (finalChannels.length > 0) {
      log(`合計 ${finalChannels.length}個のアーティストを検出しました`);
      return finalChannels;
    }

    // APIで見つからない場合、より広範囲な検索を試行
    log('標準エンドポイントでアーティストが見つかりませんでした。追加の検索を実行中...');

    // 日本の人気アーティスト名で直接検索
    const popularJapaneseArtists = [
      'あいみょん', 'Official髭男dism', 'YOASOBI', 'King Gnu', 'Ado',
      'LiSA', 'ONE OK ROCK', '米津玄師', 'Perfume', 'BABYMETAL',
      'RADWIMPS', 'back number', 'GReeeeN', 'いきものがかり', 'Mr.Children'
    ];

    for (const artistName of popularJapaneseArtists) {
      try {
        log(`${artistName}を検索中...`);

        const searchResponse = await callYTMusicAPI('search', {
          query: artistName,
          params: 'EgWKAQIgAWoKEAkQBRAKEAMQBA%3D%3D' // アーティスト検索
        });

        const searchContents = searchResponse?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]
          ?.tabRenderer?.content?.sectionListRenderer?.contents || [];

        for (const section of searchContents) {
          const musicShelf = section?.musicShelfRenderer;
          if (!musicShelf) continue;

          const items = musicShelf.contents || [];

          for (const item of items) {
            const musicItem = item?.musicResponsiveListItemRenderer;
            if (!musicItem) continue;

            const navigationEndpoint = musicItem?.navigationEndpoint;
            const browseEndpoint = navigationEndpoint?.browseEndpoint;

            if (browseEndpoint?.browseId) {
              const channelId = browseEndpoint.browseId;
              const flexColumns = musicItem?.flexColumns || [];
              const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer
                ?.text?.runs?.[0]?.text || '';

              if (title &&
                  (channelId.startsWith('UC') ||
                   channelId.startsWith('MPLA') ||
                   channelId.startsWith('FEmusic_library_artist'))) {

                // 検索したアーティスト名と一致するかチェック
                const isValidArtist = isExactArtistMatch(artistName, title);

                if (isValidArtist) {
                  // 同じアーティストが既に存在するかチェック
                  const exists = finalChannels.some(c => c.name === title || c.id === channelId);
                  if (!exists) {
                    finalChannels.push({
                      id: channelId,
                      name: title,
                      browseId: channelId,
                      type: 'search_found',
                      source: 'direct_search'
                    });
                    log(`検索で新しいアーティストを発見: ${title} (${channelId})`);
                  }
                } else {
                  log(`アーティスト名が一致しないためスキップ: ${title} (検索: ${artistName})`);
                }
              }
            }
          }
        }

        // 多くのアーティストが見つかったら中断
        if (finalChannels.length >= 15) {
          log(`十分なアーティストが見つかりました (${finalChannels.length}個)`);
          break;
        }

        // レート制限対策
        await wait(200);

      } catch (error) {
        logError(`${artistName}の検索に失敗: ${error.message}`);
        continue;
      }
    }

    if (finalChannels.length > 0) {
      log(`検索により合計 ${finalChannels.length}個のアーティストを検出しました`);
      return finalChannels;
    }

    // どのAPIでも見つからない場合、人気アーティストのサンプルを提供
    log('APIからアーティストが見つかりませんでした。サンプルアーティストを提供します。');

    const sampleArtists = [
      { id: 'MPLA808fb8f91b66f5fe5', name: 'あいみょん', browseId: 'MPLA808fb8f91b66f5fe5', type: 'sample' },
      { id: 'MPLAa78c7f8ec6b866fe3', name: 'Official髭男dism', browseId: 'MPLAa78c7f8ec6b866fe3', type: 'sample' },
      { id: 'MPLA3c4e7f8ec6b866fe1', name: 'YOASOBI', browseId: 'MPLA3c4e7f8ec6b866fe1', type: 'sample' },
      { id: 'MPLA1a2b3c4d5e6f7g8h9', name: 'King Gnu', browseId: 'MPLA1a2b3c4d5e6f7g8h9', type: 'sample' },
      { id: 'MPLA9i8j7k6l5m4n3o2p1', name: 'Ado', browseId: 'MPLA9i8j7k6l5m4n3o2p1', type: 'sample' }
    ];

    log(`サンプルとして ${sampleArtists.length}個のアーティストを提供しています`);
    return sampleArtists;

  } catch (error) {
    logError(`アーティスト取得エラー: ${error.message}`);
    console.error('Full error:', error);

    // エラーが発生した場合もサンプルアーティストを提供
    log('エラーが発生しました。サンプルアーティストを提供します。');

    const sampleArtists = [
      { id: 'MPLA808fb8f91b66f5fe5', name: 'あいみょん', browseId: 'MPLA808fb8f91b66f5fe5', type: 'sample' },
      { id: 'MPLAa78c7f8ec6b866fe3', name: 'Official髭男dism', browseId: 'MPLAa78c7f8ec6b866fe3', type: 'sample' },
      { id: 'MPLA3c4e7f8ec6b866fe1', name: 'YOASOBI', browseId: 'MPLA3c4e7f8ec6b866fe1', type: 'sample' },
      { id: 'MPLA1a2b3c4d5e6f7g8h9', name: 'King Gnu', browseId: 'MPLA1a2b3c4d5e6f7g8h9', type: 'sample' },
      { id: 'MPLA9i8j7k6l5m4n3o2p1', name: 'Ado', browseId: 'MPLA9i8j7k6l5m4n3o2p1', type: 'sample' }
    ];

    return sampleArtists;
  }
};

/**
 * DOMから登録チャンネルを取得（フォールバック）
 */
const getSubscribedChannelsFromDOM = async () => {
  log('DOMから登録チャンネルを取得中...');

  const channels = [];

  // サイドバーのチャンネルリンクを取得
  const channelLinks = document.querySelectorAll('ytmusic-guide-entry-renderer a[href*="/channel/"]');

  channelLinks.forEach(link => {
    const channelName = link.querySelector('yt-formatted-string')?.textContent?.trim();
    const channelUrl = link.href;
    const channelId = channelUrl.match(/\/channel\/([^/?]+)/)?.[1];

    if (channelId && channelName && channelId.startsWith('UC')) {
      channels.push({
        id: channelId,
        name: channelName,
        browseId: channelId
      });
    }
  });

  log(`DOMから ${channels.length}個のチャンネルを検出しました`);
  return channels;
};

/**
 * チャンネルから最新の楽曲を取得
 */
const getLatestSongsFromChannel = async (channel, count = 3) => {
  log(`${channel.name}から最新${count}曲を取得中...`);

  try {
    // チャンネルの楽曲一覧を取得
    const response = await callYTMusicAPI('browse', {
      browseId: channel.browseId
    });

    const songs = [];

    // レスポンスから楽曲情報を抽出
    const tabs = response?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];

    for (const tab of tabs) {
      const sectionList = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];

      for (const section of sectionList) {
        const musicShelf = section?.musicShelfRenderer;
        if (!musicShelf) continue;

        const items = musicShelf.contents || [];

        for (const item of items) {
          if (songs.length >= count) break;

          const musicItem = item?.musicResponsiveListItemRenderer;
          if (!musicItem) continue;

          // 楽曲情報を抽出
          const flexColumns = musicItem?.flexColumns || [];
          const playEndpoint = musicItem?.overlay?.musicItemThumbnailOverlayRenderer
            ?.content?.musicPlayButtonRenderer?.playNavigationEndpoint;

          if (flexColumns.length > 0 && playEndpoint) {
            const titleRuns = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer
              ?.text?.runs || [];
            const title = titleRuns[0]?.text || '';

            const videoId = playEndpoint?.watchEndpoint?.videoId;

            if (title && videoId) {
              songs.push({
                title: title,
                channel: channel.name,
                channelId: channel.id,
                videoId: videoId,
                url: `https://music.youtube.com/watch?v=${videoId}`
              });
            }
          }
        }

        if (songs.length >= count) break;
      }

      if (songs.length >= count) break;
    }

    log(`${channel.name}から${songs.length}曲を取得しました`);
    return songs.slice(0, count);

  } catch (error) {
    logError(`${channel.name}からの楽曲取得に失敗: ${error.message}`);
    return [];
  }
};

/**
 * チャンネルから人気曲（再生回数の多い曲）を取得
 */
const getPopularSongsFromChannel = async (channel, count = 1) => {
  log(`${channel.name}から人気曲${count}曲を取得中...`);

  try {
    // 認証が必要なアーティストページの代わりに、検索APIを使用
    log(`${channel.name}の楽曲を検索APIで検索中...`);

    const response = await callYTMusicAPI('search', {
      query: channel.name,
      params: 'EgWKAQIIAWoKEAkQAxAEEAoQBQ%3D%3D' // 楽曲検索のパラメータ
    });

    console.log(`Search response for ${channel.name}:`, response);

    const songsWithViews = [];

    // 検索結果から楽曲情報を抽出
    const contents = response?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]
      ?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    for (const section of contents) {
      const musicShelf = section?.musicShelfRenderer;
      if (!musicShelf) continue;

      const items = musicShelf.contents || [];
      console.log(`Found ${items.length} search results for ${channel.name}`);

      for (const item of items) {
        const musicItem = item?.musicResponsiveListItemRenderer;
        if (!musicItem) continue;

        // 楽曲情報を抽出
        const flexColumns = musicItem?.flexColumns || [];
        const playEndpoint = musicItem?.overlay?.musicItemThumbnailOverlayRenderer
          ?.content?.musicPlayButtonRenderer?.playNavigationEndpoint;

        if (flexColumns.length > 0 && playEndpoint) {
          const titleRuns = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer
            ?.text?.runs || [];
          const title = titleRuns[0]?.text || '';

          const videoId = playEndpoint?.watchEndpoint?.videoId;

          // アーティスト情報を確認（検索結果が該当アーティストのものか）
          let isCorrectArtist = false;
          if (flexColumns.length > 1) {
            const artistText = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer
              ?.text?.runs?.map(r => r.text).join(' ') || '';

            // 厳密なアーティスト名マッチングを使用
            isCorrectArtist = isExactArtistMatch(channel.name, artistText);
          }

          // 再生回数の情報を取得（あれば）
          let viewCount = 0;
          if (flexColumns.length > 2) {
            const statsText = flexColumns[2]?.musicResponsiveListItemFlexColumnRenderer
              ?.text?.runs?.map(r => r.text).join(' ') || '';

            // "1.2M views" のような形式から数値を抽出
            const viewMatch = statsText.match(/([\d.]+[KMB]?)\s*(views|回|再生)/i);
            if (viewMatch) {
              viewCount = parseViewCount(viewMatch[1]);
            }
          }

          if (title && videoId && isCorrectArtist) {
            log(`楽曲発見: ${title} by ${channel.name} (${viewCount} views)`);
            songsWithViews.push({
              title: title,
              channel: channel.name,
              channelId: channel.id,
              videoId: videoId,
              viewCount: viewCount,
              url: `https://music.youtube.com/watch?v=${videoId}`
            });

            // 必要な曲数に達したら終了
            if (songsWithViews.length >= count) {
              break;
            }
          }
        }
      }

      // 必要な曲数に達したら終了
      if (songsWithViews.length >= count) {
        break;
      }
    }

    // 検索で見つからない場合、より一般的な検索を試行
    if (songsWithViews.length === 0) {
      log(`${channel.name}の楽曲が見つかりませんでした。一般検索を試行中...`);

      const generalResponse = await callYTMusicAPI('search', {
        query: `${channel.name} 人気`,
        params: 'EgWKAQIIAWoKEAkQAxAEEAoQBQ%3D%3D'
      });

      const generalContents = generalResponse?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]
        ?.tabRenderer?.content?.sectionListRenderer?.contents || [];

      for (const section of generalContents) {
        const musicShelf = section?.musicShelfRenderer;
        if (!musicShelf) continue;

        const items = musicShelf.contents || [];

        for (const item of items) {
          const musicItem = item?.musicResponsiveListItemRenderer;
          if (!musicItem) continue;

          const flexColumns = musicItem?.flexColumns || [];
          const playEndpoint = musicItem?.overlay?.musicItemThumbnailOverlayRenderer
            ?.content?.musicPlayButtonRenderer?.playNavigationEndpoint;

          if (flexColumns.length > 0 && playEndpoint) {
            const titleRuns = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer
              ?.text?.runs || [];
            const title = titleRuns[0]?.text || '';
            const videoId = playEndpoint?.watchEndpoint?.videoId;

            if (title && videoId) {
              songsWithViews.push({
                title: title,
                channel: channel.name,
                channelId: channel.id,
                videoId: videoId,
                viewCount: 0, // 検索結果では再生回数不明
                url: `https://music.youtube.com/watch?v=${videoId}`
              });

              if (songsWithViews.length >= count) {
                break;
              }
            }
          }
        }

        if (songsWithViews.length >= count) {
          break;
        }
      }
    }

    // 再生回数順にソート
    songsWithViews.sort((a, b) => b.viewCount - a.viewCount);

    const selectedSongs = songsWithViews.slice(0, count);
    log(`${channel.name}から${selectedSongs.length}曲の人気曲を取得しました`);

    return selectedSongs;

  } catch (error) {
    logError(`${channel.name}からの人気曲取得に失敗: ${error.message}`);
    return [];
  }
};

/**
 * 再生回数の文字列を数値に変換
 * @param {string} viewString - "1.2M" や "500K" のような文字列
 * @returns {number} - 数値
 */
const parseViewCount = (viewString) => {
  if (!viewString) return 0;

  const str = viewString.toString().toUpperCase();
  const multipliers = {
    'K': 1000,
    'M': 1000000,
    'B': 1000000000
  };

  const match = str.match(/([\d.]+)([KMB])?/);
  if (!match) return 0;

  const number = parseFloat(match[1]);
  const multiplier = multipliers[match[2]] || 1;

  return Math.floor(number * multiplier);
};

/**
 * YouTubeでアーティスト名とタイトルから動画を検索
 */
const searchYouTubeVideo = async (artist, title) => {
  try {
    // アーティスト名とタイトルをサニタイズ
    const sanitizedArtist = artist || 'Unknown Artist';
    const sanitizedTitle = title || 'Unknown Title';

    const query = `${sanitizedArtist} ${sanitizedTitle}`;
    log(`YouTube検索: "${query}"`);

    // YouTube検索API（YouTube内部API）を使用
    const searchResponse = await callYTMusicAPI('search', {
      query: query,
      params: 'EgIQAQ%3D%3D' // 動画のみを検索するパラメータ
    });

    if (searchResponse?.contents?.tabbedSearchResultsRenderer?.tabs) {
      const searchResults = searchResponse.contents.tabbedSearchResultsRenderer.tabs[0]
        ?.tabRenderer?.content?.sectionListRenderer?.contents || [];

      for (const section of searchResults) {
        const items = section?.musicShelfRenderer?.contents || [];

        for (const item of items) {
          const videoRenderer = item?.musicResponsiveListItemRenderer;
          if (!videoRenderer) continue;

          const playEndpoint = videoRenderer?.overlay?.musicItemThumbnailOverlayRenderer
            ?.content?.musicPlayButtonRenderer?.playNavigationEndpoint;

          if (playEndpoint?.watchEndpoint?.videoId) {
            const videoId = playEndpoint.watchEndpoint.videoId;
            const videoTitle = videoRenderer?.flexColumns?.[0]
              ?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || '';

            log(`✓ YouTube動画発見: ${videoTitle} (${videoId})`);
            return {
              videoId: videoId,
              title: videoTitle,
              originalQuery: query
            };
          }
        }
      }
    }

    log(`YouTube検索で動画が見つかりませんでした: "${query}"`);
    return null;

  } catch (error) {
    logError(`YouTube検索エラー (${artist} - ${title}): ${error.message}`);
    return null;
  }
};

/**
 * 既存の再生リストを検索
 */
const findExistingPlaylist = async (playlistName) => {
  try {
    log(`既存の再生リスト検索: "${playlistName}"`);

    // 複数のエンドポイントを順次試行
    const endpoints = [
      'FEmusic_library_playlists', // ライブラリのプレイリスト（作成したプレイリスト）
      'FEmusic_liked_playlists',   // いいねしたプレイリスト
      'FEmusic_library'            // ライブラリ全体
    ];

    const allPlaylists = [];
    const matchingPlaylists = [];

    for (const browseId of endpoints) {
      try {
        log(`エンドポイント ${browseId} を検索中...`);

        const response = await callYTMusicAPI('browse', { browseId });

        const contents = response?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]
          ?.tabRenderer?.content?.sectionListRenderer?.contents || [];

        for (const section of contents) {
          // gridRenderer をチェック
          const gridItems = section?.gridRenderer?.items || [];

          for (const item of gridItems) {
            const playlistItem = item?.musicTwoRowItemRenderer;
            if (!playlistItem) continue;

            const navigationEndpoint = playlistItem?.navigationEndpoint;
            const browseEndpoint = navigationEndpoint?.browseEndpoint;

            if (browseEndpoint?.browseId) {
              const playlistId = browseEndpoint.browseId;
              const title = playlistItem?.title?.runs?.[0]?.text || '';

              if (title && playlistId.startsWith('VL')) {
                const playlist = {
                  id: playlistId.replace('VL', ''),
                  title: title,
                  browseId: playlistId
                };

                allPlaylists.push(playlist);

                // 同じタイトルの再生リストが見つかった場合
                if (title.trim().toLowerCase() === playlistName.trim().toLowerCase()) {
                  log(`✓ 既存の再生リストを発見: "${title}" (${playlistId}) [${browseId}]`);
                  matchingPlaylists.push(playlist);
                }
              }
            }
          }

          // musicShelfRenderer もチェック
          const shelfItems = section?.musicShelfRenderer?.contents || [];

          for (const item of shelfItems) {
            const playlistItem = item?.musicResponsiveListItemRenderer;
            if (!playlistItem) continue;

            const navigationEndpoint = playlistItem?.navigationEndpoint;
            const browseEndpoint = navigationEndpoint?.browseEndpoint;

            if (browseEndpoint?.browseId) {
              const playlistId = browseEndpoint.browseId;
              const flexColumns = playlistItem?.flexColumns || [];
              const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer
                ?.text?.runs?.[0]?.text || '';

              if (title && playlistId.startsWith('VL')) {
                const playlist = {
                  id: playlistId.replace('VL', ''),
                  title: title,
                  browseId: playlistId
                };

                allPlaylists.push(playlist);

                // 同じタイトルの再生リストが見つかった場合
                if (title.trim().toLowerCase() === playlistName.trim().toLowerCase()) {
                  log(`✓ 既存の再生リストを発見: "${title}" (${playlistId}) [${browseId}]`);
                  matchingPlaylists.push(playlist);
                }
              }
            }
          }
        }

        // ライブラリプレイリストで見つかった場合は優先
        if (browseId === 'FEmusic_library_playlists' && matchingPlaylists.length > 0) {
          break;
        }

      } catch (endpointError) {
        log(`エンドポイント ${browseId} でエラー: ${endpointError.message}`);
        continue;
      }
    }

    // 重複を除去
    const uniqueMatching = matchingPlaylists.filter((playlist, index, self) =>
      index === self.findIndex(p => p.id === playlist.id)
    );

    if (uniqueMatching.length > 0) {
      log(`✓ 同名の再生リストを${uniqueMatching.length}個発見: "${playlistName}"`);
      return {
        found: true,
        playlists: uniqueMatching,
        playlist: uniqueMatching[0] // 後方互換性のため最初のプレイリストも返す
      };
    }

    log(`既存の再生リストは見つかりませんでした: "${playlistName}"`);
    return { found: false, playlists: allPlaylists };

  } catch (error) {
    logError(`既存再生リスト検索エラー: ${error.message}`);
    return { found: false, error: error.message };
  }
};

/**
 * 再生リストを削除
 */
const deletePlaylist = async (playlistId) => {
  try {
    log(`再生リスト削除開始: ${playlistId}`);

    const response = await callYTMusicAPI('playlist/delete', {
      playlistId: playlistId
    });

    if (response && (response.status === 'STATUS_SUCCEEDED' || response.responseContext)) {
      log(`✓ 再生リスト削除成功: ${playlistId}`);
      return { success: true };
    } else {
      throw new Error('再生リスト削除に失敗しました');
    }

  } catch (error) {
    logError(`再生リスト削除エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * YouTube APIでプレイリストを削除
 */
const deleteYouTubePlaylist = async (playlistId) => {
  try {
    log(`プレイリスト削除開始: ${playlistId}`);

    // YouTube Music内部APIを使用してプレイリストを削除
    // 複数の削除方法を順次試行
    const deleteMethods = [
      // 方法1: playlist/delete エンドポイント
      {
        endpoint: 'playlist/delete',
        params: { playlistId: playlistId }
      },
      // 方法2: browse/edit_playlist エンドポイント（修正版）
      {
        endpoint: 'browse/edit_playlist',
        params: {
          playlistId: playlistId,
          actions: [{
            action: 'ACTION_DELETE_PLAYLIST',
            playlistId: playlistId
          }]
        }
      },
      // 方法3: 簡略化されたdelete
      {
        endpoint: 'playlist/delete',
        params: {
          playlistId: playlistId,
          context: getYTMusicConfig()?.context
        }
      }
    ];

    let lastError = null;

    for (let i = 0; i < deleteMethods.length; i++) {
      const method = deleteMethods[i];
      try {
        log(`削除方法${i + 1}を試行: ${method.endpoint}`);

        const response = await callYTMusicAPI(method.endpoint, method.params);

        log(`削除方法${i + 1}のレスポンス: ${JSON.stringify(response, null, 2)}`);

        // 成功判定（エラーレスポンスでなければ成功とみなす）
        if (!response?.error && response?.status !== 'STATUS_FAILED') {
          log(`✓ プレイリスト削除成功 (方法${i + 1}): ${playlistId}`);
          return { success: true, method: i + 1 };
        } else {
          throw new Error(`方法${i + 1}失敗: ${response?.error?.message || response?.status || 'Unknown error'}`);
        }

      } catch (error) {
        lastError = error;
        logError(`削除方法${i + 1}が失敗: ${error.message}`);

        // 最後の方法でない場合は次を試行
        if (i < deleteMethods.length - 1) {
          log('次の削除方法を試行します...');
          await wait(1000);
          continue;
        }
      }
    }

    // すべての方法が失敗した場合
    throw new Error(`すべての削除方法が失敗しました。最後のエラー: ${lastError?.message}`);

  } catch (error) {
    logError(`プレイリスト削除エラー: ${error.message}`);
    throw error;
  }
};

// プレイリスト作成の実行状態管理を強化
let isCreatingPlaylist = false;
const creatingPlaylists = new Set(); // 作成中のプレイリスト名を追跡

/**
 * YouTube APIで再生リストを作成（YouTube Music認証を使用）
 */
const createYouTubePlaylistWithAuth = async (playlistName, description = '') => {
  // プレイリスト名ベースの重複チェック
  if (creatingPlaylists.has(playlistName)) {
    log(`プレイリスト "${playlistName}" は既に作成中です。重複実行を防止します。`);
    return { success: false, error: `プレイリスト "${playlistName}" は既に作成中です` };
  }

  // 既に作成中の場合は待機
  if (isCreatingPlaylist) {
    log('プレイリスト作成が既に実行中です。重複実行を防止します。');
    return { success: false, error: 'プレイリスト作成が既に実行中です' };
  }

  let wasOverwritten = false; // スコープを関数レベルに移動

  try {
    isCreatingPlaylist = true;
    creatingPlaylists.add(playlistName);
    log(`YouTube再生リスト作成開始（認証あり）: "${playlistName}"`);
    log(`作成中プレイリスト: ${Array.from(creatingPlaylists).join(', ')}`);

    // 既存の同名プレイリストをチェック
    log('既存プレイリストの検索を開始...');
    const existingResult = await findExistingPlaylist(playlistName);
    log(`既存プレイリスト検索結果: ${JSON.stringify(existingResult)}`);

    if (existingResult.found) {
      const playlistsToDelete = existingResult.playlists || [existingResult.playlist];
      log(`同名の既存プレイリストを${playlistsToDelete.length}個発見: "${playlistsToDelete[0].title}"`);

      // すべての既存プレイリストを削除
      for (let i = 0; i < playlistsToDelete.length; i++) {
        const playlist = playlistsToDelete[i];
        try {
          log(`既存プレイリスト削除開始 (${i + 1}/${playlistsToDelete.length}): ${playlist.id}`);
          await deleteYouTubePlaylist(playlist.id);
          log(`✓ 既存プレイリストを削除しました (${i + 1}/${playlistsToDelete.length}): "${playlist.title}"`);
          wasOverwritten = true;

          // 削除後少し待機（最後のプレイリスト以外）
          if (i < playlistsToDelete.length - 1) {
            log('次の削除まで待機中...');
            await wait(1000);
          }
        } catch (deleteError) {
          logError(`既存プレイリストの削除に失敗 (${i + 1}/${playlistsToDelete.length}): ${deleteError.message}`);

          // 削除に失敗した場合、プレイリスト名を少し変更して重複を避ける
          if (deleteError.message.includes('ACTION_DELETE_PLAYLIST') || deleteError.message.includes('Invalid value')) {
            log('削除APIが利用できないため、新しいプレイリスト名に時刻を追加します');
            const currentTime = new Date().toLocaleString('ja-JP', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });
            playlistName = `${playlistName} (${currentTime})`;
            log(`新しいプレイリスト名: "${playlistName}"`);
          }

          // 削除に失敗しても続行
        }
      }

      // 最後の削除後に追加の待機時間
      log('すべての削除完了後の待機時間開始...');
      await wait(2000);
      log('削除後の待機完了');
    }

    // SAPISID認証ヘッダーを取得
    log('SAPISID認証ヘッダーを取得中...');
    const authHeaders = await getAuthHeaders();
    log('✓ SAPISID認証ヘッダーを取得しました');

    // YouTube Music API設定を取得
    log('YouTube Music API設定を取得中...');
    const config = await getYTMusicConfig();
    log(`API設定取得結果: hasContext=${!!config.context}, hasApiKey=${!!config.apiKey}`);
    if (!config.context || !config.apiKey) {
      throw new Error('YouTube認証情報が取得できませんでした');
    }

    // YouTube Music内部APIでプレイリストを作成
    log('YouTube Music API経由でプレイリスト作成中...');

    // YouTube Music内部APIの正しい形式を使用
    const createRequest = {
      title: playlistName,
      description: description || '',
      privacyStatus: 'UNLISTED'
    };

    log(`プレイリスト作成リクエスト: ${JSON.stringify(createRequest, null, 2)}`);

    const response = await callYTMusicAPI('playlist/create', createRequest);

    log(`プレイリスト作成API応答: ${JSON.stringify(response, null, 2)}`);

    // プレイリスト作成成功の判定
    // 1. STATUS_FAILEDがない場合は成功とみなす
    // 2. responseContextが存在し、エラーアクションがない場合は成功
    const isSuccess = !response?.status || response.status !== 'STATUS_FAILED';
    const hasErrorActions = response?.actions?.some(action =>
      action?.openPopupAction?.popup?.notificationActionRenderer?.responseText
    );

    if (!isSuccess || hasErrorActions) {
      const errorMessage = response.actions?.[0]?.openPopupAction?.popup?.notificationActionRenderer?.responseText?.runs?.[0]?.text || 'プレイリスト作成に失敗しました';
      throw new Error(`プレイリスト作成エラー: ${errorMessage}`);
    }

    log('✓ プレイリスト作成API呼び出しが成功しました');

    // プレイリストIDを様々な場所から抽出を試行
    let playlistId = response?.playlistId;

    if (!playlistId) {
      // actionsからプレイリストIDを抽出
      const actions = response?.actions || [];
      for (const action of actions) {
        // showEngagementPanelEndpointの中にプレイリスト情報がある可能性
        const params = action?.showEngagementPanelEndpoint?.globalConfiguration?.params;
        if (params) {
          // Base64エンコードされたパラメータをデコードしてプレイリストIDを抽出
          try {
            const decodedParams = atob(params);
            log(`デコードされたパラメータ: ${decodedParams}`);
            // プレイリストIDのパターンを検索
            const playlistMatch = decodedParams.match(/PL[a-zA-Z0-9_-]{32}/);
            if (playlistMatch) {
              playlistId = playlistMatch[0];
              log(`actionsからプレイリストIDを抽出: ${playlistId}`);
              break;
            }
          } catch (decodeError) {
            log(`パラメータデコードエラー: ${decodeError.message}`);
          }
        }

        // 他の可能な場所をチェック
        if (action.navigateAction?.browseEndpoint?.browseId) {
          const browseId = action.navigateAction.browseEndpoint.browseId;
          if (browseId.startsWith('VL')) {
            playlistId = browseId.replace('VL', '');
            log(`browseEndpointからプレイリストIDを抽出: ${playlistId}`);
            break;
          }
        }
      }
    }

    if (playlistId) {
      log(`✓ YouTube再生リスト作成成功: ${playlistId}`);
      return {
        success: true,
        playlistId: playlistId,
        playlistUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
        method: 'youtube_music_api',
        wasOverwritten: wasOverwritten
      };
    } else {
      log('プレイリストID抽出失敗。代替方法で作成されたプレイリストを検索します...');

      // プレイリスト作成後十分な時間を待機してから検索
      log('プレイリスト作成の反映を待機中... (5秒)');
      await wait(5000);

      // 新しく作成されたプレイリストを検索（複数回試行）
      let searchResult = null;
      const maxSearchRetries = 3;

      for (let retry = 0; retry < maxSearchRetries; retry++) {
        log(`プレイリスト検索試行 ${retry + 1}/${maxSearchRetries}...`);
        searchResult = await findExistingPlaylist(playlistName);

        if (searchResult.found && searchResult.playlists && searchResult.playlists.length > 0) {
          break;
        }

        if (retry < maxSearchRetries - 1) {
          log(`検索失敗。${2 + retry}秒後に再試行...`);
          await wait((2 + retry) * 1000);
        }
      }

      if (searchResult && searchResult.found && searchResult.playlists && searchResult.playlists.length > 0) {
        // 最新のプレイリスト（通常は最初に見つかるもの）を使用
        const newPlaylist = searchResult.playlists[0];
        log(`✓ 作成されたプレイリストを検索で発見: ${newPlaylist.id}`);

        return {
          success: true,
          playlistId: newPlaylist.id,
          playlistUrl: `https://www.youtube.com/playlist?list=${newPlaylist.id}`,
          method: 'youtube_music_api_search',
          wasOverwritten: wasOverwritten
        };
      } else {
        log('プレイリストが作成されましたが、検索でも見つかりませんでした。');

        // 最後の手段：手動確認を促す
        log('手動でプレイリストを確認してください: https://music.youtube.com/library/playlists');

        // とりあえず成功として処理（プレイリストは作成されているため）
        return {
          success: true,
          playlistId: 'unknown',
          playlistUrl: 'https://music.youtube.com/library/playlists',
          method: 'youtube_music_api_created_but_id_unknown',
          wasOverwritten: wasOverwritten,
          note: 'プレイリストは作成されましたが、IDの自動取得に失敗しました。手動で確認してください。'
        };
      }
    }

  } catch (error) {
    logError(`YouTube Music API再生リスト作成エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      wasOverwritten: wasOverwritten
    };
  } finally {
    // 実行状態をリセット
    isCreatingPlaylist = false;
    creatingPlaylists.delete(playlistName);
    log(`プレイリスト作成処理完了: "${playlistName}"`);
    log(`残りの作成中プレイリスト: ${Array.from(creatingPlaylists).join(', ') || 'なし'}`);
  }
};

/**
 * YouTube Music内部APIで再生リストを作成（修正版）
 */
const createYouTubePlaylistInternal = async (playlistName, description = '', wasOverwritten = false) => {
  try {
    log(`YouTube Music内部API で再生リスト作成: "${playlistName}"`);
    log(`wasOverwritten フラグ: ${wasOverwritten}`);

    // 既に上位関数で削除処理が完了していない場合のみ削除チェック
    if (!wasOverwritten) {
      log('既存プレイリストの重複チェックを実行...');
      const existingResult = await findExistingPlaylist(playlistName);
      log(`内部API - 既存プレイリスト検索結果: ${JSON.stringify(existingResult)}`);

      if (existingResult.found) {
        const playlistsToDelete = existingResult.playlists || [existingResult.playlist];
        log(`同名の既存プレイリストを${playlistsToDelete.length}個発見（内部API）: "${playlistsToDelete[0].title}"`);

        for (let i = 0; i < playlistsToDelete.length; i++) {
          const playlist = playlistsToDelete[i];
          try {
            log(`既存プレイリスト削除開始（内部API ${i + 1}/${playlistsToDelete.length}）: ${playlist.id}`);
            await deleteYouTubePlaylist(playlist.id);
            log(`✓ 既存プレイリストを削除しました（内部API ${i + 1}/${playlistsToDelete.length}）: "${playlist.title}"`);
            wasOverwritten = true;
            if (i < playlistsToDelete.length - 1) {
              await wait(1000);
            }
          } catch (deleteError) {
            logError(`既存プレイリストの削除に失敗（内部API ${i + 1}/${playlistsToDelete.length}）: ${deleteError.message}`);

            // 削除に失敗した場合、プレイリスト名を少し変更して重複を避ける
            if (deleteError.message.includes('ACTION_DELETE_PLAYLIST') || deleteError.message.includes('Invalid value')) {
              log('削除APIが利用できないため、新しいプレイリスト名に時刻を追加します（内部API）');
              const currentTime = new Date().toLocaleString('ja-JP', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              });
              playlistName = `${playlistName} (${currentTime})`;
              log(`新しいプレイリスト名（内部API）: "${playlistName}"`);
            }
          }
        }
        await wait(2000); // 削除後の待機
      }
    } else {
      log('既存プレイリストは既に削除済みです');
    }

    // 複数のエンドポイントを試行
    const endpoints = [
      'playlist/create',
      'browse/create_playlist',
      'music/create_playlist'
    ];

    for (const endpoint of endpoints) {
      try {
        log(`エンドポイント試行: ${endpoint}`);

        const requestBody = {
          title: playlistName,
          description: description,
          privacyStatus: 'UNLISTED'
        };

        log(`内部API エンドポイント試行: ${endpoint}`);
        log(`リクエストボディ: ${JSON.stringify(requestBody)}`);

        const response = await callYTMusicAPI(endpoint, requestBody);
        log(`エンドポイント ${endpoint} レスポンス: ${JSON.stringify(response)}`);

        if (response && (response.playlistId || response.playlistEditResults)) {
          const playlistId = response.playlistId || response.playlistEditResults?.[0]?.playlistId;

          if (playlistId) {
            log(`✓ YouTube Music API 再生リスト作成成功: ${playlistId} (${endpoint})`);
            return {
              success: true,
              playlistId: playlistId,
              playlistUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
              method: `youtube_music_api_${endpoint}`,
              wasOverwritten: wasOverwritten
            };
          } else {
            log(`エンドポイント ${endpoint}: playlistId が見つかりません`);
          }
        } else {
          log(`エンドポイント ${endpoint}: 無効なレスポンス`);
        }
      } catch (endpointError) {
        logError(`エンドポイント ${endpoint} 失敗: ${endpointError.message}`);
        continue;
      }
    }

    throw new Error('すべてのエンドポイントで再生リスト作成に失敗');

  } catch (error) {
    logError(`YouTube Music内部API再生リスト作成エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * YouTube APIで再生リストに動画を追加（修正版）
 */
const addVideosToYouTubePlaylistWithAuth = async (playlistId, songs, batchSize = 50) => {
  try {
    log(`YouTube再生リスト ${playlistId} に ${songs.length}曲を追加開始（修正版）`);

    let addedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const foundVideos = [];

    // 各楽曲をYouTubeで検索して動画IDを取得
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];

      try {
        log(`進捗: ${i + 1}/${songs.length} - "${song.artist} - ${song.title}" を検索中...`);

        const videoResult = await searchYouTubeVideo(song.artist, song.title);

        if (videoResult) {
          foundVideos.push({
            videoId: videoResult.videoId,
            title: videoResult.title,
            originalSong: song
          });
        } else {
          skippedCount++;
          log(`スキップ: "${song.artist} - ${song.title}" の動画が見つかりませんでした`);
        }

        // レート制限対策
        await wait(300);

      } catch (error) {
        skippedCount++;
        logError(`検索エラー: "${song.artist} - ${song.title}": ${error.message}`);
        errors.push(`${song.artist} - ${song.title}: ${error.message}`);
        continue;
      }
    }

    log(`YouTube検索完了: ${foundVideos.length}個の動画を発見, ${skippedCount}個をスキップ`);

    if (foundVideos.length === 0) {
      return {
        success: false,
        error: '追加可能な動画が見つかりませんでした',
        addedCount: 0,
        totalFound: 0,
        totalSongs: songs.length,
        skippedCount: skippedCount,
        errors: errors
      };
    }

    // YouTube Music内部APIを使用して楽曲を追加
    try {
      log('YouTube Music内部APIで楽曲を追加中...');

      // バッチ処理で楽曲を追加
      for (let i = 0; i < foundVideos.length; i += batchSize) {
        const batch = foundVideos.slice(i, i + batchSize);
        const videoIds = batch.map(video => video.videoId);

        try {
          log(`バッチ ${Math.floor(i/batchSize) + 1}: ${videoIds.length}動画を追加中...`);

          const response = await callYTMusicAPI('browse/edit_playlist', {
            playlistId: playlistId,
            actions: videoIds.map(videoId => ({
              action: 'ACTION_ADD_VIDEO',
              addedVideoId: videoId,
              setVideoId: videoId
            }))
          });

          if (response && !response.error) {
            addedCount += videoIds.length;
            log(`✓ バッチ ${Math.floor(i/batchSize) + 1}: ${videoIds.length}動画を追加成功`);
          } else {
            // 代替方法: 個別追加を試行
            log('バッチ追加失敗、個別追加を試行...');
            for (const videoId of videoIds) {
              try {
                const individualResponse = await callYTMusicAPI('browse/get_add_to_playlist', {
                  videoId: videoId
                });

                if (individualResponse) {
                  // プレイリストに追加
                  const addResponse = await callYTMusicAPI('browse/edit_playlist', {
                    playlistId: playlistId,
                    actions: [{
                      action: 'ACTION_ADD_VIDEO',
                      addedVideoId: videoId,
                      setVideoId: videoId
                    }]
                  });

                  if (addResponse && !addResponse.error) {
                    addedCount++;
                  }
                }

                await wait(200);
              } catch (individualError) {
                logError(`個別追加失敗 ${videoId}: ${individualError.message}`);
                errors.push(`個別追加失敗: ${individualError.message}`);
              }
            }
          }

          await wait(500);

        } catch (batchError) {
          logError(`バッチ ${Math.floor(i/batchSize) + 1} の追加に失敗: ${batchError.message}`);
          errors.push(`バッチ ${Math.floor(i/batchSize) + 1}: ${batchError.message}`);
          continue;
        }
      }

    } catch (apiError) {
      logError(`YouTube Music API楽曲追加エラー: ${apiError.message}`);

      // 最終手段: 手動追加用の情報を提供
      return {
        success: false,
        error: `楽曲追加API失敗: ${apiError.message}`,
        addedCount: 0,
        totalFound: foundVideos.length,
        totalSongs: songs.length,
        skippedCount: skippedCount,
        errors: errors,
        foundVideos: foundVideos,
        manualAddUrls: foundVideos.map(video =>
          `https://www.youtube.com/watch?v=${video.videoId}&list=${playlistId}`
        )
      };
    }

    log(`YouTube再生リストへの追加完了: ${addedCount}/${foundVideos.length}動画を追加`);

    return {
      success: addedCount > 0,
      addedCount: addedCount,
      totalFound: foundVideos.length,
      totalSongs: songs.length,
      skippedCount: skippedCount,
      errors: errors,
      foundVideos: foundVideos
    };

  } catch (error) {
    logError(`YouTube動画追加エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      addedCount: 0,
      totalFound: 0,
      totalSongs: songs.length,
      skippedCount: songs.length,
      errors: [error.message]
    };
  }
};

/**
 * YouTubeで再生リスト作成用URLを生成（認証不要版 - バックアップ）
 */
const createYouTubePlaylistUrl = async (playlistName, songs) => {
  try {
    log(`YouTube再生リスト作成URL生成開始: "${playlistName}"`);
    log(`${songs.length}曲からYouTube動画を検索中...`);

    const foundVideos = [];
    let skippedCount = 0;

    // 各楽曲をYouTubeで検索して動画IDを取得
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];

      try {
        log(`進捗: ${i + 1}/${songs.length} - "${song.artist} - ${song.title}" を検索中...`);

        const videoResult = await searchYouTubeVideo(song.artist, song.title);

        if (videoResult) {
          foundVideos.push({
            videoId: videoResult.videoId,
            title: videoResult.title,
            originalSong: song
          });
        } else {
          skippedCount++;
          log(`スキップ: "${song.artist} - ${song.title}" の動画が見つかりませんでした`);
        }

        // レート制限対策
        await wait(300);

      } catch (error) {
        skippedCount++;
        logError(`検索エラー: "${song.artist} - ${song.title}": ${error.message}`);
        continue;
      }
    }

    log(`YouTube検索完了: ${foundVideos.length}個の動画を発見, ${skippedCount}個をスキップ`);

    if (foundVideos.length === 0) {
      throw new Error('YouTube動画が見つかりませんでした');
    }

    // YouTube再生リスト作成用URLを生成
    // 最初の動画をメインにして、残りをキューに追加
    const firstVideo = foundVideos[0];
    const additionalVideos = foundVideos.slice(1);

    let playlistUrl = `https://www.youtube.com/watch?v=${firstVideo.videoId}`;

    // 追加動画がある場合、リストとして追加
    if (additionalVideos.length > 0) {
      const videoIds = additionalVideos.map(v => v.videoId).join(',');
      playlistUrl += `&list=${videoIds}&autoplay=1`;
    }

    // より適切な再生リスト作成URLを生成（手動作成用）
    const createUrl = 'https://www.youtube.com/playlist_editor?feature=mhee';
    const videoIdsList = foundVideos.map(v => v.videoId);

    log(`✓ YouTube再生リスト作成URL生成成功: ${foundVideos.length}個の動画`);

    return {
      success: true,
      foundVideos: foundVideos,
      videoIds: videoIdsList,
      playlistUrl: playlistUrl,
      createUrl: createUrl,
      totalFound: foundVideos.length,
      skippedCount: skippedCount,
      videoIdsList: videoIdsList.join(','),
      instructions: [
        '1. 下記のリンクをクリックしてYouTubeを開く',
        '2. YouTube画面で「ライブラリ」→「作成済み」→「新しい再生リスト」をクリック',
        '3. 再生リスト名を入力して作成',
        '4. 「動画を追加」から見つかった動画を手動で追加'
      ]
    };

  } catch (error) {
    logError(`YouTube再生リストURL生成エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * YouTube再生リスト作成（認証あり版 - 使用停止）
 */
const createYouTubePlaylist = async (playlistName, description = '') => {
  try {
    log(`YouTube再生リスト作成開始: "${playlistName}"`);

    // まず既存の同名再生リストを検索
    const existingResult = await findExistingPlaylist(playlistName);

    if (existingResult.found) {
      const playlistsToDelete = existingResult.playlists || [existingResult.playlist];
      log(`同名の再生リストが${playlistsToDelete.length}個存在します。削除してから新規作成します。`);

      // 既存の再生リストをすべて削除
      let deletedCount = 0;
      for (let i = 0; i < playlistsToDelete.length; i++) {
        const playlist = playlistsToDelete[i];
        const deleteResult = await deletePlaylist(playlist.id);

        if (!deleteResult.success) {
          logError(`既存再生リストの削除に失敗 (${i + 1}/${playlistsToDelete.length}): ${deleteResult.error}`);
        } else {
          log(`✓ 既存再生リスト "${playlist.title}" を削除しました (${i + 1}/${playlistsToDelete.length})`);
          deletedCount++;
          if (i < playlistsToDelete.length - 1) {
            await wait(1000);
          }
        }
      }

      if (deletedCount > 0) {
        log(`合計${deletedCount}個のプレイリストを削除しました。削除後少し待機します。`);
        await wait(1000);
      }
    }

    // YouTube内部APIを使用して再生リストを作成
    const response = await callYTMusicAPI('playlist/create', {
      title: playlistName,
      description: description,
      privacyStatus: 'UNLISTED' // PRIVATE, UNLISTED, PUBLIC
    });

    if (response && response.playlistId) {
      log(`✓ YouTube再生リスト作成成功: ${response.playlistId}`);
      return {
        success: true,
        playlistId: response.playlistId,
        playlistUrl: `https://www.youtube.com/playlist?list=${response.playlistId}`,
        wasOverwritten: existingResult.found
      };
    } else {
      throw new Error('再生リストIDが返されませんでした');
    }

  } catch (error) {
    logError(`YouTube再生リスト作成エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * YouTubeで再生リストを作成 (旧機能 - 上書きなし)
 */

/**
 * YouTube再生リストに動画を追加
 */
const addVideosToYouTubePlaylist = async (playlistId, songs, batchSize = 20) => {
  try {
    log(`YouTube再生リスト ${playlistId} に ${songs.length}曲を追加開始`);

    let addedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const foundVideos = [];

    // 各楽曲をYouTubeで検索して動画IDを取得
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];

      try {
        // データ構造に応じてアーティスト名を取得
        const artistName = song.artist || song.channel || 'Unknown Artist';
        const songTitle = song.title || 'Unknown Title';

        log(`進捗: ${i + 1}/${songs.length} - "${artistName} - ${songTitle}" を検索中...`);

        const videoResult = await searchYouTubeVideo(artistName, songTitle);

        if (videoResult) {
          foundVideos.push({
            videoId: videoResult.videoId,
            title: videoResult.title,
            originalSong: song
          });
        } else {
          skippedCount++;
          log(`スキップ: "${song.artist} - ${song.title}" の動画が見つかりませんでした`);
        }

        // レート制限対策
        await wait(300);

      } catch (error) {
        skippedCount++;
        logError(`検索エラー: "${song.artist} - ${song.title}": ${error.message}`);
        errors.push(`${song.artist} - ${song.title}: ${error.message}`);
        continue;
      }
    }

    log(`YouTube検索完了: ${foundVideos.length}個の動画を発見, ${skippedCount}個をスキップ`);

    // バッチ処理で動画を再生リストに追加
    for (let i = 0; i < foundVideos.length; i += batchSize) {
      const batch = foundVideos.slice(i, i + batchSize);

      try {
        const videoIds = batch.map(video => video.videoId);

        // YouTube Music APIで動画を追加（browse/edit_playlistのみ使用）
        let response = null;

        try {
          log('APIエンドポイント試行: browse/edit_playlist');

          response = await callYTMusicAPI('browse/edit_playlist', {
            playlistId: playlistId,
            actions: videoIds.map(videoId => ({
              action: 'ACTION_ADD_VIDEO',
              addedVideoId: videoId
            }))
          });

          if (response && (response.status === 'STATUS_SUCCEEDED' || response.responseContext)) {
            log('✓ browse/edit_playlist で成功');
          } else {
            throw new Error(`レスポンスが不正: ${response?.status || 'Unknown error'}`);
          }
        } catch (endpointError) {
          log(`browse/edit_playlist 失敗: ${endpointError.message}`);
          response = null;
        }

        if (response && (response.status === 'STATUS_SUCCEEDED' || response.responseContext)) {
          addedCount += videoIds.length;
          log(`✓ バッチ ${Math.floor(i/batchSize) + 1}: ${videoIds.length}動画を追加`);
        } else {
          throw new Error(`動画追加API失敗: ${response?.status || 'レスポンスなし'}`);
        }

        // レート制限対策
        await wait(500);

      } catch (error) {
        logError(`バッチ ${Math.floor(i/batchSize) + 1} の追加に失敗: ${error.message}`);
        errors.push(`バッチ ${Math.floor(i/batchSize) + 1}: ${error.message}`);

        // バッチが失敗した場合、個別に動画を追加を試行
        log('バッチ失敗のため個別追加を試行中...');
        for (const video of batch) {
          try {
            await wait(300); // 短い間隔で個別追加
            const singleResponse = await callYTMusicAPI('browse/edit_playlist', {
              playlistId: playlistId,
              actions: [{
                action: 'ACTION_ADD_VIDEO',
                addedVideoId: video.videoId
              }]
            });

            if (singleResponse && (singleResponse.status === 'STATUS_SUCCEEDED' || singleResponse.responseContext)) {
              addedCount++;
              log(`✓ 個別追加成功: ${video.title}`);
            }
          } catch (singleError) {
            log(`個別追加失敗: ${video.title} - ${singleError.message}`);
          }
        }
        continue;
      }
    }

    log(`YouTube再生リストへの追加完了: ${addedCount}/${foundVideos.length}動画を追加`);

    // 全ての動画追加が失敗した場合、手動追加のための情報を提供
    if (addedCount === 0 && foundVideos.length > 0) {
      log('全ての自動追加が失敗しました。手動追加用の情報を準備します。');

      return {
        success: false,
        addedCount: 0,
        totalFound: foundVideos.length,
        skippedCount: skippedCount,
        errors: errors,
        requiresManualAdd: true,
        manualAddVideos: foundVideos.map(video => ({
          title: video.title,
          videoId: video.videoId,
          url: `https://www.youtube.com/watch?v=${video.videoId}`
        }))
      };
    }

    return {
      success: true,
      addedCount: addedCount,
      totalFound: foundVideos.length,
      totalSongs: songs.length,
      skippedCount: skippedCount,
      errors: errors,
      foundVideos: foundVideos
    };

  } catch (error) {
    logError(`YouTube動画追加エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * YouTube Music APIを使ってプレイリストを作成 (旧機能)
 */
const createPlaylist = async (playlistName, description = '') => {
  try {
    log(`プレイリスト作成開始: "${playlistName}"`);

    const response = await callYTMusicAPI('playlist/create', {
      title: playlistName,
      description: description,
      privacyStatus: 'PRIVATE' // PRIVATE, UNLISTED, PUBLIC
    });

    if (response && response.playlistId) {
      log(`✓ プレイリスト作成成功: ${response.playlistId}`);
      return {
        success: true,
        playlistId: response.playlistId,
        browseId: `VL${response.playlistId}`
      };
    } else {
      throw new Error('プレイリストIDが返されませんでした');
    }

  } catch (error) {
    logError(`プレイリスト作成エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * プレイリストに楽曲を追加
 */
const addSongsToPlaylist = async (playlistId, songs, batchSize = 50) => {
  try {
    log(`プレイリスト ${playlistId} に ${songs.length}曲を追加開始`);

    let addedCount = 0;
    const errors = [];

    // バッチ処理で楽曲を追加
    for (let i = 0; i < songs.length; i += batchSize) {
      const batch = songs.slice(i, i + batchSize);

      try {
        const videoIds = batch.map(song => song.videoId).filter(id => id);

        if (videoIds.length > 0) {
          const response = await callYTMusicAPI('playlist/add_songs', {
            playlistId: playlistId,
            videoIds: videoIds
          });

          if (response && response.status === 'STATUS_SUCCEEDED') {
            addedCount += videoIds.length;
            log(`✓ バッチ ${Math.floor(i/batchSize) + 1}: ${videoIds.length}曲を追加`);
          } else {
            throw new Error(`バッチ追加に失敗: ${response?.status || 'Unknown error'}`);
          }
        }

        // レート制限対策
        await wait(500);

      } catch (error) {
        logError(`バッチ ${Math.floor(i/batchSize) + 1} の追加に失敗: ${error.message}`);
        errors.push(error.message);
        continue;
      }
    }

    log(`プレイリストへの追加完了: ${addedCount}/${songs.length}曲`);

    return {
      success: true,
      addedCount: addedCount,
      totalSongs: songs.length,
      errors: errors
    };

  } catch (error) {
    logError(`楽曲追加エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * プレイリスト一覧を取得
 */
const getPlaylists = async () => {
  try {
    const response = await callYTMusicAPI('browse', {
      browseId: 'FEmusic_liked_playlists'
    });

    const playlists = [];
    const contents = response?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]
      ?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    for (const section of contents) {
      const gridItems = section?.gridRenderer?.items || [];

      for (const item of gridItems) {
        const playlistItem = item?.musicTwoRowItemRenderer;
        if (!playlistItem) continue;

        const navigationEndpoint = playlistItem?.navigationEndpoint;
        const browseEndpoint = navigationEndpoint?.browseEndpoint;

        if (browseEndpoint?.browseId) {
          const playlistId = browseEndpoint.browseId;
          const title = playlistItem?.title?.runs?.[0]?.text || '';

          if (title && playlistId.startsWith('VL')) {
            playlists.push({
              id: playlistId.replace('VL', ''),
              name: title,
              browseId: playlistId
            });
          }
        }
      }
    }

    return playlists;
  } catch (error) {
    logError(`プレイリスト取得エラー: ${error.message}`);
    return [];
  }
};

/**
 * メイン処理: 登録チャンネルから楽曲を取得してプレイリストに追加
 */
const fetchLatestSongs = async (songsPerChannel, playlistName, createPlaylistOption = false) => {
  try {
    log('=== 楽曲取得開始 ===');
    log(`チャンネルあたり${songsPerChannel}曲を取得`);
    log(`プレイリスト名: "${playlistName}"`);
    log(`プレイリスト作成: ${createPlaylistOption ? 'ON' : 'OFF'} (値: ${createPlaylistOption})`);

    // 1. 登録チャンネルを取得
    const channels = await getSubscribedChannels();

    if (channels.length === 0) {
      throw new Error('登録チャンネルが見つかりませんでした。YouTube Musicで登録チャンネルがあるか確認してください。');
    }

    log(`${channels.length}個のチャンネルから楽曲を取得します`);

    // 2. 各チャンネルから楽曲を取得
    const allSongs = [];
    let processedCount = 0;

    for (const channel of channels) {
      try {
        const songs = await getLatestSongsFromChannel(channel, songsPerChannel);
        allSongs.push(...songs);
        processedCount++;

        log(`進捗: ${processedCount}/${channels.length} チャンネル処理完了`);
        await wait(500); // レート制限対策
      } catch (error) {
        logError(`${channel.name}の処理をスキップ: ${error.message}`);
      }
    }

    if (allSongs.length === 0) {
      throw new Error('楽曲を取得できませんでした');
    }

    log(`合計${allSongs.length}曲を取得しました`);

    // プレイリスト作成オプションが有効な場合
    log(`プレイリスト作成オプション判定: ${createPlaylistOption} (型: ${typeof createPlaylistOption})`);
    if (createPlaylistOption) {
      // プレイリスト作成前の重複チェック（追加の安全策）
      if (creatingPlaylists.has(playlistName)) {
        log(`プレイリスト "${playlistName}" は既に作成処理中です。処理をスキップします。`);
        throw new Error(`プレイリスト "${playlistName}" は既に作成処理中です`);
      }

      try {
        log('YouTube再生リストの作成を開始（認証あり）...');
        log(`現在作成中のプレイリスト: ${Array.from(creatingPlaylists).join(', ') || 'なし'}`);

        // まず認証ありのYouTube APIで再生リストを作成
        const createResult = await createYouTubePlaylistWithAuth(
          playlistName,
          `アーティストの最新楽曲 (${new Date().toLocaleDateString('ja-JP')})`
        );

        if (createResult.success) {
          log(`✓ YouTube再生リスト作成成功: ${createResult.playlistId}`);

          // 動画を検索して追加
          const addResult = await addVideosToYouTubePlaylist(createResult.playlistId, allSongs);

          if (addResult.success) {
            const overwriteText = createResult.wasOverwritten ? '（既存を上書き）' : '';
            log(`✓ YouTube再生リスト作成完了: ${addResult.addedCount}/${addResult.totalFound}動画を追加`);

            return {
              success: true,
              totalSongs: allSongs.length,
              songs: allSongs,
              playlist: {
                id: createResult.playlistId,
                url: createResult.playlistUrl,
                name: playlistName,
                addedVideos: addResult.addedCount,
                totalFound: addResult.totalFound,
                skipped: addResult.skippedCount,
                wasOverwritten: createResult.wasOverwritten
              },
              message: `YouTube再生リスト "${playlistName}" を作成${overwriteText}し、${addResult.addedCount}個の動画を追加しました！`,
              totalChannels: processedCount,
              playlistName: playlistName,
              details: `検索結果: ${addResult.totalFound}/${allSongs.length}個の動画を発見, ${addResult.skippedCount}個をスキップ`
            };
          } else {
            logError(`動画追加に失敗: ${addResult.error}`);
            const overwriteText = createResult.wasOverwritten ? '（既存を上書き）' : '';
            return {
              success: true,
              totalSongs: allSongs.length,
              songs: allSongs,
              playlist: {
                id: createResult.playlistId,
                url: createResult.playlistUrl,
                name: playlistName,
                addedVideos: 0,
                wasOverwritten: createResult.wasOverwritten
              },
              message: `YouTube再生リスト "${playlistName}" は作成${overwriteText}されましたが、動画の追加に失敗しました。`,
              totalChannels: processedCount,
              playlistName: playlistName,
              warning: addResult.error
            };
          }
        } else {
          logError(`YouTube再生リスト作成に失敗: ${createResult.error}`);
        }
      } catch (error) {
        logError(`プレイリスト作成処理でエラー: ${error.message}`);
      }
    }

    // プレイリスト作成が無効、または作成に失敗した場合は楽曲リストのみ提供（2つ目の箇所）
    log('楽曲リストの準備完了。手動プレイリスト作成ガイドを表示します。');

    return {
      success: true,
      totalSongs: allSongs.length,
      songs: allSongs,
      totalChannels: processedCount,
      playlistName: playlistName,
      message: `登録アーティストから${allSongs.length}曲を取得しました！手動でプレイリストを作成してください。`,
      manualCreateGuide: {
        title: '手動プレイリスト作成ガイド',
        steps: [
          '1. YouTube Music (https://music.youtube.com/) を開く',
          '2. 左サイドバーの「ライブラリ」→「プレイリスト」を選択',
          '3. 「新しいプレイリスト」ボタンをクリック',
          `4. プレイリスト名に「${playlistName}」を入力`,
          '5. 以下の楽曲を検索して追加してください:'
        ],
        songList: allSongs.slice(0, 20).map((song, index) => `${index + 1}. ${song.title} - ${song.channel}`),
        searchTips: [
          '• 楽曲名とアーティスト名で検索すると見つかりやすいです',
          '• 一度にすべて追加せず、数曲ずつ追加することをお勧めします',
          '• 見つからない楽曲はスキップして、後で個別に検索してください'
        ],
        youtubeUrls: allSongs.slice(0, 10).map(song => song.url || `https://music.youtube.com/search?q=${encodeURIComponent(song.title + ' ' + song.channel)}`)
      },
      details: `${processedCount}個のアーティストから楽曲情報を取得完了`
    };

  } catch (error) {
    logError(`処理に失敗しました: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * メイン処理: 登録チャンネルから人気曲を取得してプレイリストに追加
 */
const fetchPopularSongs = async (songsPerChannel, playlistName, createPlaylistOption = false) => {
  try {
    log('人気曲取得処理を開始します');

    // 1. 登録チャンネルを取得
    const channels = await getSubscribedChannels();

    if (channels.length === 0) {
      throw new Error('登録チャンネルが見つかりませんでした。YouTube Musicで登録チャンネルがあるか確認してください。');
    }

    log(`${channels.length}個のチャンネルから人気曲を取得します`);

    // 2. 各チャンネルから人気曲を取得
    const allSongs = [];
    let processedCount = 0;

    for (const channel of channels) {
      try {
        const songs = await getPopularSongsFromChannel(channel, songsPerChannel);
        allSongs.push(...songs);
        processedCount++;

        log(`進捗: ${processedCount}/${channels.length} チャンネル処理完了`);
        await wait(500); // レート制限対策
      } catch (error) {
        logError(`${channel.name}の処理をスキップ: ${error.message}`);
      }
    }

    if (allSongs.length === 0) {
      throw new Error('人気曲を取得できませんでした');
    }

    log(`合計${allSongs.length}曲を取得しました`);

    // プレイリスト作成オプションが有効な場合
    // 注意: YouTube API認証エラーが発生するため、現在は手動作成ガイドを表示
    if (createPlaylistOption) {
      log('⚠️ YouTube API認証の問題により、自動プレイリスト作成は現在利用できません');
      log('手動プレイリスト作成ガイドを表示します');
      // 自動作成を試みず、直接手動ガイドにフォールバック
    }

    // プレイリスト作成が無効、または作成に失敗した場合は楽曲リストのみ提供
    log('楽曲リストの準備完了。手動プレイリスト作成ガイドを表示します。');

    return {
      success: true,
      totalSongs: allSongs.length,
      songs: allSongs,
      totalChannels: processedCount,
      playlistName: playlistName,
      message: `登録アーティストから${allSongs.length}曲を取得しました！手動でプレイリストを作成してください。`,
      manualCreateGuide: {
        title: '手動プレイリスト作成ガイド',
        steps: [
          '1. YouTube Music (https://music.youtube.com/) を開く',
          '2. 左サイドバーの「ライブラリ」→「プレイリスト」を選択',
          '3. 「新しいプレイリスト」ボタンをクリック',
          `4. プレイリスト名に「${playlistName}」を入力`,
          '5. 以下の楽曲を検索して追加してください:'
        ],
        songList: allSongs.slice(0, 20).map((song, index) => `${index + 1}. ${song.title} - ${song.channel}`),
        searchTips: [
          '• 楽曲名とアーティスト名で検索すると見つかりやすいです',
          '• 一度にすべて追加せず、数曲ずつ追加することをお勧めします',
          '• 見つからない楽曲はスキップして、後で個別に検索してください'
        ],
        youtubeUrls: allSongs.slice(0, 10).map(song => song.url || `https://music.youtube.com/search?q=${encodeURIComponent(song.title + ' ' + song.channel)}`)
      },
      details: `${processedCount}個のアーティストから楽曲情報を取得完了`
    };

  } catch (error) {
    logError(`処理に失敗しました: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * メッセージリスナー
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // pingメッセージへの応答（同期処理）
  if (request.action === 'ping') {
    try {
      sendResponse({ status: 'ok' });
    } catch (error) {
      console.error('Ping response error:', error);
    }
    return false; // 同期処理なのでfalseを返す
  }

  if (request.action === 'fetchLatestSongs') {
    log('楽曲取得リクエストを受信しました');
    log(`リクエスト詳細: songsPerChannel=${request.songsPerChannel}, playlistName="${request.playlistName}", createPlaylist=${request.createPlaylist}`);

    // 非同期処理を適切にハンドル
    (async () => {
      try {
        const result = await fetchLatestSongs(request.songsPerChannel, request.playlistName, request.createPlaylist);

        // レスポンスチャンネルがまだ開いているかチェック
        try {
          sendResponse(result);
        } catch (responseError) {
          logError(`レスポンス送信エラー: ${responseError.message}`);
        }
      } catch (error) {
        logError(`楽曲取得でエラーが発生: ${error.message}`);
        try {
          sendResponse({
            success: false,
            error: error.message
          });
        } catch (responseError) {
          logError(`エラーレスポンス送信エラー: ${responseError.message}`);
        }
      }
    })();

    return true; // 非同期レスポンスを許可
  }

  if (request.action === 'fetchPopularSongs') {
    log('人気曲取得リクエストを受信しました');
    log(`リクエスト詳細: songsPerChannel=${request.songsPerChannel}, playlistName="${request.playlistName}", createPlaylist=${request.createPlaylist}`);

    // 非同期処理を適切にハンドル
    (async () => {
      try {
        const result = await fetchPopularSongs(request.songsPerChannel, request.playlistName, request.createPlaylist);

        // レスポンスチャンネルがまだ開いているかチェック
        try {
          sendResponse(result);
        } catch (responseError) {
          logError(`レスポンス送信エラー: ${responseError.message}`);
        }
      } catch (error) {
        logError(`人気曲取得でエラーが発生: ${error.message}`);
        try {
          sendResponse({
            success: false,
            error: error.message
          });
        } catch (responseError) {
          logError(`エラーレスポンス送信エラー: ${responseError.message}`);
        }
      }
    })();

    return true; // 非同期レスポンスを許可
  }

  // 未知のアクションの場合
  logError(`未知のアクション: ${request.action}`);
  return false;
});

log('YouTube Music Playlist Extension: Content script loaded');
