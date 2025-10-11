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
  });

  // 設定を保存
  const saveSettings = () => {
    const fetchMode = document.querySelector('input[name="fetchMode"]:checked')?.value || 'latest';
    chrome.storage.sync.set({
      songsPerChannel: parseInt(songsPerChannelInput.value),
      playlistName: playlistNameInput.value,
      fetchMode: fetchMode
    });
  };

  songsPerChannelInput.addEventListener('change', saveSettings);
  playlistNameInput.addEventListener('change', saveSettings);
  fetchModeRadios.forEach(radio => {
    radio.addEventListener('change', saveSettings);
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
      hideStatus();
      hideProgress();
      resultsDiv.classList.add('hidden');

      const songsPerChannel = parseInt(songsPerChannelInput.value);
      const playlistName = playlistNameInput.value || 'Latest from Subscriptions';
      const fetchMode = document.querySelector('input[name="fetchMode"]:checked')?.value || 'latest';

      fetchButton.disabled = true;
      showStatus('チャンネル情報を取得中...', 'info');
      showProgress(10, 'YouTube Musicにアクセス中...');

      // アクティブなタブを取得
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url.includes('music.youtube.com')) {
        throw new Error('YouTube Musicのページで実行してください');
      }

      // モードに応じてアクションを決定
      const action = fetchMode === 'popular' ? 'fetchPopularSongs' : 'fetchLatestSongs';
      const modeText = fetchMode === 'popular' ? '人気曲' : '最新曲';

      // コンテンツスクリプトにメッセージを送信
      showProgress(30, '登録チャンネルを取得中...');
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: action,
        songsPerChannel: songsPerChannel,
        playlistName: playlistName
      });

      if (response.success) {
        showProgress(100, '完了しました');
        showStatus(`${response.totalSongs}曲（${modeText}）をプレイリストに追加しました`, 'success');
        showResults(response.songs);
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
});
