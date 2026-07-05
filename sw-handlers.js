// Service Worker event handlers and cache management
// Version: 4.6.0-BINDER-SETTINGS

// Message event handler function
async function handleMessage(event) {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'DELETE_PAGE_CACHE':
      // data.page で指定されたページのキャッシュだけ削除
      try {
        const pageUrl = data?.page;
        if (!pageUrl) throw new Error('No page specified');
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(`./${pageUrl}`);
        event.ports[0]?.postMessage({ type: 'DELETE_PAGE_CACHE_DONE', page: pageUrl });
        console.log('Deleted cache for page:', pageUrl);
      } catch (err) {
        event.ports[0]?.postMessage({ type: 'DELETE_PAGE_CACHE_ERROR', error: err.message });
      }
      break;
    case 'SKIP_WAITING':
      console.log('Received SKIP_WAITING message, taking control');
      self.skipWaiting();
      break;
      
    case 'FORCE_UPDATE':
      console.log('Received FORCE_UPDATE message, clearing all caches and forcing update');
      // 全キャッシュを強制削除
      const allCacheNames = await caches.keys();
      await Promise.all(allCacheNames.map(cacheName => caches.delete(cacheName)));
      console.log('All caches cleared for force update');
      // 新しいキャッシュを作成
      const newCache = await caches.open(CACHE_NAME);
      await newCache.addAll(urlsToCache);
      console.log('New cache created:', CACHE_NAME);
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
      // 詳細なバージョンチェック（単一ソース: APP_VERSION 比較）
      console.log('Performing detailed version mismatch check...');
      try {
        const versionCheckResult = await checkPageVersions(); // 単一ソース比較
        const liveVersion = versionCheckResult[0]?.expectedVersion || APP_VERSION;

        // 全ページ情報（バージョンはアプリ単位で同一）
        const allPages = Object.keys(PAGE_VERSIONS).map((page) => ({
          page,
          expectedVersion: liveVersion,
          actualVersion: APP_VERSION
        }));

        const detailedInfo = {
          hasUpdates: versionCheckResult.length > 0,
          outdatedPages: versionCheckResult,
          allPages: allPages,
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
      // 単一ページのバージョンチェック（単一ソース: APP_VERSION 比較。ページ個別バージョンは持たない）
      console.log('Performing single page version check for:', data?.page);
      try {
        const targetPage = data?.page;
        if (!targetPage || !PAGE_VERSIONS[targetPage]) {
          throw new Error(`Invalid page: ${targetPage}`);
        }

        const liveVersion = await getLiveAppVersion();
        const needsUpdate = !!liveVersion && compareVersions(liveVersion, APP_VERSION);
        const expectedVersion = liveVersion || APP_VERSION;

        const pageInfo = needsUpdate ? {
          page: targetPage,
          reason: 'app_version_update',
          expectedVersion,            // 配信中の新バージョン
          actualVersion: APP_VERSION, // 稼働中（このSW）
          cachedVersion: APP_VERSION,
          details: {
            expectedVersion,
            actualVersion: APP_VERSION,
            cachedVersion: APP_VERSION,
            mismatchType: 'app_version_update'
          }
        } : null;

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
      
    case 'GET_CACHE_NAME':
      // 現在のキャッシュ名を返す
      event.ports[0]?.postMessage({
        type: 'CACHE_NAME_RESPONSE',
        cacheName: CACHE_NAME
      });
      break;
      
    default:
      // 従来のメッセージハンドリング
      if (event.data && event.data.type === 'GET_VERSION_INFO') {
        event.ports[0].postMessage(getVersionInfo());
      }
      console.log('Message received:', type);
  }
}

// Export for Service Worker
if (typeof self !== 'undefined') {
  self.handleMessage = handleMessage;
}
