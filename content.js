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
 * 待機関数
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * YouTube Music内部APIキーとコンテキストを取得
 */
const getYTMusicConfig = () => {
  try {
    // 方法1: window.ytcfg を使用
    if (window.ytcfg) {
      console.log('window.ytcfg が存在します:', window.ytcfg);

      // ytcfg.data_ にアクセス
      const data = window.ytcfg.data_ || window.ytcfg;
      const apiKey = data.INNERTUBE_API_KEY;
      const context = data.INNERTUBE_CONTEXT;

      if (apiKey && context) {
        console.log('方法1でAPI設定を取得しました (window.ytcfg)', { apiKey: apiKey.substring(0, 10) + '...' });
        return { apiKey, context };
      }
    }

    // 方法2: ページのscriptタグから抽出（より広範囲に検索）
    const scripts = document.querySelectorAll('script');
    console.log(`scriptタグを検索中... (${scripts.length}個)`);

    for (const script of scripts) {
      const scriptContent = script.textContent;
      if (scriptContent.includes('INNERTUBE_API_KEY')) {
        // INNERTUBE_API_KEYを抽出（より柔軟なパターン）
        const apiKeyMatch = scriptContent.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);

        if (apiKeyMatch) {
          console.log('APIキーを発見しました:', apiKeyMatch[1].substring(0, 10) + '...');

          // コンテキストを抽出（より正確なマッチング）
          // INNERTUBE_CONTEXTは複雑なネストされたオブジェクトなので、より広範囲に取得
          let context = null;

          // パターン1: より広範囲なマッチング
          const contextMatch1 = scriptContent.match(/"INNERTUBE_CONTEXT"\s*:\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})/);
          if (contextMatch1) {
            try {
              context = JSON.parse(contextMatch1[1]);
              console.log('コンテキストを抽出しました:', context);
            } catch (e) {
              console.log('コンテキストのJSON解析に失敗 (パターン1):', e.message);
            }
          }

          // コンテキストが取得できた場合
          if (context) {
            console.log('方法2でAPI設定を取得しました (scriptタグ、完全なコンテキスト)');
            return {
              apiKey: apiKeyMatch[1],
              context: context
            };
          }

          // コンテキストが取得できなかった場合、より詳細なデフォルトを使用
          console.log('方法2でAPIキーのみ取得、詳細なデフォルトコンテキストを使用');

          // クライアントバージョンを取得
          const versionMatch = scriptContent.match(/"clientVersion"\s*:\s*"([^"]+)"/);
          const clientVersion = versionMatch ? versionMatch[1] : '1.20241008.01.00';

          return {
            apiKey: apiKeyMatch[1],
            context: {
              client: {
                clientName: 'WEB_REMIX',
                clientVersion: clientVersion,
                gl: 'JP',
                hl: 'ja'
              }
            }
          };
        }
      }
    }

    // 方法3: ハードコードされたデフォルト値を使用（最後の手段）
    console.log('デフォルト設定を試行します');

    // YouTube MusicのページからAPIキーを動的に取得
    const pageContent = document.documentElement.innerHTML;
    const apiKeyMatch = pageContent.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
    const versionMatch = pageContent.match(/"clientVersion"\s*:\s*"([^"]+)"/);
    const clientVersion = versionMatch ? versionMatch[1] : '1.20241008.01.00';

    if (apiKeyMatch) {
      console.log('方法3でAPI設定を取得しました (ページコンテンツから)');
      return {
        apiKey: apiKeyMatch[1],
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: clientVersion,
            gl: 'JP',
            hl: 'ja'
          }
        }
      };
    }

    console.log('API設定を取得できませんでした。利用可能なオブジェクト:', {
      hasYtcfg: !!window.ytcfg,
      ytcfgType: typeof window.ytcfg,
      hasYtInitialData: !!window.ytInitialData,
      scriptCount: scripts.length,
      documentReady: document.readyState
    });
    return null;
  } catch (error) {
    logError(`設定取得エラー: ${error.message}`);
    console.error('詳細なエラー:', error);
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
  log('登録チャンネルを取得中...');

  // ページが完全に読み込まれるまで待機
  const isLoaded = await waitForPageLoad();
  if (!isLoaded) {
    throw new Error('YouTube Musicの読み込みに失敗しました。ページをリロードしてから再度お試しください。');
  }

  try {
    // browseエンドポイントでライブラリのアーティスト一覧を取得
    // YouTube Musicでは「登録チャンネル」ではなく「ライブラリのアーティスト」を使用
    const response = await callYTMusicAPI('browse', {
      browseId: 'FEmusic_library_corpus_track_artists'
    });

    const channels = [];

    log('APIレスポンスを解析中...');
    console.log('Response structure:', response);

    // ログイン状態を確認
    const loggedIn = response?.responseContext?.serviceTrackingParams?.find(
      p => p.service === 'GFEEDBACK'
    )?.params?.find(p => p.key === 'logged_in')?.value;

    if (loggedIn === '0') {
      throw new Error('YouTube Musicにログインしていません。\n\nhttps://music.youtube.com でログインしてから再度お試しください。');
    }

    // レスポンスから登録アーティスト/チャンネル情報を抽出
    // 複数のパターンを試す
    const tabs = response?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
    console.log('tabs found:', tabs.length);

    for (const tab of tabs) {
      const sectionList = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];

      for (const section of sectionList) {
        // gridRendererパターン
        const gridItems = section?.gridRenderer?.items || [];

        for (const item of gridItems) {
          const musicItem = item?.musicTwoRowItemRenderer;
          if (!musicItem) continue;

          const navigationEndpoint = musicItem?.navigationEndpoint;
          const browseEndpoint = navigationEndpoint?.browseEndpoint;

          if (browseEndpoint?.browseId) {
            const channelId = browseEndpoint.browseId;
            const title = musicItem?.title?.runs?.[0]?.text || '';

            // UCで始まるチャンネルID、またはFEで始まるbrowseIdを受け入れる
            if (title && (channelId.startsWith('UC') || channelId.startsWith('FE'))) {
              log(`アーティスト検出: ${title} (${channelId})`);
              channels.push({
                id: channelId,
                name: title,
                browseId: channelId
              });
            }
          }
        }

        // musicShelfRendererパターン
        const shelfItems = section?.musicShelfRenderer?.contents || [];

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

            if (title && (channelId.startsWith('UC') || channelId.startsWith('FE'))) {
              log(`アーティスト検出 (shelf): ${title} (${channelId})`);
              channels.push({
                id: channelId,
                name: title,
                browseId: channelId
              });
            }
          }
        }
      }
    }

    log(`${channels.length}個のアーティスト/チャンネルを検出しました`);
    return channels;
  } catch (error) {
    logError(`チャンネル取得エラー: ${error.message}`);

    // フォールバック: DOMから取得を試みる
    return await getSubscribedChannelsFromDOM();
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
    // チャンネルの楽曲一覧を取得
    const response = await callYTMusicAPI('browse', {
      browseId: channel.browseId,
      params: 'ggMCCAE%3D' // 人気順のパラメータ (Popular Songs)
    });

    const songsWithViews = [];

    // レスポンスから楽曲情報を抽出
    const tabs = response?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];

    for (const tab of tabs) {
      const sectionList = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];

      for (const section of sectionList) {
        const musicShelf = section?.musicShelfRenderer;
        if (!musicShelf) continue;

        // "人気の楽曲" セクションを探す
        const shelfTitle = musicShelf?.title?.runs?.[0]?.text || '';

        const items = musicShelf.contents || [];

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

            // 再生回数の情報を取得（あれば）
            let viewCount = 0;
            if (flexColumns.length > 1) {
              const statsText = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer
                ?.text?.runs?.map(r => r.text).join(' ') || '';

              // "1.2M views" のような形式から数値を抽出
              const viewMatch = statsText.match(/([\d.]+[KMB]?)\s*(views|回|再生)/i);
              if (viewMatch) {
                viewCount = parseViewCount(viewMatch[1]);
              }
            }

            if (title && videoId) {
              songsWithViews.push({
                title: title,
                channel: channel.name,
                channelId: channel.id,
                videoId: videoId,
                viewCount: viewCount,
                url: `https://music.youtube.com/watch?v=${videoId}`
              });
            }
          }
        }
      }
    }

    // 再生回数でソート（降順）
    songsWithViews.sort((a, b) => b.viewCount - a.viewCount);

    const topSongs = songsWithViews.slice(0, count);
    log(`${channel.name}から人気曲${topSongs.length}曲を取得しました`);

    return topSongs;

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
 * プレイリストを作成
 */
const createPlaylist = async (playlistName, description = '') => {
  try {
    log(`プレイリスト「${playlistName}」を作成中...`);

    const response = await callYTMusicAPI('playlist/create', {
      title: playlistName,
      description: description,
      privacyStatus: 'PRIVATE',
      videoIds: [] // 空のプレイリストを作成
    });

    const playlistId = response?.playlistId;

    if (!playlistId) {
      throw new Error('プレイリストIDを取得できませんでした');
    }

    log(`プレイリスト作成完了: ${playlistId}`);
    return {
      id: playlistId,
      name: playlistName
    };

  } catch (error) {
    logError(`プレイリスト作成エラー: ${error.message}`);
    throw error;
  }
};

/**
 * プレイリストを作成または取得
 */
const getOrCreatePlaylist = async (playlistName) => {
  log(`プレイリスト「${playlistName}」を取得または作成中...`);

  try {
    // 既存のプレイリストを検索
    const playlists = await getPlaylists();
    const existingPlaylist = playlists.find(p => p.name === playlistName);

    if (existingPlaylist) {
      log(`既存のプレイリストを使用: ${existingPlaylist.name}`);
      return existingPlaylist;
    }

    // 見つからなければ新規作成
    return await createPlaylist(playlistName, '自動生成されたプレイリスト');

  } catch (error) {
    logError(`プレイリスト取得/作成エラー: ${error.message}`);
    throw error;
  }
};

/**
 * プレイリストに楽曲を追加
 */
const addSongsToPlaylist = async (playlistId, songs) => {
  log(`${songs.length}曲をプレイリストに追加中...`);

  try {
    const videoIds = songs.map(s => s.videoId);

    // 複数の楽曲を一度に追加
    const response = await callYTMusicAPI('browse/edit_playlist', {
      playlistId: playlistId,
      actions: videoIds.map(videoId => ({
        action: 'ACTION_ADD_VIDEO',
        addedVideoId: videoId
      }))
    });

    log('プレイリストへの追加完了');
    return true;

  } catch (error) {
    logError(`プレイリスト追加エラー: ${error.message}`);

    // フォールバック: 1曲ずつ追加を試みる
    let successCount = 0;
    for (const song of songs) {
      try {
        await callYTMusicAPI('browse/edit_playlist', {
          playlistId: playlistId,
          actions: [{
            action: 'ACTION_ADD_VIDEO',
            addedVideoId: song.videoId
          }]
        });
        successCount++;
        await wait(300); // レート制限対策
      } catch (err) {
        logError(`楽曲追加失敗 (${song.title}): ${err.message}`);
      }
    }

    log(`${successCount}/${songs.length}曲を追加しました`);
    return successCount > 0;
  }
};

/**
 * メイン処理: 登録チャンネルから楽曲を取得してプレイリストに追加
 */
const fetchLatestSongs = async (songsPerChannel, playlistName) => {
  try {
    log('楽曲取得処理を開始します');

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

    // 3. プレイリストを作成または取得
    const playlist = await getOrCreatePlaylist(playlistName);

    // 4. プレイリストに楽曲を追加
    await addSongsToPlaylist(playlist.id, allSongs);

    return {
      success: true,
      totalSongs: allSongs.length,
      totalChannels: processedCount,
      playlistName: playlist.name,
      songs: allSongs.map(s => ({ channel: s.channel, title: s.title }))
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
const fetchPopularSongs = async (songsPerChannel, playlistName) => {
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

    // 3. プレイリストを作成または取得
    const playlist = await getOrCreatePlaylist(playlistName);

    // 4. プレイリストに楽曲を追加
    await addSongsToPlaylist(playlist.id, allSongs);

    return {
      success: true,
      totalSongs: allSongs.length,
      totalChannels: processedCount,
      playlistName: playlist.name,
      songs: allSongs.map(s => ({ channel: s.channel, title: s.title }))
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
  // pingメッセージへの応答
  if (request.action === 'ping') {
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'fetchLatestSongs') {
    log('楽曲取得リクエストを受信しました');

    fetchLatestSongs(request.songsPerChannel, request.playlistName)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });

    return true; // 非同期レスポンスを許可
  }

  if (request.action === 'fetchPopularSongs') {
    log('人気曲取得リクエストを受信しました');

    fetchPopularSongs(request.songsPerChannel, request.playlistName)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });

    return true; // 非同期レスポンスを許可
  }
});

log('YouTube Music Playlist Extension: Content script loaded');
