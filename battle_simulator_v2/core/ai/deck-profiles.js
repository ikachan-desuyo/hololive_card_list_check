/**
 * デッキプロファイル（デッキテーマ別AI。ポケカAI DeckPlan の移植・docs/AI_REFERENCE_POKEMON.md）
 *
 * 基盤はあくまで汎用AI（score.js / evaluate.js / gameplan.js の自動導出）。本ファイルは
 * 「使っているデッキ」を構成から自動判別し、テーマに沿った知識で汎用AIの判断を上書き/補強する薄い層。
 *   - 判別: 推しホロメン番号＋シグネチャカードの一致数（デッキ名でなく構成で判別＝改造デッキにも追従）
 *   - 適用: gameplan の主役ライン上書き / キーカード（温存・サーチ優先）/ サポートの使いどころ（価値上書き）
 *   - プロファイル未登録のデッキは従来どおり完全自動導出（UniversalBot 相当）で動く
 *
 * 設計原則: ここは「デッキテーマ固有の知識」の置き場（カード単体の知識は cards/<番号>.js の ai.*、
 * ルール・エンジン知識は core/）。プロファイルは挙動のヒントであり、最終判断は汎用スコアラ＋先読みが行う。
 *
 * スキーマ:
 *   key:          識別子
 *   name:         表示名（ログ用）
 *   oshi:         推しホロメン番号（いずれか一致で強マッチ）
 *   signature:    シグネチャカード番号（ユニーク一致数 >= signatureMin でマッチ）
 *   signatureMin: マッチに必要な一致数（既定: ceil(len*0.6)）
 *   lines:        主役ライン上書き [{ names: [...], colors: [...] }]（gameplan の自動導出を置換）
 *   keyCards:     温存・優先確保するカード番号（ペナルティ戻し/破棄で残す・サーチで優先）
 *   supportHints: { 番号: 値 | ({engine,player,card})=>値 } サポート使用価値の上書き
 *   noCheerNames: エールを付けない名前（コストが払えない/付けても無駄なサブライン。ラムダック等）
 *   notes:        人間向けメモ（挙動には影響しない）
 *
 * 各プロファイルの分析根拠はデッキ分析（2026-07-17 マルチエージェント。test_deck の構成＋cards/*.js の
 * 実装効果を精読）に基づく。値は汎用スコアラの尺度（フリープレイ=70 / 汎用サポート=12-30）に合わせる。
 */

export const PROFILES = [
  {
    key: 'azki-tan',
    name: 'AZKi単（ホロパワー打点×フロンティアスピリット）',
    oshi: ['hBP07-006'],
    signature: ['hBP07-069', 'hBP07-100', 'hBP07-067', 'hBP07-064', 'hBP01-045'],
    signatureMin: 3,
    lines: [{ names: ['AZKi'], colors: ['紫'] }],
    keyCards: ['hBP07-069', 'hBP01-045', 'hBP07-100', 'hBP06-090'],
    supportHints: {
      // ブルームステージ: 強い方の効果（二段Bloom）はライフ4以下が条件。序盤に浪費しない
      'hBP06-090': ({ player }) => (player.life.length <= 4 ? 35 : 10),
      // フロンティアスピリット: アーカイブにエールが落ちてから。アーカイブの同名枚数が多いほど回収量が増える
      'hBP07-100': ({ player }) => {
        const cheers = player.archive.filter((c) => c.kind === 'cheer').length;
        if (cheers === 0) return 4;
        const dup = player.archive.filter((c) => c.number === 'hBP07-100').length;
        return 26 + Math.min(cheers, 3) * 2 + dup * 2;
      },
      // ギリわるロボ: 手札リフレッシュは枯れた時だけ（温存カードごと流してしまう）
      'hBP07-094': ({ player }) => (player.hand.length <= 2 ? 30 : 2),
    },
    notes: '推しステージスキルでホロパワー1枚=センターAZKiアーツ+20。2nd hBP07-069 が主役。後半巻き返し型',
  },
  {
    key: 'fuwamoco',
    name: 'FUWAMOCO（赤=青エイリアスの2ライン連続攻撃）',
    oshi: ['hBP08-003'],
    signature: ['hBP08-039', 'hBP08-059', 'hBP03-050', 'hBP08-034', 'hBP08-092'],
    signatureMin: 3,
    // 2ライン同時育成（FUWAMOCO 1st は両名として扱うためどちらのラインにも含める）
    lines: [
      { names: ['モココ・アビスガード', 'FUWAMOCO'], colors: ['赤', '青'] },
      { names: ['フワワ・アビスガード', 'FUWAMOCO'], colors: ['赤', '青'] },
    ],
    keyCards: ['hBP08-039', 'hBP08-059', 'hBP03-050'],
    supportHints: {
      // 思い出のドーナツショップ: 2ndが手札に揃っていない時のサーチ価値が高い（LIMITED枠の使い先）
      'hBP08-092': ({ engine, player }) => {
        const has2nd = player.hand.some((c) => c.number === 'hBP08-039' || c.number === 'hBP08-059')
          || engine._stageHolomems(player).some((h) => h.stack[0].bloomLevel === '2nd');
        return has2nd ? 14 : 34;
      },
    },
    notes: '攻撃順が命: モココ2nd→フワワ2nd（+50条件）。エールは必ずフワワ/モココ名のホロメンへ',
  },
  {
    key: 'watame-tan',
    name: 'わため白単（ドドドライブ×角ドリル一斉+100）',
    oshi: ['hBP07-001'],
    signature: ['hBP07-014', 'hBP07-013', 'hBP07-102', 'hBP07-010', 'hBP07-011'],
    signatureMin: 3,
    lines: [{ names: ['角巻わため'], colors: ['白'] }],
    keyCards: ['hBP07-014', 'hBP07-013', 'hBP07-102'],
    // ラムダックはセンター2ndわため成立時のみ0コストで撃てる（黄エールは0枚）。エールを付けるのは常に無駄
    noCheerNames: ['ラムダック'],
    supportHints: {
      'hBP06-090': ({ player }) => (player.life.length <= 4 ? 35 : 10), // ブルームステージ（ライフ4以下で二段Bloom）
      // み俺恥: 直前の相手ターンにダウンあり＋ライフ劣勢でエール回収付き。条件外は温存
      'hBP05-079': ({ engine, player }) => {
        const opp = engine.state.players[1 - engine.state.players.indexOf(player)];
        const cond = (player.downedCardsLastOppTurn || []).length > 0 && player.life.length < opp.life.length;
        return cond ? 30 : 8;
      },
    },
    notes: '推しスキル[HP-6]の+100はダウン確定ターンまで温存（スコアラ既定のSP温存傾向で近似）',
  },
  {
    key: 'haato-junshin',
    name: 'はあと赤単（デッキ戻し循環）',
    oshi: ['hBP07-004'],
    signature: ['hBP07-042', 'hBP07-039', 'hBP07-040', 'hBP03-031', 'hBP07-096'],
    signatureMin: 3,
    lines: [{ names: ['赤井はあと'], colors: ['赤'] }],
    keyCards: ['hBP07-042'],
    // ※当初はギリわるロボ/ちゃま旅の抑制ヒントを入れたがA/Bで悪化（3/12）。手札回転デッキでは
    //   リフレッシュ/戻し札の抑制が裏目に出るため撤去し、ライン＋キーカードのみの薄いプロファイルにした（2026-07-17）
    notes: '素のDebutはあとは「戻す資源」。デッキ戻し誘発（2ドロー/エール加速/+50）が回転の軸',
  },
  {
    key: 'sakamata-tan',
    name: 'さかまた青単（ホロックスロット×ライフバーン）',
    oshi: ['hBP07-006'],
    signature: ['hBP02-040', 'hBP02-038', 'hBP02-035', 'hBP06-093'],
    signatureMin: 3,
    lines: [{ names: ['沙花叉クロヱ'], colors: ['青'] }],
    keyCards: ['hBP02-040', 'hBP02-038'],
    supportHints: {
      // 山田ルイ54世: サーチ＋条件付きエール加速。ほぼ常に強いLIMITED
      'hBP06-093': 30,
    },
    notes: 'Debut37枚構成。2nd hBP02-040 のスロット公開は原則辞退しない（ギフトのライフ-1が勝ち筋）',
  },
  {
    key: 'lamy-yukimin',
    name: 'ラミィ青単（雪民×特殊ダメージ）',
    oshi: ['hBP04-004'],
    signature: ['hBP04-048', 'hBP04-044', 'hBP04-047', 'hBP04-106', 'hBP04-043'],
    signatureMin: 3,
    lines: [{ names: ['雪花ラミィ'], colors: ['青'] }],
    keyCards: ['hBP04-048'],
    // ※雪民(hBP04-106)は手札からも付けられる（attachRule=ラミィ限定・無制限）。
    //   当初「手貼り不可・価値0」のヒントを入れたがA/Bで悪化＝誤分析と判明し撤去（2026-07-17）
    notes: 'コラボの使い分け: 雪民なし→hBP04-044「Snow flower」/ 雪民あり→hBP04-047「fleur」（条件が排他）',
  },
];

/** デッキ構成（自分の全カード番号の集合）と推し番号からプロファイルを判別する。無ければ null */
export function detectProfile(numsSet, oshiNumber) {
  // _disabled: true を付けたプロファイルは無効化できる（A/B切り分け・段階導入用）
  const ACTIVE = PROFILES.filter((p) => !p._disabled);
  return _detect(ACTIVE, numsSet, oshiNumber);
}
function _detect(PROFILES, numsSet, oshiNumber) {
  // 1) 推し一致（＋シグネチャ2枚以上で誤爆防止）
  for (const pr of PROFILES) {
    if ((pr.oshi || []).includes(oshiNumber)) {
      const sig = pr.signature || [];
      const hit = sig.filter((n) => numsSet.has(n)).length;
      if (hit >= Math.min(pr.signatureMin ?? 2, sig.length)) return pr;
    }
  }
  // 2) シグネチャのみ（推し変更した改造デッキ向け）
  for (const pr of PROFILES) {
    const sig = pr.signature || [];
    if (!sig.length) continue;
    const need = pr.signatureMin ?? Math.ceil(sig.length * 0.6);
    if (sig.filter((n) => numsSet.has(n)).length >= need) return pr;
  }
  return null;
}
