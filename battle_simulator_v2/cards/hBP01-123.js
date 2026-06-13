/**
 * 野うさぎ同盟 (hBP01-123) サポート・ファン
 * 効果: このファンが付いているホロメンが能力でサイコロを振った時、このファンをアーカイブできる：
 *   そのサイコロの結果をすべて無くし、はじめからサイコロを振り直す。
 *   → onDiceRollReact（ダイス割り込み。付いているホロメン自身が振った時のみ。ファンをアーカイブして振り直し）。
 * 付け先: 自分の〈兎田ぺこら〉だけ・1人につき何枚でも。
 */
import { rollDie } from '../core/rng.js';

export default {
  number: 'hBP01-123',
  attachRule: {
    canAttach: (h) => h.stack[0].name === '兎田ぺこら',
    unlimited: true,
  },
  onDiceRollReact: {
    title: '野うさぎ同盟をアーカイブして、サイコロを振り直す？',
    yesLabel: 'アーカイブする（振り直し）',
    canUse(engine, info) {
      return info.roller && info.roller === info.fanHolomem; // 付いているホロメン自身が振った時
    },
    apply(engine, info) {
      const h = info.fanHolomem;
      const i = h.attachments.indexOf(info.fanCard);
      if (i !== -1) {
        h.attachments.splice(i, 1);
        engine.state.players[info.ownerIdx].archive.push(info.fanCard);
      }
      const newValue = rollDie(engine.rng);
      engine.log(`野うさぎ同盟をアーカイブ → サイコロを振り直し: ${newValue}`);
      return newValue;
    },
  },
};
