/**
 * Firebase の接続設定（オンライン対戦用）。
 *
 * ★ ここはあなた自身の Firebase プロジェクトの値に書き換えてください ★
 *
 * 手順（無料・5分）:
 *   1) https://console.firebase.google.com/ で新規プロジェクトを作成
 *   2) 「Realtime Database」を作成（ロケーションは任意。テストモードで開始でOK＝後述のルール参照）
 *   3) プロジェクト設定 → 「マイアプリ」でWebアプリを追加 → 表示される firebaseConfig を下にコピペ
 *   4) databaseURL が含まれていることを確認（例: https://xxxx-default-rtdb.fir5ebaseio.com）
 *
 * Realtime Database のルール（フレンド限定の簡易運用。誰でも読み書きできる点に注意）:
 *   {
 *     "rules": {
 *       "rooms": {
 *         ".read": true,
 *         ".write": true,
 *         "$room": { ".indexOn": ["seq"] }
 *       }
 *     }
 *   }
 *   ※公開ページに置くため API キー等はクライアントに露出します（Firebaseの仕様上それで正常）。
 *     不特定多数に荒らされたくない場合は、後で「ルームコードを知る人だけ」等の制限を足してください。
 *
 * 設定が未入力（PLACEHOLDER のまま）の場合、オンライン対戦UIは「未設定」と表示して無効化されます。
 */

export const FIREBASE_CONFIG = {
  apiKey: 'PASTE_YOUR_API_KEY',
  authDomain: 'PASTE.firebaseapp.com',
  databaseURL: 'https://PASTE-default-rtdb.firebaseio.com',
  projectId: 'PASTE',
  appId: 'PASTE',
};

/** 設定が実値に置き換えられているか（プレースホルダのままなら false）。 */
export function isFirebaseConfigured() {
  const c = FIREBASE_CONFIG;
  return !!(c && c.databaseURL && !c.databaseURL.includes('PASTE') && c.apiKey && !c.apiKey.includes('PASTE'));
}

/** Firebase SDK(modular) を CDN から動的import する版（ビルド不要）。失敗時は例外。 */
export async function loadFirebase() {
  const appMod = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js');
  const dbMod = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js');
  return { appMod, dbMod };
}
