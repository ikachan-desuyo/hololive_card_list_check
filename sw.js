// Service Worker for offline caching with centralized version management
// Version: 4.10.0-VERSION-SYNC-UPDATE

// Import version configuration and utility functions
importScripts('./sw-version.js', './sw-utils.js', './sw-handlers.js');

const CACHE_NAME = `hololive-card-tool-v${APP_VERSION}-${VERSION_DESCRIPTION.replace(/\s+/g, '-')}`;
const urlsToCache = [
  './',
  './index.html',
  './card_list.html',
  './collection_binder.html',
  './binder_collection.html',
  './holoca_skill_page.html',
  './deck_builder.html',
  './css/collection_binder.css',
  './css/binder_collection.css',
  './css/card_list.css',
  './css/deck_builder.css',
  './css/holoca_skill_page.css',
  './js/collection_binder.js',
  './js/binder_collection.js',
  './js/card_list.js',
  './js/deck_builder.js',
  './js/holoca_skill_page.js',
  './sw-version.js',
  './sw-utils.js',
  './sw-handlers.js',
  './json_file/card_data.json',
  './json_file/release_dates.json',
  './images/Logo_-_Hololive_Official_Card_Game.png',
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

// Install event
self.addEventListener('install', function(event) {
  console.log('%c⚡ Service Worker: Install Event', 'color: #4CAF50; font-weight: bold;');
  logVersionInfo();
  
  // 強制的に即座にスキップ待機
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('%c📦 Service Worker: Caching files...', 'color: #2196F3;');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('%c✅ Service Worker: All files cached successfully', 'color: #4CAF50;');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('❌ Service Worker: Caching failed:', error);
      })
  );
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('%c🔄 Service Worker: Activate Event', 'color: #FF9800; font-weight: bold;');
  
  event.waitUntil(
    Promise.all([
      // Delete old caches and create fresh cache
      caches.keys().then(function(cacheNames) {
        console.log('Found caches:', cacheNames);
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== CACHE_NAME) {
              console.log('%c🗑️ Service Worker: Deleting old cache:', cacheName, 'color: #F44336;');
              return caches.delete(cacheName);
            }
          })
        );
      }).then(function() {
        // Recreate cache with fresh content for HTML files
        return caches.open(CACHE_NAME).then(cache => {
          console.log('Updating cache with fresh HTML content:', CACHE_NAME);
          const cacheBustingUrls = urlsToCache.map(url => {
            if (url.endsWith('.html') || url === './') {
              return `${url}?v=${APP_VERSION}&t=${Date.now()}`;
            }
            return url;
          });
          return cache.addAll(cacheBustingUrls);
        });
      }),
      // Immediately claim all clients
      self.clients.claim().then(function() {
        console.log('%c✅ Service Worker: Activated and claimed clients', 'color: #4CAF50;');
        // Notify all clients about cache update
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_UPDATED',
              message: 'Service Worker updated with modular structure',
              version: APP_VERSION,
              timestamp: Date.now()
            });
          });
        });
      })
    ])
  );
});

// Fetch event - Network First for HTML, Cache First for other resources
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // 外部画像URL（hololive-official-cardgame.com）も処理対象にする
  const isExternalImage = event.request.url.includes('hololive-official-cardgame.com') &&
                          (event.request.url.includes('.jpg') ||
                           event.request.url.includes('.png') ||
                           event.request.url.includes('.jpeg') ||
                           event.request.url.includes('.webp'));

  // 内部リソースまたは外部画像URLの場合のみ処理
  if (!event.request.url.startsWith(self.location.origin) && !isExternalImage) {
    return;
  }

  // HTMLファイルに対してはNetwork First戦略を使用
  const isHTMLFile = event.request.url.endsWith('.html') || 
                     event.request.url === self.location.origin + '/' ||
                     event.request.url.endsWith('/');

  if (isExternalImage) {
    // 外部画像の場合は特別な処理
    console.log('🖼️ Service Worker: Handling external image:', event.request.url);
    
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          if (response) {
            console.log('Serving cached image:', event.request.url);
            return response;
          }
          
          // キャッシュになければネットワークから取得（no-corsモード）
          return fetch(event.request, { mode: 'no-cors' }).then(function(response) {
            if (response && response.type === 'opaque') {
              // opaqueレスポンスをキャッシュに保存
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(event.request, responseToCache).then(() => {
                  console.log('🖼️ Successfully cached external image:', event.request.url);
                }).catch((error) => {
                  console.warn('⚠️ Failed to cache external image:', event.request.url, error);
                });
              });
            }
            return response;
          }).catch(function() {
            // ネットワーク失敗時はプレースホルダーを提供
            console.log('Network failed for external image, using placeholder:', event.request.url);
            return caches.match('./images/placeholder.png');
          });
        })
    );
  } else if (isHTMLFile) {
    // ログを減らすために、HTMLファイルのリクエストのみログ出力
    console.log('%c🌐 Service Worker: Fetching HTML with Network First', event.request.url, 'color: #607D8B;');
    
    event.respondWith(
      // Network First: まずネットワークから取得を試行（キャッシュバスティング付き）
      fetch(event.request.url + (event.request.url.includes('?') ? '&' : '?') + 't=' + Date.now(), {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
        .then(function(response) {
          if (response && response.status === 200) {
            // ネットワークから取得成功時はキャッシュを更新
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseToCache);
            });
            console.log('Serving fresh HTML from network:', event.request.url);
            return response;
          }
          throw new Error('Network response not ok');
        })
        .catch(function() {
          // ネットワーク失敗時はキャッシュから提供
          console.log('Network failed, serving HTML from cache:', event.request.url);
          return caches.match(event.request);
        })
    );
  } else {
    // その他のリソースはCache First戦略
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          // キャッシュにあればそれを返す
          if (response) {
            return response;
          }
          
          // キャッシュになければネットワークから取得
          return fetch(event.request).then(function(response) {
            // 有効なレスポンスかチェック
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // レスポンスをクローンしてキャッシュに保存
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(function(cache) {
                // カード画像を動的にキャッシュ（優先度を上げる・ログ追加）
                if (event.request.url.includes('hololive-official-cardgame.com') ||
                    event.request.url.includes('.jpg') ||
                    event.request.url.includes('.png') ||
                    event.request.url.includes('.jpeg') ||
                    event.request.url.includes('.webp')) {
                  cache.put(event.request, responseToCache).then(() => {
                    console.log('🖼️ Successfully cached image:', event.request.url);
                  }).catch((error) => {
                    console.warn('⚠️ Failed to cache image:', event.request.url, error);
                  });
                }
              });
            
            return response;
          }).catch(function() {
            // ネットワーク失敗時、画像の場合はプレースホルダーを提供
            if (event.request.destination === 'image') {
              return caches.match('./images/placeholder.png');
            }
          });
        })
        .catch(function(error) {
          console.error('❌ Service Worker: Fetch failed:', error);
          
          // HTMLページの場合はオフライン用のフォールバック
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        })
    );
  }
});

// Message event - delegate to handler
self.addEventListener('message', handleMessage);

// Background sync for data updates when connection is restored
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(updateCache());
  }
});

// ✅ エラーハンドリング
self.addEventListener('error', function(event) {
  console.error('❌ Service Worker Error:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
  console.error('❌ Service Worker Unhandled Rejection:', event.reason);
});

// ✅ 初期化完了メッセージ
console.log('%c🎉 Hololive Card Tool Service Worker initialized successfully with modular structure!', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
