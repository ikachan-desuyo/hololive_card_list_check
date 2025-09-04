// Utility functions for Service Worker operations
// Version: 4.6.0-BINDER-SETTINGS

// ✅ バージョン比較機能
function compareVersions(expected, actual) {
  if (!actual) return true; // 実際のバージョンが取得できない場合は更新が必要
  
  // バージョン文字列を正規化（サフィックスを除去）
  const normalizeVersion = (version) => {
    return version.replace(/[^\d\.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
  };
  
  const expectedParts = normalizeVersion(expected);
  const actualParts = normalizeVersion(actual);
  
  // バージョンが完全に一致する場合は更新不要
  if (expected === actual) return false;
  
  for (let i = 0; i < Math.max(expectedParts.length, actualParts.length); i++) {
    const expectedPart = expectedParts[i] || 0;
    const actualPart = actualParts[i] || 0;
    
    if (expectedPart > actualPart) return true; // 期待バージョンの方が新しい
    if (expectedPart < actualPart) return false; // 実際のバージョンの方が新しい
  }
  
  return false; // 同じバージョン
}

// ✅ バージョン情報を取得する機能
async function getVersionInfo() {
  return {
    appVersion: APP_VERSION,
    pageVersions: PAGE_VERSIONS,
    updateDetails: UPDATE_DETAILS,
    versionDescription: VERSION_DESCRIPTION,
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
      // より柔軟なバージョン検出：ヘッダーコメントと表示バージョンの両方をチェック
      const versionMatch = htmlText.match(/<!-- Version: ([\d\.]+-?[A-Za-z-]*)/);
      const displayVersionMatch = htmlText.match(/\[v([\d\.]+-?[A-Za-z-]*)\]/);
      
      let actualVersion = null;
      if (versionMatch) {
        actualVersion = versionMatch[1]; // サフィックスを削除しない
      } else if (displayVersionMatch) {
        actualVersion = displayVersionMatch[1];
      }
      
      console.log(`Page ${page}: expected=${expectedVersion}, actual=${actualVersion}`);
      
      // キャッシュされたバージョンもチェック
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(`./${page}`);
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
      
      console.log(`Page ${page}: expected=${expectedVersion}, actual=${actualVersion}, cached=${cachedVersion}`);

      // 🛠 Self-heal: if expected and actual are aligned (both new) but cached is older, update cache entry in-place.
      try {
        if (
          actualVersion && expectedVersion && actualVersion === expectedVersion &&
          cachedVersion && cachedVersion !== actualVersion
        ) {
          // Re-put the freshly fetched HTML (htmlText) under canonical key to sync cacheVersion.
          await cache.put(`./${page}`, new Response(htmlText, { headers: { 'Content-Type': 'text/html' } }));
          cachedVersion = actualVersion;
          console.log(`♻️ Self-healed cached HTML for ${page} -> ${cachedVersion}`);
        }
      } catch(e) {
        console.warn('Self-heal cache update failed for', page, e);
      }
      
      // 詳細なバージョン比較とミスマッチの理由を判定
      let mismatchReason = null;
      let needsUpdate = false;
      
      if (!actualVersion) {
        mismatchReason = 'actual_version_not_found';
        needsUpdate = true;
      } else if (expectedVersion !== actualVersion && compareVersions(expectedVersion, actualVersion)) {
        mismatchReason = 'expected_vs_actual_mismatch';
        needsUpdate = true;
  // Relaxed: only treat as mismatch if cached is newer (not just older) OR expected differs from actual
  } else if (cachedVersion && actualVersion !== cachedVersion && compareVersions(actualVersion, cachedVersion) && expectedVersion !== actualVersion) {
        mismatchReason = 'actual_vs_cached_mismatch';
        needsUpdate = true;
      }
      // バージョンが同じ場合は更新不要
      
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

// ✅ バージョン情報をコンソールに表示
function logVersionInfo() {
  console.log(`%c🚀 Hololive Card Tool Service Worker v${APP_VERSION}`, 'color: #4CAF50; font-weight: bold; font-size: 16px;');
  console.log(`%c📝 ${VERSION_DESCRIPTION}`, 'color: #2196F3; font-weight: bold;');
  console.log('%c📚 ページバージョン情報:', 'color: #FF9800; font-weight: bold;');
  Object.entries(PAGE_VERSIONS).forEach(([page, version]) => {
    console.log(`  • ${page}: %c${version}`, 'color: #4CAF50;');
  });
  console.log(`%c🗂️ キャッシュ名: ${CACHE_NAME}`, 'color: #9C27B0;');
}

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

// Export functions for Service Worker (using global assignment for compatibility)
if (typeof self !== 'undefined') {
  self.compareVersions = compareVersions;
  self.getVersionInfo = getVersionInfo;
  self.checkPageVersions = checkPageVersions;
  self.logVersionInfo = logVersionInfo;
  self.updateCache = updateCache;
}
