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
      // 詳細なバージョンチェック
      console.log('Performing detailed version mismatch check...');
      try {
        const versionCheckResult = await checkPageVersions();
        
        // 全ページ情報を収集
        const allPages = [];
        for (const [page, expectedVersion] of Object.entries(PAGE_VERSIONS)) {
          try {
            const response = await fetch(`./${page}`, { cache: 'no-cache' });
            let actualVersion = expectedVersion; // デフォルトは期待バージョン
            
            if (response.ok) {
              const htmlText = await response.text();
              const versionMatch = htmlText.match(/<!-- Version: ([\d\.]+-?[A-Za-z-]*)/);
              const displayVersionMatch = htmlText.match(/\[v([\d\.]+-?[A-Za-z-]*)\]/);
              
              if (versionMatch) {
                actualVersion = versionMatch[1];
              } else if (displayVersionMatch) {
                actualVersion = displayVersionMatch[1];
              }
            }
            
            allPages.push({
              page,
              expectedVersion,
              actualVersion
            });
          } catch (error) {
            console.error(`Error checking ${page}:`, error);
            allPages.push({
              page,
              expectedVersion,
              actualVersion: 'error'
            });
          }
        }
        
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
          // より柔軟なバージョン検出
          const versionMatch = htmlText.match(/<!-- Version: ([\d\.]+-?[A-Za-z-]*)/);
          const displayVersionMatch = htmlText.match(/\[v([\d\.]+-?[A-Za-z-]*)\]/);
          
          let actualVersion = null;
          if (versionMatch) {
            actualVersion = versionMatch[1]; // サフィックスを削除しない
          } else if (displayVersionMatch) {
            actualVersion = displayVersionMatch[1];
          }
          
          // キャッシュされたバージョンもチェック
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(`./${targetPage}`);
          let cachedVersion = null;
          
          if (cachedResponse) {
            const cachedText = await cachedResponse.text();
            const cachedVersionMatch = cachedText.match(/<!-- Version: ([\d\.]+-?[A-Za-z-]*)/);
            const cachedDisplayVersionMatch = cachedText.match(/\[v([\d\.]+-?[A-Za-z-]*)\]/);
            
            if (cachedVersionMatch) {
              cachedVersion = cachedVersionMatch[1]; // サフィックスを削除しない
            } else if (cachedDisplayVersionMatch) {
              cachedVersion = cachedDisplayVersionMatch[1];
            }
          }
          
          console.log(`Single page ${targetPage}: expected=${expectedVersion}, actual=${actualVersion}, cached=${cachedVersion}`);
          
          // バージョン比較とミスマッチの理由を判定
          let mismatchReason = null;
          let needsUpdate = false;

          // 🛠 Self-heal for single page checks: if expected==actual but cached outdated
          try {
            if (
              actualVersion && expectedVersion && actualVersion === expectedVersion &&
              cachedVersion && cachedVersion !== actualVersion
            ) {
              const freshResp = new Response(htmlText, { headers: { 'Content-Type': 'text/html' } });
              const cache = await caches.open(CACHE_NAME);
              await cache.put(`./${targetPage}`, freshResp);
              cachedVersion = actualVersion;
              console.log(`♻️ Self-healed cached HTML (single) for ${targetPage} -> ${cachedVersion}`);
            }
          } catch(e) {
            console.warn('Single page self-heal failed for', targetPage, e);
          }
          
          if (!actualVersion) {
            mismatchReason = 'actual_version_not_found';
            needsUpdate = true;
          } else if (expectedVersion !== actualVersion && compareVersions(expectedVersion, actualVersion)) {
            mismatchReason = 'expected_vs_actual_mismatch';
            needsUpdate = true;
          // Relaxed: ignore case where only cachedVersion is older than actual while expected == actual
          } else if (cachedVersion && actualVersion !== cachedVersion && compareVersions(actualVersion, cachedVersion) && expectedVersion !== actualVersion) {
            mismatchReason = 'actual_vs_cached_mismatch';
            needsUpdate = true;
          }
          // バージョンが同じ場合は更新不要
          
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
