// Utility functions for Service Worker operations
// バージョンは sw-version.js の APP_VERSION が単一ソース。

// ✅ 配信中（ネットワーク最新）の sw-version.js から APP_VERSION を取得する。
//    更新検知の比較対象（稼働中SWの APP_VERSION と突き合わせる）。
async function getLiveAppVersion() {
  try {
    const resp = await fetch('./sw-version.js', { cache: 'no-cache' });
    if (!resp.ok) return null;
    const text = await resp.text();
    const m = text.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    return m ? m[1] : null;
  } catch (e) {
    console.warn('getLiveAppVersion failed:', e);
    return null;
  }
}

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

// ✅ 更新チェック（単一ソース）
// 稼働中SWの APP_VERSION と、配信中（ネットワーク最新）の sw-version.js の APP_VERSION を比較する。
// 配信版が新しければ更新あり＝全ページが対象（アプリ単位で同一バージョン）。
// 旧実装のように各HTMLの埋め込みマーカーを解析しないので、マーカー不整合による誤検知は起きない。
async function checkPageVersions() {
  const liveVersion = await getLiveAppVersion();
  // 取得失敗時は誤検知を出さない（更新なし扱い）
  if (!liveVersion) return [];
  // live <= 稼働中 なら最新（更新なし）
  if (!compareVersions(liveVersion, APP_VERSION)) return [];
  // 配信版が新しい → 全ページ更新対象
  return Object.keys(PAGE_VERSIONS).map((page) => ({
    page,
    reason: 'app_version_update',
    expectedVersion: liveVersion,   // 配信中の新バージョン
    actualVersion: APP_VERSION,     // 稼働中（このSW）のバージョン
    cachedVersion: APP_VERSION,
    details: {
      expectedVersion: liveVersion,
      actualVersion: APP_VERSION,
      cachedVersion: APP_VERSION,
      mismatchType: 'app_version_update'
    }
  }));
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
  self.getLiveAppVersion = getLiveAppVersion;
  self.getVersionInfo = getVersionInfo;
  self.checkPageVersions = checkPageVersions;
  self.logVersionInfo = logVersionInfo;
  self.updateCache = updateCache;
}
