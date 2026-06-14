/**
 * 水宮枢 (hBP08-053) 青・2nd・HP160（#DEV_IS #FLOW #GLOW）
 *
 * ギフト「しゅぴしゅわ～～っ！！！！」:
 *   [センターポジション限定] 相手のセンターホロメンのバトンタッチに必要な無色が5つ以上なら、
 *   相手のセンターホロメンのアーツに必要な無色+2。
 *
 * アーツ「届け、この愛」(青青any / dmg50 / 特攻 白+50):
 *   相手のセンターホロメンのバトンタッチに必要な無色が5つ以上なら、
 *   相手のDebut以外のホロメン1人に特殊ダメージ100を与える。
 *
 * --- 共通ヘルパー ---
 * 「相手のセンターのバトンタッチに必要な無色の数」を、相手センターの【実効】バトンタッチコスト
 * （engine._effectiveBatonCost）内の無色エールの数で判定する。
 *
 * 補足: カードDBの baton_touch は常に "無色" 1個（core/cards.js: batonTouch=['無色']）で、
 *   素のコストだけでは5に届かない。だが現行エンジンにはバトンタッチ必要エール修正
 *   （ターン修正 kind:'batonCostReduce' / 装着カードの batonCostReduceAttached、負 amount=必要増）
 *   が存在し、_applyCostReduction が無色を追加する（engine.js）。例: hBP08-004 推しスキルで
 *   相手センターのバトンタッチ必要無色+3。これらが積めば実効コストが5無色以上になり得るため、
 *   素のトップカードではなく実効コストを数える。これにより本条件は実際の対戦で成立し得る。
 *
 * 【保留】ギフト（相手センターのアーツ必要無色+2）は常時効果だが、
 *   アーツ必要エール修正のオーラ機構（artsCostReduceAura）は「対象ホロメンの持ち主自身の
 *   ステージ上のカード」しか走査しない（system.js artsCostReduction: players[ownerIdx] のみ）。
 *   本カードは自分のステージに居て相手のコストを増やすため、現行の機構では表現できない。
 *   ターン修正 kind:'artCostReduce' は一時的（duration:'turn'/untilTurn）で、
 *   「相手センターのバトンタッチ必要無色が5つ以上なら」という動的条件で毎回再評価する常時効果には
 *   合わず、再評価のためのフックも無い。クロスサイドの常時アーツコスト修正オーラが無いため、
 *   ギフトは未実装（保留）を維持する。
 */

import { COLORLESS } from '../core/constants.js';

/** 相手のセンターホロメンのバトンタッチに【実効で】必要な無色の数（≧5 を満たすかの判定用） */
function oppCenterBatonColorless(ctx) {
  const entry = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
  if (!entry) return 0;
  const oppIdx = 1 - ctx.playerIdx;
  // 素のバトンタッチコストに、必要エール修正（batonCostReduce 等。負 amount=必要増）を適用した実効コスト
  const cost = ctx.engine._effectiveBatonCost(entry.holomem, entry.top.batonTouch || [], oppIdx);
  return cost.filter((c) => c === COLORLESS).length;
}

export default {
  number: 'hBP08-053',

  // ギフト「しゅぴしゅわ～～っ！！！！」は保留（上記JSDoc参照）。

  arts: {
    '届け、この愛': {
      *run(ctx) {
        // 条件: 相手センターのバトンタッチに必要な無色が5つ以上
        if (oppCenterBatonColorless(ctx) < 5) {
          ctx.log('相手センターのバトンタッチ必要無色が5未満のため、追加の特殊ダメージは発生しなかった');
          return;
        }
        // 相手のDebut以外のホロメン1人に特殊ダメージ100
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.top.bloomLevel !== 'Debut',
          title: '特殊ダメージ100を与える相手ホロメンを選択（Debut以外）',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 100);
      },
    },
  },
};
