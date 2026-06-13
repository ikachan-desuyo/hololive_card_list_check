/**
 * 不知火フレア (hBP05-065) ホロメン・1st・黄
 * ギフト「幸運の石」:
 *   [コラボポジション限定][ターンに1回]このホロメン以外の自分のホロメンが相手からダメージを受ける時、
 *   サイコロを1回振れる：奇数なら、そのホロメン1人が受けるダメージ-40。偶数なら、そのホロメン1人が受けるダメージ-20。
 *   → onDamageReceivedReact（被ダメージ割り込み。防御側ステージのホロメンギフト経路③）。
 *      条件: ①このフレアがコラボポジションにいる ②相手のターン（防御側＝非ターンプレイヤー）
 *           ③受け手がフレア自身でない自分のホロメン ④このターン未使用 ⑤ダメージ>0
 *      発動時: サイコロ1回 → 奇数 -40 / 偶数 -20（最低0）。ターン1回フラグを積む。
 *
 * アーツ「それは嘘じゃん！」: テキスト効果なし（基本ダメージ30はエンジン処理）。
 *
 * 保留なし。
 * 注: リアクティブな apply は非ジェネレータのため、ここでのサイコロは rollDie(engine.rng) で直接振る
 *     （ctx.rollDice() の振り直し割り込みは提示されない。hBP01-123 / hBP02-005 と同じ方針）。
 */
import { rollDie } from '../core/rng.js';

// このターンに「幸運の石」を使用済みであることを示すモディファイアの key
const ONCE_KEY = 'hBP05-065_幸運の石';

export default {
  number: 'hBP05-065',
  onDamageReceivedReact: {
    title: '「幸運の石」: サイコロを振って受けるダメージを軽減する？（奇数-40 / 偶数-20）',
    yesLabel: 'サイコロを振る',
    canUse(engine, info) {
      // 相手のターンのみ（自分のターンの自爆等は対象外。「相手からダメージを受ける時」）
      if (engine.state.turnPlayer === info.defIdx) return false;
      if (info.dmg <= 0) return false;
      // reactor（このフレア）がコラボポジションにいること
      if (engine._zoneOf(info.reactor) !== 'collab') return false;
      // 「このホロメン以外の自分のホロメン」＝受け手がフレア自身でない
      if (info.target === info.reactor) return false;
      // [ターンに1回]
      const used = engine.state.modifiers.some(
        (m) => m.kind === 'oncePerTurnUsed' && m.key === ONCE_KEY && m.ownerIdx === info.defIdx);
      if (used) return false;
      return true;
    },
    apply(engine, info) {
      // ターン1回制限を消費（エンドステップで自動消滅）
      engine.state.modifiers.push({
        duration: 'turn', kind: 'oncePerTurnUsed', key: ONCE_KEY, ownerIdx: info.defIdx,
      });
      const v = rollDie(engine.rng);
      const reduce = (v % 2 === 1) ? 40 : 20;
      engine.log(`「幸運の石」: 🎲 ${v}（${v % 2 === 1 ? '奇数' : '偶数'}）→ ${info.target.stack[0].name} の受けるダメージ-${reduce}`);
      return Math.max(0, info.dmg - reduce);
    },
  },
};
