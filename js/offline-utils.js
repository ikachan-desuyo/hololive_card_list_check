// オフライン状態管理とナビゲーションのユーティリティ
// Version: 1.0.0

// オフライン状態インジケーターを作成・表示（右下にシンプル表示）
function createOfflineIndicator() {
  // 既に存在する場合は削除
  const existing = document.getElementById('offline-indicator');
  if (existing) {
    existing.remove();
  }

  const indicator = document.createElement('div');
  indicator.id = 'offline-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(220, 53, 69, 0.9);
    color: white;
    padding: 6px 10px;
    border-radius: 15px;
    font-size: 11px;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    display: none;
    animation: fadeIn 0.3s ease-out;
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255,255,255,0.2);
  `;
  indicator.innerHTML = '� オフライン';

  // アニメーション用CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(indicator);

  return indicator;
}

// オンライン状態インジケーターを作成・表示（右下にシンプル表示）
function createOnlineIndicator() {
  // 既に存在する場合は削除
  const existing = document.getElementById('online-indicator');
  if (existing) {
    existing.remove();
  }

  const indicator = document.createElement('div');
  indicator.id = 'online-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(40, 167, 69, 0.9);
    color: white;
    padding: 6px 10px;
    border-radius: 15px;
    font-size: 11px;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    display: none;
    animation: fadeIn 0.3s ease-out;
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255,255,255,0.2);
  `;
  indicator.innerHTML = '🟢 オンライン復帰';

  document.body.appendChild(indicator);
  return indicator;
}

// オフライン状態の監視を開始
function initOfflineMonitoring() {
  const offlineIndicator = createOfflineIndicator();
  const onlineIndicator = createOnlineIndicator();

  function updateOnlineStatus() {
    console.log('Network status changed:', navigator.onLine ? 'Online' : 'Offline');
    
    if (navigator.onLine) {
      // オンライン状態
      offlineIndicator.style.display = 'none';
      onlineIndicator.style.display = 'block';
      
      // 3秒後にオンライン表示を隠す
      setTimeout(() => {
        onlineIndicator.style.display = 'none';
      }, 3000);
    } else {
      // オフライン状態
      onlineIndicator.style.display = 'none';
      offlineIndicator.style.display = 'block';
    }
  }

  // 初期状態をチェック
  if (!navigator.onLine) {
    offlineIndicator.style.display = 'block';
  }

  // イベントリスナーを追加
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  console.log('Offline monitoring initialized');
}

// ページ間の安全なナビゲーション（Service Worker信頼版）
function navigateToPage(url) {
  console.log('navigateToPage called with:', url);
  
  // Service Workerがアクティブな場合は、オンライン/オフライン関係なく
  // Service Workerのキャッシュ戦略に任せる
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    console.log('Service Worker active, navigating with SW cache support:', url);
    window.location.href = url;
    return;
  }
  
  if (navigator.onLine) {
    // Service Worker無効でオンライン時は通常のナビゲーション
    console.log('No SW, online: navigating to', url);
    window.location.href = url;
  } else {
    // Service Worker無効でオフライン時のみ警告
    console.log('No SW, offline: showing warning for', url);
    
    const debugInfo = `このページはオフラインでは利用できません。

Service Workerが無効のため、オフラインキャッシュを利用できません。
インターネット接続を確認してから再度お試しください。

デバッグ情報:
- 要求されたURL: ${url}
- Service Worker: 無効
- オンライン状態: オフライン`;
    
    alert(debugInfo);
  }
}

// ページがキャッシュされているかチェック
async function checkPageAvailability(url) {
  try {
    // Service Workerがアクティブかチェック
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      console.log('Service Worker not available');
      return false;
    }

    // 複数のURL形式でチェック（相対パス、絶対パス、末尾スラッシュ対応）
    const urlsToCheck = [
      url,
      `./${url}`,
      url.startsWith('./') ? url.substring(2) : `./${url}`,
      new URL(url, window.location.origin).href,
      url.replace(/^\.\//, ''),
    ];

    console.log('Checking availability for URLs:', urlsToCheck);

    // キャッシュをチェック
    const cacheNames = await caches.keys();
    console.log('Available cache names:', cacheNames);
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      
      // 各URL形式でチェック
      for (const checkUrl of urlsToCheck) {
        try {
          const response = await cache.match(checkUrl);
          if (response) {
            console.log('Page found in cache:', checkUrl, 'in cache:', cacheName);
            return true;
          }
        } catch (matchError) {
          console.warn('Cache match error for', checkUrl, ':', matchError);
        }
      }
    }
    
    console.log('Page not found in any cache for:', url);
    return false;
  } catch (error) {
    console.error('Page availability check failed:', error);
    return false;
  }
}

// オフライン利用可能なページのリスト
function getOfflineAvailablePages() {
  return [
    { url: './index.html', name: 'ホーム' },
    { url: './card_list.html', name: 'カード一覧' },
    { url: './collection_binder.html', name: 'コレクションバインダー' },
    { url: './binder_collection.html', name: 'バインダーコレクション' },
    { url: './holoca_skill_page.html', name: 'ホロカスキル' },
    { url: './deck_builder.html', name: 'デッキビルダー' }
  ];
}

// ページ読み込み時に実行
if (typeof window !== 'undefined') {
  // DOM読み込み完了後にオフライン監視を開始
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOfflineMonitoring);
  } else {
    initOfflineMonitoring();
  }
}

// グローバル関数として公開
if (typeof window !== 'undefined') {
  window.navigateToPage = navigateToPage;
  window.checkPageAvailability = checkPageAvailability;
  window.getOfflineAvailablePages = getOfflineAvailablePages;
  
  // デバッグ用: オフライン状態をシミュレート
  window.simulateOffline = function() {
    if (navigator.onLine) {
      const indicator = document.getElementById('offline-indicator');
      if (indicator) {
        indicator.style.display = 'block';
        console.log('オフライン状態をシミュレート中...');
      }
    }
  };
  
  // デバッグ用: オンライン状態に戻す
  window.simulateOnline = function() {
    const offlineIndicator = document.getElementById('offline-indicator');
    const onlineIndicator = document.getElementById('online-indicator');
    if (offlineIndicator) offlineIndicator.style.display = 'none';
    if (onlineIndicator) {
      onlineIndicator.style.display = 'block';
      setTimeout(() => {
        onlineIndicator.style.display = 'none';
      }, 3000);
    }
    console.log('オンライン状態に復帰');
  };
  
  console.log('Offline utilities loaded successfully');
}
