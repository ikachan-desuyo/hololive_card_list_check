// Service Worker for offline caching with centralized version management
const APP_VERSION = '3.19.0';
const VERSION_DESCRIPTION = '単一ページバージョンチェック機能追加';

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  'index.html': '3.9.0',
  'card_list.html': '3.6.0',  // 単一ページバージョンチェック対応
  'holoca_skill_page.html': '3.6.0',  // 単一ページバージョンチェック対応
  'deck_builder.html': '3.8.0'  // 単一ページバージョンチェック対応
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: '🚀 新しいバージョンが利用可能です',
  description: '単一ページバージョンチェック機能を追加しました',
  changes: [
    '✅ 個別ページのバージョンチェック機能を追加',
    '✅ ページ固有の更新確認ダイアログを実装',
    '✅ 不要な全体バージョンチェック情報を削除',
    '✅ より精密なバージョン管理システムを導入'
  ]
};

const CACHE_NAME = `hololive-card-tool-v${APP_VERSION}-${VERSION_DESCRIPTION.replace(/\s+/g, '-')}`;
const urlsToCache = [
  './',
  './index.html',
  './card_list.html',
  './holoca_skill_page.html',
  './deck_builder.html',
  './json_file/card_data.json',
  './json_file/release_dates.json',
  './images/placeholder.png',
  './images/TCG-ColorArtIcon-Blue.png',
  './images/TCG-ColorArtIcon-Colorless.png',
  './images/TCG-ColorArtIcon-Green.png',
  './images/TCG-ColorArtIcon-Purple.png',
  './images/TCG-ColorArtIcon-Red.png',
  './images/TCG-ColorArtIcon-White.png',
  './images/TCG-ColorArtIcon-Yellow.png',
  './images/TCG-ColorIcon-Blue.png',
  './images/TCG-ColorIcon-BlueRed.png',
  './images/TCG-ColorIcon-Colorless.png',
  './images/TCG-ColorIcon-Green.png',
  './images/TCG-ColorIcon-Purple.png',
  './images/TCG-ColorIcon-Red.png',
  './images/TCG-ColorIcon-White.png',
  './images/TCG-ColorIcon-WhiteGreen.png',
  './images/TCG-ColorIcon-Yellow.png',
  './images/tokkou_50_blue.png',
  './images/tokkou_50_green.png',
  './images/tokkou_50_purple.png',
  './images/tokkou_50_red.png',
  './images/tokkou_50_white.png',
  './images/tokkou_50_yellow.png'
];

// ✅ バージョン比較機能
function compareVersions(current, cached) {
  if (!cached) return true; // キャッシュされていない場合は更新が必要
  
  const currentParts = current.split('.').map(n => parseInt(n, 10));
  const cachedParts = cached.split('.').map(n => parseInt(n, 10));
  
  for (let i = 0; i < Math.max(currentParts.length, cachedParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const cachedPart = cachedParts[i] || 0;
    
    if (currentPart > cachedPart) return true;
    if (currentPart < cachedPart) return false;
  }
  
  return false; // 同じバージョン
}

// ✅ バージョン情報を取得する機能
async function getVersionInfo() {
  return {
    appVersion: APP_VERSION,
    pageVersions: PAGE_VERSIONS,
    updateDetails: UPDATE_DETAILS,
    cacheName: CACHE_NAME
  };
}

// ✅ ページバージョンをチェックする機能
async function checkPageVersions() {
  const outdatedPages = [];
  
  for (const [page, expectedVersion] of Object.entries(PAGE_VERSIONS)) {
    try {
      // ネットワークから最新のページを取得して比較
      const response = await fetch(`./${page}`, { cache: 'no-cache' });
      if (!response.ok) {
        outdatedPages.push({page, reason: 'fetch_failed', expectedVersion});
        continue;
      }
      
      const htmlText = await response.text();
      const versionMatch = htmlText.match(/<!-- Version: ([\d\.]+-?[A-Z-]*) -/);
      const actualVersion = versionMatch ? versionMatch[1].replace(/-CENTRALIZED-VERSION$/, '') : null;
      
      console.log(`Page ${page}: expected=${expectedVersion}, actual=${actualVersion}`);
      
      // キャッシュされたバージョンもチェック
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(`./${page}`);
      let cachedVersion = null;
      
      if (cachedResponse) {
        const cachedText = await cachedResponse.text();
        const cachedVersionMatch = cachedText.match(/<!-- Version: ([\d\.]+-?[A-Z-]*) -/);
        cachedVersion = cachedVersionMatch ? cachedVersionMatch[1].replace(/-CENTRALIZED-VERSION$/, '') : null;
      }
      
      console.log(`Page ${page}: expected=${expectedVersion}, actual=${actualVersion}, cached=${cachedVersion}`);
      
      // 詳細なバージョン比較とミスマッチの理由を判定
      let mismatchReason = null;
      let needsUpdate = false;
      
      if (!actualVersion) {
        mismatchReason = 'actual_version_not_found';
        needsUpdate = true;
      } else if (compareVersions(expectedVersion, actualVersion)) {
        mismatchReason = 'expected_vs_actual_mismatch';
        needsUpdate = true;
      } else if (cachedVersion && compareVersions(actualVersion, cachedVersion)) {
        mismatchReason = 'actual_vs_cached_mismatch';
        needsUpdate = true;
      } else if (!cachedVersion) {
        mismatchReason = 'no_cached_version';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        outdatedPages.push({
          page, 
          reason: mismatchReason || 'version_mismatch', 
          expectedVersion, 
          actualVersion, 
          cachedVersion,
          details: {
            expectedVersion,
            actualVersion: actualVersion || 'unknown',
            cachedVersion: cachedVersion || 'none',
            mismatchType: mismatchReason
          }
        });
      }
    } catch (error) {
      console.error(`Error checking version for ${page}:`, error);
      outdatedPages.push({page, reason: 'error', expectedVersion});
    }
  }
  
  return outdatedPages;
}

// Install event - cache resources and immediately take control
self.addEventListener('install', (event) => {
  console.log('Service Worker installing... Force update mode');
  // 強制的に即座にスキップ待機
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Cache failed:', error);
      })
  );
});

// Listen for messages from client
self.addEventListener('message', async (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('Received SKIP_WAITING message, taking control');
      self.skipWaiting();
      break;
      
    case 'GET_VERSION_INFO':
      // バージョン情報を返す
      const versionInfo = await getVersionInfo();
      event.ports[0]?.postMessage({
        type: 'VERSION_INFO_RESPONSE',
        data: versionInfo
      });
      break;
      
    case 'CHECK_OUTDATED_PAGES':
      // 古いページをチェック
      console.log('Checking outdated pages...');
      const outdatedPages = await checkPageVersions();
      console.log('Outdated pages result:', outdatedPages);
      event.ports[0]?.postMessage({
        type: 'OUTDATED_PAGES_RESPONSE',
        data: outdatedPages
      });
      break;
      
    case 'GET_UPDATE_MESSAGE':
      // 更新メッセージを生成
      const message = `${UPDATE_DETAILS.title}\n\n${UPDATE_DETAILS.description}\n\n` +
        UPDATE_DETAILS.changes.join('\n') + '\n\nページを更新しますか？';
      event.ports[0]?.postMessage({
        type: 'UPDATE_MESSAGE_RESPONSE',
        data: { message, details: UPDATE_DETAILS }
      });
      break;
      
    case 'CHECK_VERSION_MISMATCH':
      // 詳細なバージョンチェック
      console.log('Performing detailed version mismatch check...');
      try {
        const versionCheckResult = await checkPageVersions();
        const detailedInfo = {
          hasUpdates: versionCheckResult.length > 0,
          outdatedPages: versionCheckResult,
          currentAppVersion: APP_VERSION,
          pageVersions: PAGE_VERSIONS,
          timestamp: new Date().toISOString()
        };
        
        event.ports[0]?.postMessage({
          type: 'VERSION_MISMATCH_RESPONSE',
          data: detailedInfo
        });
      } catch (error) {
        console.error('Version check error:', error);
        event.ports[0]?.postMessage({
          type: 'VERSION_MISMATCH_ERROR',
          error: error.message
        });
      }
      break;
      
    case 'CHECK_SINGLE_PAGE_VERSION':
      // 単一ページのバージョンチェック
      console.log('Performing single page version check for:', data?.page);
      try {
        const targetPage = data?.page;
        if (!targetPage || !PAGE_VERSIONS[targetPage]) {
          throw new Error(`Invalid page: ${targetPage}`);
        }
        
        const expectedVersion = PAGE_VERSIONS[targetPage];
        let pageInfo = null;
        
        // ネットワークから最新のページを取得
        const response = await fetch(`./${targetPage}`, { cache: 'no-cache' });
        if (!response.ok) {
          pageInfo = {
            page: targetPage,
            reason: 'fetch_failed',
            expectedVersion,
            actualVersion: null,
            cachedVersion: null
          };
        } else {
          const htmlText = await response.text();
          const versionMatch = htmlText.match(/<!-- Version: ([\d\.]+-?[A-Z-]*) -/);
          const actualVersion = versionMatch ? versionMatch[1].replace(/-CENTRALIZED-VERSION$/, '') : null;
          
          // キャッシュされたバージョンもチェック
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(`./${targetPage}`);
          let cachedVersion = null;
          
          if (cachedResponse) {
            const cachedText = await cachedResponse.text();
            const cachedVersionMatch = cachedText.match(/<!-- Version: ([\d\.]+-?[A-Z-]*) -/);
            cachedVersion = cachedVersionMatch ? cachedVersionMatch[1].replace(/-CENTRALIZED-VERSION$/, '') : null;
          }
          
          console.log(`Single page ${targetPage}: expected=${expectedVersion}, actual=${actualVersion}, cached=${cachedVersion}`);
          
          // バージョン比較とミスマッチの理由を判定
          let mismatchReason = null;
          let needsUpdate = false;
          
          if (!actualVersion) {
            mismatchReason = 'actual_version_not_found';
            needsUpdate = true;
          } else if (compareVersions(expectedVersion, actualVersion)) {
            mismatchReason = 'expected_vs_actual_mismatch';
            needsUpdate = true;
          } else if (cachedVersion && compareVersions(actualVersion, cachedVersion)) {
            mismatchReason = 'actual_vs_cached_mismatch';
            needsUpdate = true;
          } else if (!cachedVersion) {
            mismatchReason = 'no_cached_version';
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            pageInfo = {
              page: targetPage,
              reason: mismatchReason || 'version_mismatch',
              expectedVersion,
              actualVersion,
              cachedVersion,
              details: {
                expectedVersion,
                actualVersion: actualVersion || 'unknown',
                cachedVersion: cachedVersion || 'none',
                mismatchType: mismatchReason
              }
            };
          }
        }
        
        const singlePageResult = {
          hasUpdates: pageInfo !== null,
          pageInfo: pageInfo,
          currentAppVersion: APP_VERSION,
          targetPage: targetPage,
          expectedVersion: expectedVersion,
          timestamp: new Date().toISOString()
        };
        
        event.ports[0]?.postMessage({
          type: 'SINGLE_PAGE_VERSION_RESPONSE',
          data: singlePageResult
        });
      } catch (error) {
        console.error('Single page version check error:', error);
        event.ports[0]?.postMessage({
          type: 'SINGLE_PAGE_VERSION_ERROR',
          error: error.message
        });
      }
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Activate event - clean up old caches and claim clients when skip waiting
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating... Clearing ALL caches aggressively');
  event.waitUntil(
    Promise.all([
      // Delete ALL caches (not just old ones)
      caches.keys().then((cacheNames) => {
        console.log('Found ALL caches:', cacheNames);
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Force deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        // Recreate the current cache
        return caches.open(CACHE_NAME).then(cache => {
          console.log('Recreating cache:', CACHE_NAME);
          return cache.addAll(urlsToCache);
        });
      }),
      // Immediately claim all clients
      self.clients.claim().then(() => {
        console.log('Claimed all clients');
        // Notify all clients to reload
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_UPDATED',
              message: 'All caches cleared, please reload'
            });
          });
        });
      })
    ])
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and external URLs
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // HTMLファイルに対してはNetwork First戦略を使用
  const isHTMLFile = event.request.url.endsWith('.html') || 
                     event.request.url === self.location.origin + '/' ||
                     event.request.url.endsWith('/');

  if (isHTMLFile) {
    event.respondWith(
      // Network First: まずネットワークから取得を試行
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            // ネットワークから取得成功時はキャッシュを更新
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            console.log('Serving fresh HTML from network:', event.request.url);
            return response;
          }
          throw new Error('Network response not ok');
        })
        .catch(() => {
          // ネットワーク失敗時はキャッシュから提供
          console.log('Network failed, serving HTML from cache:', event.request.url);
          return caches.match(event.request);
        })
    );
  } else {
    // その他のリソースはCache First戦略
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Return cached version or fetch from network
          if (response) {
            console.log('Serving from cache:', event.request.url);
            return response;
          }

          // Fetch from network and cache the response
          return fetch(event.request).then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Cache card images dynamically
                if (event.request.url.includes('hololive-official-cardgame.com/cardlist/image/') ||
                    event.request.url.includes('.jpg') ||
                    event.request.url.includes('.png')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          }).catch(() => {
            // If network fails, try to serve a cached placeholder for images
            if (event.request.destination === 'image') {
              return caches.match('./images/placeholder.png');
            }
          });
        })
    );
  }
});

// Background sync for data updates when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(updateCache());
  }
});

// Function to update cache with latest data
async function updateCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([
      './json_file/card_data.json',
      './json_file/release_dates.json'
    ]);
    console.log('Cache updated with latest data');
  } catch (error) {
    console.log('Failed to update cache:', error);
  }
}
