/**
 * ベスティア・ゼータ (hBP01-027) 白・1st・HP200・Buzzホロメン（#ID #ID3期生）
 *
 * アーツ「アクセスコード：ID」(70+):
 *   自分のセンターホロメンが#IDを持つ時、このアーツ+50。
 *
 * ギフト/キーワード V.7:
 *   [ターンに1回][コラボポジション限定]自分のホロメンが相手からダメージを受ける時、
 *   サイコロを1回振れる：奇数の時、そのダメージを受けない。
 *   → onDamageReceivedReact（被ダメージ割り込み・任意）で実装。reactor=このベスティアがコラボにいて、
 *     [ターンに1回]振るのを選んだら、奇数で受けるダメージを0にする。相手ターンの被弾のみ engine が提示
 *     （アーツ／特殊どちらの経路でも _collectDamageResponders 経由で提示される）。
 */
import { rollDie } from '../core/rng.js';

export default {
  number: 'hBP01-027',
  arts: {
    'アクセスコード：ID': {
      dmgBonus(ctx) {
        // 自分のセンターホロメンが#IDを持つ時 +50
        const center = ctx.holomems('self', (e) => e.pos.zone === 'center' && ctx.hasTag(e.top, 'ID'));
        return center.length > 0 ? 50 : 0;
      },
    },
  },
  // ギフト V.7: [ターンに1回][コラボ限定]自分のホロメンが相手から被弾する時、サイコロを振り奇数なら受けない
  onDamageReceivedReact: {
    title: 'V.7: サイコロを振って奇数ならそのダメージを受けない？',
    yesLabel: 'サイコロを振る',
    canUse(engine, info) {
      if (info.reactor?.stack[0].name !== 'ベスティア・ゼータ') return false; // 発動はこのベスティア
      if (engine._zoneOf(info.reactor) !== 'collab') return false;            // [コラボポジション限定]
      if (info.dmg <= 0) return false;
      // [ターンに1回]
      return !engine.state.modifiers.some(
        (m) => m.kind === 'oncePerTurnUsed' && m.key === 'hBP01-027:v7' && m.ownerIdx === info.defIdx);
    },
    apply(engine, info) {
      engine.state.modifiers.push({ duration: 'turn', kind: 'oncePerTurnUsed', key: 'hBP01-027:v7', ownerIdx: info.defIdx });
      const v = rollDie(engine.rng);
      const negated = v % 2 === 1;
      engine.log(`V.7: サイコロ ${v} → ${negated ? 'そのダメージを受けない' : 'ダメージはそのまま'}`);
      return negated ? 0 : info.dmg;
    },
  },
};
