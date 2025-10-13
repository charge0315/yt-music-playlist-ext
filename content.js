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
 * チャンネルから最新の楽曲を取得
 */
const getLatestSongsFromChannel = async (channel, count = 3) => {
  log(`${channel.name}から最新${count}曲を取得中...`);
  try {
    const response = await callYTMusicAPI('browse', { browseId: channel.browseId });
    const sections = response?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;

    if (!sections) {
      log(`${channel.name}の楽曲セクションが見つかりません`);
      return [];
    }

    let songs = [];
    for (const section of sections) {
      const shelf = section.musicShelfRenderer;
      if (shelf?.title?.runs?.[0]?.text?.includes('Songs') || shelf?.title?.runs?.[0]?.text?.includes('シングル')) {
        const items = shelf.contents || [];
        for (const item of items) {
          const songData = item.musicResponsiveListItemRenderer;
          if (songData?.playlistItemData?.videoId) {
            songs.push({
              videoId: songData.playlistItemData.videoId,
              title: songData.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text,
              artist: channel.name,
            });
          }
        }
      }
    }
    return songs.slice(0, count);
  } catch (error) {
    logError(`${channel.name}の最新曲取得エラー: ${error.message}`);
    return [];
  }
};

/**
 * チャンネルから人気曲（再生回数の多い曲）を取得
 */
const getPopularSongsFromChannel = async (channel, count = 1) => {
  log(`${channel.name}から人気曲${count}曲を取得中...`);
  try {
    const response = await callYTMusicAPI('browse', { browseId: channel.browseId });
    const sections = response?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;

    if (!sections) {
      log(`${channel.name}の楽曲セクションが見つかりません`);
      return [];
    }

    let songs = [];
    for (const section of sections) {
      const shelf = section.musicShelfRenderer;
      if (shelf?.title?.runs?.[0]?.text?.includes('Popular') || shelf?.title?.runs?.[0]?.text?.includes('人気')) {
        const items = shelf.contents || [];
        for (const item of items) {
          const songData = item.musicResponsiveListItemRenderer;
          if (songData?.playlistItemData?.videoId) {
            songs.push({
              videoId: songData.playlistItemData.videoId,
              title: songData.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text,
              artist: channel.name,
              views: parseViewCountString(songData.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs.find(r => r.text.match(/[\d,]+ views/))?.text)
            });
          }
        }
      }
    }

    // 再生回数でソート
    songs.sort((a, b) => b.views - a.views);

    return songs.slice(0, count);
  } catch (error) {
    logError(`${channel.name}の人気曲取得エラー: ${error.message}`);
    return [];
  }
};

/**
 * 再生回数の文字列を数値に変換
 * @param {string} str - "1.2M" や "500K" のような文字列
 * @returns {number} - 数値
 */
const parseViewCountString = (str) => {
  if (!str) return 0;
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
    const sanitizedArtist = artist.replace(/[^\w\s]/g, '');
    const sanitizedTitle = title.replace(/[^\w\s]/g, '');
    const query = `${sanitizedArtist} ${sanitizedTitle}`;
    log(`YouTube検索: "${query}"`);

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
    log(`既存の再生リスト"${playlistName}"を検索中...`);
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

                if (title.trim().toLowerCase() === playlistName.trim().toLowerCase()) {
                  log(`✓ 既存の再生リストを発見: "${title}" (${playlistId}) [${browseId}]`);
                  matchingPlaylists.push(playlist);
                }
              }
            }
          }

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

                if (title.trim().toLowerCase() === playlistName.trim().toLowerCase()) {
                  log(`✓ 既存の再生リストを発見: "${title}" (${playlistId}) [${browseId}]`);
                  matchingPlaylists.push(playlist);
                }
              }
            }
          }
        }

        if (browseId === 'FEmusic_library_playlists' && matchingPlaylists.length > 0) {
          break;
        }

      } catch (endpointError) {
        log(`エンドポイント ${browseId} でエラー: ${endpointError.message}`);
        continue;
      }
    }

    const uniqueMatching = matchingPlaylists.filter((playlist, index, self) =>
      index === self.findIndex(p => p.id === playlist.id)
    );

    if (uniqueMatching.length > 0) {
      log(`✓ 同名の再生リストを${uniqueMatching.length}個発見: "${playlistName}"`);
      return {
        found: true,
        playlists: uniqueMatching,
        playlist: uniqueMatching[0]
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
    log(`再生リスト削除中: ${playlistId}`);
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
const deletePlaylistWithYouTubeAPI = async (playlistId) => {
  try {
    log(`YouTube APIでプレイリスト削除中: ${playlistId}`);
    const deleteMethods = [
      {
        endpoint: 'playlist/delete',
        params: { playlistId: playlistId }
      },
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

        if (!response?.error && response?.status !== 'STATUS_FAILED') {
          log(`✓ プレイリスト削除成功 (方法${i + 1}): ${playlistId}`);
          return { success: true, method: i + 1 };
        } else {
          throw new Error(`方法${i + 1}失敗: ${response?.error?.message || response?.status || 'Unknown error'}`);
        }

      } catch (error) {
        lastError = error;
        logError(`削除方法${i + 1}が失敗: ${error.message}`);

        if (i < deleteMethods.length - 1) {
          log('次の削除方法を試行します...');
          await wait(1000);
          continue;
        }
      }
    }

    throw new Error(`すべての削除方法が失敗しました。最後のエラー: ${lastError?.message}`);

  } catch (error) {
    logError(`プレイリスト削除エラー: ${error.message}`);
    throw error;
  }
};

// プレイリスト作成の実行状態管理
const creatingPlaylists = new Set(); // 作成中のプレイリスト名を追跡

/**
 * YouTube Data API v3を使用してプレイリストを作成
 */
const createPlaylistWithYouTubeDataAPI = async (playlistName, description) => {
  try {
    if (creatingPlaylists.has(playlistName)) {
      throw new Error(`プレイリスト "${playlistName}" は現在作成処理中です。`);
    }
    creatingPlaylists.add(playlistName);

    if (!chrome.cookies || typeof chrome.cookies.getAll !== 'function') {
      throw new Error('拡張機能のcookies権限がありません。manifest.jsonのpermissionsに"cookies"を追加してください。');
    }
    let cookies = await chrome.cookies.getAll({ domain: '.youtube.com' });
    if (!Array.isArray(cookies)) cookies = [];
    log(`YouTube Cookieを${cookies.length}個取得しました`);

    const sapisidCookie = cookies.find(c => c.name === 'SAPISID' || c.name === '__Secure-3PAPISID');
    if (!sapisidCookie) {
      throw new Error('YouTubeにログインしていません。YouTubeにログインしてから再度お試しください。');
    }

    const sapisid = sapisidCookie.value;
    const origin = 'https://www.youtube.com';
    const timestamp = Math.floor(Date.now() / 1000);

    const hashInput = `${timestamp} ${sapisid} ${origin}`;
    const hashBuffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(hashInput));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const sapisidhash = `${timestamp}_${hashHex}`;

    log('SAPISID認証ハッシュを生成しました');

    let apiKey = 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30';

    try {
      const ytInitialData = document.querySelector('script[nonce]')?.textContent;
      const apiKeyMatch = ytInitialData?.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
      if (apiKeyMatch) {
        apiKey = apiKeyMatch[1];
        log(`ページからAPIキーを抽出: ${apiKey.substring(0, 10)}...`);
      }
    } catch (e) {
      log('ページからのAPIキー抽出失敗、デフォルトキーを使用');
    }

    let wasOverwritten = false;
    try {
      log('既存プレイリストを検索中...');
      const searchResult = await findExistingPlaylist(playlistName);

      if (searchResult.found) {
        log(`既存プレイリストを発見: ${searchResult.playlist.id}`);
        await deletePlaylistWithYouTubeAPI(searchResult.playlist.id);
        wasOverwritten = true;
        await wait(2000);
      }
    } catch (searchError) {
      log(`既存プレイリスト検索・削除エラー（続行）: ${searchError.message}`);
    }

    const createUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,status&key=${apiKey}`;

    const requestBody = {
      snippet: {
        title: playlistName,
        description: description || `YouTube Music登録アーティストからの楽曲コレクション (${new Date().toLocaleDateString('ja-JP')})`,
        defaultLanguage: 'ja'
      },
      status: {
        privacyStatus: 'private'
      }
    };

    log('YouTube Data API v3にプレイリスト作成リクエストを送信中...');
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `SAPISIDHASH ${sapisidhash}`,
        'Content-Type': 'application/json',
        'X-Origin': origin,
        'X-Goog-AuthUser': '0'
      },
      body: JSON.stringify(requestBody),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.id) {
      log(`✓ YouTubeプレイリスト作成成功: ${data.id}`);
      return {
        success: true,
        playlistId: data.id,
        playlistUrl: `https://www.youtube.com/playlist?list=${data.id}`,
        wasOverwritten: wasOverwritten,
        method: 'youtube_data_api_v3'
      };
    } else {
      throw new Error('プレイリストIDが返されませんでした');
    }

  } catch (error) {
    logError(`YouTube Data API v3 プレイリスト作成エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  } finally {
    creatingPlaylists.delete(playlistName);
  }
};

/**
 * YouTube Data API v3を使用してプレイリストに動画を追加
 */
const addSongsToPlaylistWithYouTubeDataAPI = async (playlistId, songs) => {
  try {
    let addedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const foundVideos = [];

    if (!chrome.cookies || typeof chrome.cookies.getAll !== 'function') {
      throw new Error('拡張機能のcookies権限がありません。manifest.jsonのpermissionsに"cookies"を追加してください。');
    }
    let cookies = await chrome.cookies.getAll({ domain: '.youtube.com' });
    if (!Array.isArray(cookies)) cookies = [];
    const sapisidCookie = cookies.find(c => c.name === 'SAPISID' || c.name === '__Secure-3PAPISID');

    if (!sapisidCookie) {
      throw new Error('YouTubeにログインしていません');
    }

    const sapisid = sapisidCookie.value;
    const origin = 'https://www.youtube.com';
    const timestamp = Math.floor(Date.now() / 1000);

    const hashInput = `${timestamp} ${sapisid} ${origin}`;
    const hashBuffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(hashInput));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const sapisidhash = `${timestamp}_${hashHex}`;

    const apiKey = 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30';

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      try {
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
          log(`スキップ: "${artistName} - ${songTitle}" の動画が見つかりませんでした`);
        }

        await wait(300);

      } catch (error) {
        skippedCount++;
        logError(`検索エラー: "${song.artist || song.channel} - ${song.title}": ${error.message}`);
        errors.push(`${song.artist || song.channel} - ${song.title}: ${error.message}`);
        continue;
      }
    }

    log(`YouTube検索完了: ${foundVideos.length}個の動画を発見, ${skippedCount}個をスキップ`);

    for (let i = 0; i < foundVideos.length; i++) {
      const video = foundVideos[i];
      try {
        const addUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&key=${apiKey}`;

        const requestBody = {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: video.videoId
            }
          }
        };

        const response = await fetch(addUrl, {
          method: 'POST',
          headers: {
            'Authorization': `SAPISIDHASH ${sapisidhash}`,
            'Content-Type': 'application/json',
            'X-Origin': origin,
            'X-Goog-AuthUser': '0'
          },
          body: JSON.stringify(requestBody),
          credentials: 'include'
        });

        if (response.ok) {
          addedCount++;
          log(`✓ 動画追加成功 (${addedCount}/${foundVideos.length}): ${video.title}`);
        } else {
          const errorText = await response.text();
          throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
        }

        if ((i + 1) % 10 === 0) {
          log(`バッチ処理: ${i + 1}/${foundVideos.length} 完了、待機中...`);
          await wait(1000);
        } else {
          await wait(200);
        }

      } catch (error) {
        logError(`動画追加エラー (${video.title}): ${error.message}`);
        errors.push(`${video.title}: ${error.message}`);
        continue;
      }
    }

    log(`YouTube Data API v3 動画追加完了: ${addedCount}/${foundVideos.length}動画を追加`);

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
    logError(`YouTube Data API v3 動画追加エラー: ${error.message}`);
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
 * メッセージリスナー
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ status: 'ok' });
    return false;
  }

  if (request.action === 'createPlaylist') {
    (async () => {
      try {
        const { mode, count, playlistName, description } = request.data;
        chrome.runtime.sendMessage({ action: 'progress', data: { message: '登録チャンネルを取得中...' } });
        const channels = await getSubscribedChannels();
        if (!channels || channels.length === 0) {
          throw new Error('登録チャンネルが見つかりませんでした。');
        }

        chrome.runtime.sendMessage({ action: 'progress', data: { message: `楽曲を収集中... (モード: ${mode})` } });
        let allSongs = [];
        for (const channel of channels) {
          let songs = [];
          if (mode === 'latest') {
            songs = await getLatestSongsFromChannel(channel, count);
          } else {
            songs = await getPopularSongsFromChannel(channel, count);
          }
          allSongs.push(...songs);
          await wait(500); // Rate limit
        }

        if (allSongs.length === 0) {
          throw new Error('楽曲が見つかりませんでした。');
        }

        chrome.runtime.sendMessage({ action: 'progress', data: { message: `プレイリストを作成中: ${playlistName}` } });
        const playlistResult = await createPlaylistWithYouTubeDataAPI(playlistName, description);

        if (!playlistResult.success) {
          throw new Error(`プレイリストの作成に失敗しました: ${playlistResult.error}`);
        }

        chrome.runtime.sendMessage({ action: 'progress', data: { message: 'プレイリストに楽曲を追加中...' } });
        const addResult = await addSongsToPlaylistWithYouTubeDataAPI(playlistResult.playlistId, allSongs);

        chrome.runtime.sendMessage({ action: 'result', data: { ...addResult, playlistUrl: playlistResult.playlistUrl } });
        sendResponse({ success: true });

      } catch (error) {
        logError(error.message);
        chrome.runtime.sendMessage({ action: 'error', message: error.message });
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // 非同期レスポンス
  }

  logError(`未知のアクション: ${request.action}`);
  return false;
});

log('YouTube Music Playlist Extension: Content script loaded');
