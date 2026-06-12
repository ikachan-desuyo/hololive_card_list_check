// Service Worker for offline caching with centralized version management
// Version: 4.18.0
// 注意: バージョンアップ時は sw-version.js と合わせてこのコメントも更新すること。
// （SWの更新検知は sw.js 本体のバイト差分が最速・最確実。importScripts の
//   sw-version.js だけの変更だと、環境によって検知がHTTPキャッシュのTTL分遅れる）

// Import version configuration and utility functions
importScripts('./sw-version.js', './sw-utils.js', './sw-handlers.js');

const CACHE_NAME = `hololive-card-tool-v${APP_VERSION}-${VERSION_DESCRIPTION.replace(/\s+/g, '-')}`;
// カード画像（外部URL）はバージョンに依存しない永続キャッシュに分離する。
// CACHE_NAME に入れるとバージョンアップごとに数百枚の画像を再取得することになるため。
const IMAGE_CACHE = 'hololive-card-images-v1';
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
  './js/modal-ui.js',
  './js/battle_engine.js',
  './battle_simulator.html',
  './battle_simulator/state-manager.js',
  './battle_simulator/hand-manager.js',
  './battle_simulator/card-display-manager.js',
  './battle_simulator/info-panel-manager.js',
  './battle_simulator/phase-controller.js',
  './battle_simulator/placement-controller.js',
  './battle_simulator/game-setup-manager.js',
  './battle_simulator/turn-manager.js',
  './battle_simulator/card-interaction-manager.js',
  './battle_simulator/performance-manager.js',
  './battle_simulator/cpu_logic.js',
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
        // cache:'reload' でブラウザHTTPキャッシュを迂回し、必ず最新を取得する
        // （これが無いと、新バージョンのキャッシュに古い資産が入ることがある）
        return cache.addAll(urlsToCache.map(u => new Request(u, { cache: 'reload' })));
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
            // 画像キャッシュ(IMAGE_CACHE)はバージョンをまたいで保持する
            if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE) {
              console.log('%c🗑️ Service Worker: Deleting old cache:', cacheName, 'color: #F44336;');
              return caches.delete(cacheName);
            }
          })
        );
      }).then(function() {
        // Recreate cache with fresh content ensuring canonical (query-less) HTML entries are updated
        return caches.open(CACHE_NAME).then(async cache => {
          console.log('Updating cache with fresh content (canonical HTML, no query):', CACHE_NAME);

          const nowTs = Date.now();
          const htmlPages = urlsToCache.filter(u => u === './' || u.endsWith('.html'));
          const otherAssets = urlsToCache.filter(u => !(u === './' || u.endsWith('.html')));

          // 1. Fetch each HTML with a cache-busting query, then store under its plain URL key
          for (const page of htmlPages) {
            const bustUrl = `${page}?v=${APP_VERSION}&t=${nowTs}`;
            try {
              const resp = await fetch(bustUrl, { cache: 'no-cache' });
              if (resp.ok) {
                await cache.put(page, resp.clone());
                // Optionally remove any previously cached query variants of this page
                const requests = await cache.keys();
                for (const req of requests) {
                  const urlStr = req.url;
                  if (urlStr.includes(page + '?')) {
                    await cache.delete(req);
                  }
                }
                console.log('✔️ Cached (canonical):', page);
              } else {
                console.warn('⚠️ Failed to fetch HTML for caching:', page, resp.status);
              }
            } catch (e) {
              console.warn('⚠️ Error fetching HTML page during activate:', page, e);
            }
          }

            // 2. Add non-HTML assets (allow failures to continue)
          try {
            await cache.addAll(otherAssets.map(u => new Request(u, { cache: 'reload' })));
          } catch (e) {
            console.warn('⚠️ Some non-HTML assets failed to cache:', e);
          }
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

  // バトルシミュレーターv2 は開発中のためキャッシュを使わず常に最新を取得する
  // （Cache First だと修正がブラウザに反映されず開発が破綻する）
  if (event.request.url.includes('battle_simulator_v2')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(function() {
        return caches.match(event.request);
      })
    );
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
              // opaqueレスポンスを画像専用キャッシュに保存（バージョンをまたいで保持）
              const responseToCache = response.clone();
              caches.open(IMAGE_CACHE).then(function(cache) {
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
