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
 *   ギフト（相手センターのアーツ必要無色+2）は oppArtsCostDelta（相手側の常時アウラとして
 *   system.artsCostReduction が盤面走査で評価。負 amount＝必要増）で実装。〈水宮枢〉がセンターに居て、
 *   相手センターの実効バトン必要無色が5以上の時、相手センターのアーツ必要無色を+2する（動的に毎回再評価）。
 */

import { COLORLESS } from '../core/constants.js';

/** 指定ホロメンのバトンタッチに【実効で】必要な無色の数 */
function batonColorlessOf(engine, holomem) {
  const idx = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(holomem));
  if (idx < 0) return 0;
  return engine._effectiveBatonCost(holomem, holomem.stack[0].batonTouch || [], idx)
    .filter((c) => c === COLORLESS).length;
}

/** 相手のセンターホロメンのバトンタッチに【実効で】必要な無色の数（≧5 を満たすかの判定用） */
function oppCenterBatonColorless(ctx) {
  const entry = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
  return entry ? batonColorlessOf(ctx.engine, entry.holomem) : 0;
}

export default {
  number: 'hBP08-053',

  // ギフト「しゅぴしゅわ～～っ！！！！」: [センター限定]相手センターのバトン必要無色5以上なら、相手センターのアーツ必要無色+2
  // src=このホロメン(あくあ), target=アーツコストを評価される相手ホロメン
  oppArtsCostDelta(src, target, engine) {
    if (engine._zoneOf(src) !== 'center') return [];        // [センターポジション限定]
    if (engine._zoneOf(target) !== 'center') return [];      // 相手のセンターのアーツのみ
    if (batonColorlessOf(engine, target) < 5) return [];     // 相手センターのバトン必要無色5以上
    return [{ color: COLORLESS, amount: -2 }];               // 必要無色+2（負の軽減＝増加）
  },

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
