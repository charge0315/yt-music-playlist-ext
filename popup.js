// ポップアップのロジック
document.addEventListener('DOMContentLoaded', () => {
  const fetchButton = document.getElementById('fetchSongs');
  const songsPerChannelInput = document.getElementById('songsPerChannel');
  const playlistNameInput = document.getElementById('playlistName');
  const fetchModeRadios = document.querySelectorAll('input[name="fetchMode"]');
  const statusDiv = document.getElementById('status');
  const progressDiv = document.getElementById('progress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const resultsDiv = document.getElementById('results');
  const resultList = document.getElementById('resultList');
  // ...existing code...

  // 保存された設定を読み込む
  chrome.storage.sync.get(['songsPerChannel', 'playlistName', 'fetchMode'], (data) => {
    if (data.songsPerChannel) {
      songsPerChannelInput.value = data.songsPerChannel;
    }
    if (data.playlistName) {
      playlistNameInput.value = data.playlistName;
    }
    if (data.fetchMode) {
      const radio = document.querySelector(`input[name="fetchMode"][value="${data.fetchMode}"]`);
      if (radio) radio.checked = true;
    }
    console.log('Loaded settings:', data);
  });

  // 設定を保存
  const saveSettings = () => {
    const fetchMode = document.querySelector('input[name="fetchMode"]:checked')?.value || 'latest';
    const settings = {
      songsPerChannel: parseInt(songsPerChannelInput.value),
      playlistName: playlistNameInput.value,
      fetchMode: fetchMode
    };
    chrome.storage.sync.set(settings);
    console.log('Saved settings:', settings);
  };

  // プレイリスト名のプレースホルダーを更新
  const updatePlaylistNamePlaceholder = () => {
    const fetchMode = document.querySelector('input[name="fetchMode"]:checked')?.value || 'latest';
    if (fetchMode === 'popular') {
      playlistNameInput.placeholder = 'Popular from Subscriptions';
    } else {
      playlistNameInput.placeholder = 'Latest from Subscriptions';
    }
  };

  // 初期プレースホルダーを設定
  updatePlaylistNamePlaceholder();

  songsPerChannelInput.addEventListener('change', saveSettings);
  playlistNameInput.addEventListener('change', saveSettings);
  fetchModeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      updatePlaylistNamePlaceholder();
      saveSettings();
    });
  });

  // ステータス表示
  const showStatus = (message, type = 'info') => {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.classList.remove('hidden');
  };

  const hideStatus = () => {
    statusDiv.classList.add('hidden');
  };

  // プログレス表示
  const showProgress = (percent, text) => {
    progressDiv.classList.remove('hidden');
    progressBar.style.width = `${percent}%`;
    progressText.textContent = text;
  };

  const hideProgress = () => {
    progressDiv.classList.add('hidden');
    progressBar.style.width = '0%';
  };

  // 結果表示
  const showResults = (songs) => {
    resultList.innerHTML = '';
    songs.forEach(song => {
      const li = document.createElement('li');
      li.textContent = `${song.channel}: ${song.title}`;
      resultList.appendChild(li);
    });
    resultsDiv.classList.remove('hidden');
  };

  // メインの処理
  fetchButton.addEventListener('click', async () => {
    try {
      // アクティブタブがYouTubeまたはYouTube Musicか確認
      const tabs = await new Promise((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, resolve));
      const activeTab = tabs && tabs[0];
      const url = activeTab?.url || '';
      if (!/https?:\/\/(music\.)?youtube\.com/.test(url) && !/https?:\/\/www\.youtube\.com/.test(url)) {
        showStatus('YouTube (または YouTube Music) のタブを開いてログインしてください。', 'error');
        return;
      }

      // content script経由でより確実なログインチェックを行う
      const loginResponse = await new Promise((resolve) => {
        chrome.tabs.sendMessage(activeTab.id, { action: 'checkLogin' }, (resp) => {
          resolve(resp);
        });
      });

      if (!loginResponse) {
        showStatus('content script がこのタブに注入されていない、または応答がありません。ページをリロードして再試行してください。', 'error');
        console.log('Login check response: undefined');
<<<<<<< HEAD
        debugOutput.classList.remove('hidden');
        debugOutput.textContent = 'Login check response: undefined';
=======
        // ...existing code...
>>>>>>> e19537a (不要なデバッグ解析用ファイルの一括削除とUI整理)
        return;
      }

      if (!loginResponse.loggedIn) {
        showStatus('YouTubeにログインしていません。YouTubeにログインしてから再度お試しください。', 'error');
        console.log('Login check response:', loginResponse);
<<<<<<< HEAD
        debugOutput.classList.remove('hidden');
        debugOutput.textContent = `Login check response: ${JSON.stringify(loginResponse, null, 2)}`;
=======
        // ...existing code...
>>>>>>> e19537a (不要なデバッグ解析用ファイルの一括削除とUI整理)
        return;
      }

      hideStatus();
      hideProgress();
      resultsDiv.classList.add('hidden');

      const songsPerChannel = parseInt(songsPerChannelInput.value);
      const fetchMode = document.querySelector('input[name="fetchMode"]:checked')?.value || 'latest';
      const createPlaylist = true; // プレイリスト作成は必須

      // 取得モードに応じてプレイリスト名を設定
      let defaultPlaylistName;
      if (fetchMode === 'popular') {
        defaultPlaylistName = 'Popular from Subscriptions';
      } else {
        defaultPlaylistName = 'Latest from Subscriptions';
      }
      const playlistName = playlistNameInput.value || defaultPlaylistName;

      console.log('Popup settings:', { songsPerChannel, playlistName, fetchMode, createPlaylist });

      fetchButton.disabled = true;
      showStatus('チャンネル情報を取得中...', 'info');
      showProgress(10, 'YouTube Musicにアクセス中...');

      // アクティブなタブを取得
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.url) {
        throw new Error('アクティブなタブが見つかりません');
      }

      if (!tab.url.includes('music.youtube.com')) {
        throw new Error('YouTube Musicのページで実行してください。\nhttps://music.youtube.com を開いてから再度お試しください。');
      }

      // content scriptが読み込まれているか確認
      showProgress(20, 'content scriptを確認中...');

      try {
        // content scriptに ping を送って確認
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      } catch (pingError) {
        console.log('Content script not loaded, injecting...');
        // content scriptが読み込まれていない場合は手動で注入
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          // 少し待機してから再試行
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (injectError) {
          throw new Error('Content scriptの読み込みに失敗しました。\nページをリロードしてから再度お試しください。');
        }
      }

      // モードに応じてアクションを決定
      const action = fetchMode === 'popular' ? 'fetchPopularSongs' : 'fetchLatestSongs';
      const modeText = fetchMode === 'popular' ? '人気曲' : '最新曲';

      // コンテンツスクリプトにメッセージを送信（タイムアウト付き）
      showProgress(30, '登録チャンネルを取得中...');

      // タイムアウト処理付きでメッセージを送信
      const sendMessageWithTimeout = (message, timeoutMs = 300000) => { // 5分タイムアウト
        return Promise.race([
          chrome.tabs.sendMessage(tab.id, message),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('処理がタイムアウトしました。もう一度お試しください。')), timeoutMs)
          )
        ]);
      };

      const response = await sendMessageWithTimeout({
        action: action,
        songsPerChannel: songsPerChannel,
        playlistName: playlistName,
        createPlaylist: createPlaylist
      });

      if (response.success) {
        showProgress(100, '完了しました');

        if (response.message) {
          // 楽曲リスト表示バージョン（再生リスト作成成功/失敗両対応）
          showStatus(response.message, response.isAuthError ? 'warning' : 'success');
          showResults(response.songs);

          // 認証エラーの場合は特別な手順を表示
          if (response.isAuthError && response.playlist.instructions) {
            const authErrorDiv = document.createElement('div');
            authErrorDiv.className = 'auth-error-instructions';
            authErrorDiv.innerHTML = `
              <h3>🔐 手動作成手順</h3>
              <div class="instructions-list">
                ${response.playlist.instructions.map(instruction =>
    `<p>${instruction}</p>`
  ).join('')}
              </div>
              ${response.playlist.songList ? `
                <div class="song-list-for-manual">
                  <h4>追加する楽曲:</h4>
                  <div class="manual-song-list">
                    ${response.playlist.songList.slice(0, 10).map(song =>
    `<div class="manual-song-item">${song}</div>`
  ).join('')}
                    ${response.playlist.songList.length > 10 ?
    `<div class="manual-song-item">...他${response.playlist.songList.length - 10}曲</div>` : ''}
                  </div>
                  <button class="copy-song-list" onclick="
                    navigator.clipboard.writeText('${response.playlist.songList.join('\\n')}')
                    .then(() => this.textContent = 'コピー完了！')
                    .catch(() => this.textContent = 'コピー失敗');
                  ">楽曲リストをコピー</button>
                </div>
              ` : ''}
            `;

            const resultsDiv = document.getElementById('results');
            resultsDiv.insertBefore(authErrorDiv, resultsDiv.firstChild);
          }

          // YouTube再生リストが作成された場合、リンクを表示
          else if (response.playlist && response.playlist.url) {
            const overwriteText = response.playlist.wasOverwritten ? ' 🔄 (上書き)' : ' ✨ (新規作成)';
            const needsManualAdd = response.needsManualAdd ? ' ⚠️ (手動追加必要)' : '';

            const playlistLink = document.createElement('div');
            playlistLink.className = 'playlist-link';
            playlistLink.innerHTML = `
              <h3>作成された再生リスト${overwriteText}${needsManualAdd}:</h3>
              <a href="${response.playlist.url}" target="_blank" class="playlist-url">
                🎵 ${response.playlist.name}
              </a>
              <p class="playlist-stats">
                追加された動画: ${response.playlist.addedVideos || 0}個
                ${response.details ? `<br>${response.details}` : ''}
                ${response.playlist.wasOverwritten ? '<br><small>⚠️ 同名の既存再生リストを上書きしました</small>' : ''}
              </p>
              
              ${response.playlist.requiresManualAdd ? `
                <div class="manual-add-section">
                  <h4>🔧 手動追加が必要です</h4>
                  <div class="manual-instructions">
                    ${response.playlist.manualAddInstructions ?
    response.playlist.manualAddInstructions.map(instruction =>
      `<p>${instruction}</p>`
    ).join('') : ''}
                  </div>
                  
                  ${response.playlist.videoList ? `
                    <div class="video-list-container">
                      <h5>追加する動画一覧:</h5>
                      <div class="video-list">
                        ${response.playlist.videoList.slice(0, 10).map(video =>
    `<div class="video-item">${video}</div>`
  ).join('')}
                        ${response.playlist.videoList.length > 10 ?
    `<div class="video-item">...他${response.playlist.videoList.length - 10}個</div>` : ''}
                      </div>
                      <button class="copy-video-list" onclick="
                        navigator.clipboard.writeText('${response.playlist.videoList.join('\\n')}')
                        .then(() => this.textContent = 'コピー完了！')
                        .catch(() => this.textContent = 'コピー失敗');
                      ">動画リストをコピー</button>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            `;

            const resultsDiv = document.getElementById('results');
            resultsDiv.insertBefore(playlistLink, resultsDiv.firstChild);
          }

          // 手動プレイリスト作成ガイドを表示
          if (response.manualCreateGuide) {
            const manualGuideDiv = document.createElement('div');
            manualGuideDiv.className = 'manual-guide';
            manualGuideDiv.innerHTML = `
              <div class="manual-guide-content">
                <h3>${response.manualCreateGuide.title}</h3>
                <div class="guide-steps">
                  ${response.manualCreateGuide.steps.map(step =>
    `<div class="guide-step">${step}</div>`
  ).join('')}
                </div>
                
                <div class="song-list-section">
                  <h4>楽曲リスト (上位20曲):</h4>
                  <div class="manual-song-list">
                    ${response.manualCreateGuide.songList.map(song =>
    `<div class="manual-song-item">${song}</div>`
  ).join('')}
                    ${response.songs.length > 20 ?
    `<div class="manual-song-item more-songs">...他${response.songs.length - 20}曲</div>` : ''}
                  </div>
                  
                  <div class="guide-actions">
                    <button class="copy-song-list" onclick="
                      const songList = ${JSON.stringify(response.manualCreateGuide.songList)};
                      navigator.clipboard.writeText(songList.join('\\n'))
                        .then(() => this.textContent = '楽曲リストをコピー完了！')
                        .catch(() => this.textContent = 'コピー失敗');
                    ">楽曲リストをコピー</button>
                    
                    <button class="open-youtube-music" onclick="window.open('https://music.youtube.com/library/playlists', '_blank')">
                      YouTube Musicを開く
                    </button>
                  </div>
                </div>
                
                <div class="search-tips">
                  <h4>検索のコツ:</h4>
                  ${response.manualCreateGuide.searchTips.map(tip =>
    `<div class="search-tip">${tip}</div>`
  ).join('')}
                </div>
              </div>
            `;

            const resultsDiv = document.getElementById('results');
            resultsDiv.insertBefore(manualGuideDiv, resultsDiv.firstChild);
          }

          // 楽曲リストのコピー機能を追加
          const copyButton = document.createElement('button');
          copyButton.textContent = '楽曲リストをコピー';
          copyButton.className = 'copy-button';
          copyButton.onclick = () => {
            const songList = response.songs.map(song =>
              `${song.channel} - ${song.title}`
            ).join('\n');
            navigator.clipboard.writeText(songList).then(() => {
              showStatus('楽曲リストをクリップボードにコピーしました', 'success');
            }).catch(() => {
              showStatus('コピーに失敗しました', 'error');
            });
          };

          const resultsDiv = document.getElementById('results');
          resultsDiv.appendChild(copyButton);
        } else {
          // 従来のプレイリスト作成成功バージョン
          showStatus(`${response.totalSongs}曲（${modeText}）をプレイリストに追加しました`, 'success');
          showResults(response.songs);
        }
      } else {
        throw new Error(response.error || '楽曲の取得に失敗しました');
      }

    } catch (error) {
      console.error('Error:', error);
      showStatus(error.message, 'error');
      hideProgress();
    } finally {
      fetchButton.disabled = false;
    }
  });
<<<<<<< HEAD
=======

  // ...existing code...
>>>>>>> e19537a (不要なデバッグ解析用ファイルの一括削除とUI整理)
});
