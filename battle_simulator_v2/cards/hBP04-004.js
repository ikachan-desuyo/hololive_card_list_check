/**
 * 雪花ラミィ（推しホロメン hBP04-004）
 * 推しスキル「愛してる」[ホロパワー：-1][ターンに1回]:
 *   相手のターンで、自分のホロメンがダウンした時に使える：
 *   そのホロメンに付いているファン1枚を手札に戻す。
 * SP推しスキル「ぶーん、バリバリバリバリ」[ホロパワー：-3][ゲームに1回]:
 *   自分の〈雪花ラミィ〉1人を選ぶ。このターンの間、選んだホロメンが、
 *   相手のホロメン1人に与える特殊ダメージ+100し、
 *   選んだホロメンが相手のホロメンをダウンさせた時、自分のデッキを2枚引く。
 */
import { EffectContext } from '../core/effects/context.js';

export default {
  number: 'hBP04-004',

  // ダウン処理中に使える推しスキル (12.1.5.2)
  onDownOshiSkill: {
    cost: 1,
    title: '推しスキル「愛してる」: ダウンしたホロメンのファン1枚を手札に戻しますか？',
    canUse(engine, ownerIdx, downedHolomem) {
      const p = engine.state.players[ownerIdx];
      return engine.state.turnPlayer !== ownerIdx &&        // 相手のターン
        !p.usedOshiSkillThisTurn &&                          // ターンに1回
        p.holoPower.length >= 1 &&
        downedHolomem.attachments.some((a) => a.supportType === 'ファン');
    },
    apply(engine, ownerIdx, downedHolomem) {
      const p = engine.state.players[ownerIdx];
      p.archive.push(...p.holoPower.splice(0, 1));
      p.usedOshiSkillThisTurn += 1;
      const i = downedHolomem.attachments.findIndex((a) => a.supportType === 'ファン');
      const fan = downedHolomem.attachments.splice(i, 1)[0];
      p.hand.push(fan);
      engine.log(`推しスキル「愛してる」: ${fan.name} を手札に戻した`);
    },
  },

  spOshiSkill: {
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === '雪花ラミィ',
        title: 'SP推しスキル: 対象の〈雪花ラミィ〉を選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'specialDmgPlus',
        amount: 100,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `選んだ〈雪花ラミィ〉の特殊ダメージ+100（このターン）`,
      });
      ctx.addTurnModifier({
        kind: 'onSourceDown',
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: '選んだホロメンが相手をダウンさせた時、2枚ドロー（このターン）',
        onDown: (engine) => {
          new EffectContext(engine, ctx.playerIdx, {}).draw(2);
        },
      });
    },
  },
};
