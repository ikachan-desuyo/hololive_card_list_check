/**
 * 紫咲シオン (hBP02-005) 推しホロメン 紫 ライフ5
 * 推しスキル「ねえ゛え゛え゛え゛え゛え゛え゛」[ホロパワー1消費][ターンに1回]:
 *   自分の〈紫咲シオン〉の能力でサイコロを振った時に使える：サイコロを1回振り直す。
 *   → onDiceRollOshiSkill（ダイス割り込み。振った主が〈紫咲シオン〉の時のみ）。
 * SP推しスキル「シオンのすごい魔法」[ホロパワー2消費][ゲームに1回]:
 *   自分の紫センターホロメンがアーツを使った時に使える：相手のセンターホロメンに、
 *   相手のセンターホロメンのエール1枚につき、特殊ダメージ50を与える。
 *   → onArtsUseOshiSkills（攻撃時誘発。紫センターのアーツ使用時、相手センターへエール数×50の特殊ダメージ）。
 */
import { rollDie } from '../core/rng.js';

export default {
  number: 'hBP02-005',
  onDiceRollOshiSkill: {
    cost: 1,
    title: '推しスキル「ねえ゛え゛え゛…」: サイコロを振り直す？（ホロパワー-1）',
    canUse(engine, idx, info) {
      return info.roller && info.roller.stack[0].name === '紫咲シオン';
    },
    apply(engine, idx, info) {
      const v = rollDie(engine.rng);
      engine.log(`推しスキル「ねえ゛え゛え゛…」: サイコロを振り直し → ${v}`);
      return v;
    },
  },
  onArtsUseOshiSkills: [
    {
      cost: 2,
      sp: true,
      title: 'SP推しスキル「シオンのすごい魔法」: 相手センターへエール数×50の特殊ダメージ？（ホロパワー-2）',
      canUse(engine, idx, info) {
        const sh = info.sourceHolomem;
        const p = engine.state.players[idx];
        if (!sh || sh !== p.center) return false;        // 自分のセンターがアーツを使った
        if (sh.stack[0].color !== '紫') return false;     // 紫センター
        return !!engine.state.players[1 - idx].center;    // 相手センターがいる
      },
      *run(ctx) {
        const centerEntry = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (!centerEntry) return;
        const cheerCount = centerEntry.holomem.cheers.length;
        const amount = 50 * cheerCount;
        ctx.log(`シオンのすごい魔法: 相手センターのエール${cheerCount}枚 → 特殊ダメージ${amount}`);
        if (amount > 0) yield* ctx.dealSpecialDamage(centerEntry, amount);
      },
    },
  ],
};
