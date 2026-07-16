/**
 * 白銀ノエル (hBP05-001) 推しホロメン・白 ライフ5
 *
 * 推しスキル「白銀の騎士達」[ホロパワー：-2][ターンに1回]:
 *   自分のホロメンが相手のホロメンをダウンさせた時に使える：
 *   自分のデッキから、#3期生を持つホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → onDamageDealtOshiSkills（攻撃時誘発）。attackInfo.downed（相手のダウンしたホロメン）が
 *     1体以上いる時に発火。ホロメン色の指定は無い（「自分のホロメン」全般）。
 *     公開サーチなので候補が無くても安全（chooseCard で「見つからなかった」を選べる）。
 *
 * SP推しスキル「スーパーまずった太郎」[ホロパワー：-2][ゲームに1回]:
 *   相手のターンで、自分の#3期生を持つホロメンがダウンした時に使える：自分の減るライフ-1。
 *   その後、そのホロメンがBuzzホロメンか2ndホロメンなら、自分のデッキを2枚引く。
 *   → onDownOshiSkill（sp=ゲームに1回）。ダウン処理の finish() より前に apply が走るため、
 *     h.lifeReductionOnDown=1 を立てて減るライフ-1を反映する（engine._processDown が参照）。
 *     Buzz か 2nd の場合に追加で2枚ドロー。コスト支払い＋ usedSpOshiSkillThisGame は apply 内で行う
 *     （engine の onDownOshiSkill 経路はコスト/使用済みを自動処理しないため）。
 */
import { EffectContext } from '../core/effects/context.js';

export default {
  number: 'hBP05-001',

  // 推しスキル「白銀の騎士達」: 相手をダウンさせた時、デッキから#3期生ホロメン1枚をサーチ
  onDamageDealtOshiSkills: [
    {
      cost: 2,
      title: '推しスキル「白銀の騎士達」: デッキから#3期生ホロメン1枚を手札に加える？（ホロパワー-2）',
      canUse(engine, idx, info) {
        if (!info.sourceHolomem) return false;          // 自分のホロメンが与えた
        return (info.downed || []).length > 0;          // 相手のホロメンをダウンさせた
      },
      *run(ctx) {
        const cand = ctx.deckCards(
          (c) => c.kind === 'holomen' && (c.tags || []).includes('3期生'));
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: '手札に加える#3期生ホロメンを選択',
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.flashReveal(picked);
          ctx.addToHand(picked);
        }
        ctx.shuffleDeck();
      },
    },
  ],

  // SP推しスキル「スーパーまずった太郎」: 自分の#3期生ホロメンがダウンした時、減るライフ-1（ゲームに1回）
  onDownOshiSkill: {
    cost: 2,
    sp: true,
    title: 'SP推しスキル「スーパーまずった太郎」: 減るライフ-1する？（ホロパワー-2 / ゲームに1回）',
    canUse(engine, ownerIdx, downedHolomem) {
      const p = engine.state.players[ownerIdx];
      const top = downedHolomem.stack[0];
      return engine.state.turnPlayer !== ownerIdx &&     // 相手のターンで
        !p.usedSpOshiSkillThisGame &&                     // ゲームに1回
        p.holoPower.length >= 2 &&                         // ホロパワー：-2
        (top?.tags || []).includes('3期生');               // 自分の#3期生ホロメンがダウン
    },
    apply(engine, ownerIdx, downedHolomem) {
      const p = engine.state.players[ownerIdx];
      p.archive.push(...p.holoPower.splice(0, 2));
      engine._markSpOshiSkillUsed(p); // SP使用の記録（ターン/推し番号つき）
      // 自分の減るライフ-1（_processDown.finish が h.lifeReductionOnDown を参照する）
      downedHolomem.lifeReductionOnDown = (downedHolomem.lifeReductionOnDown || 0) + 1;
      engine.log('SP推しスキル「スーパーまずった太郎」: 自分の減るライフ-1');
      // その後、Buzzホロメンか2ndホロメンならデッキを2枚引く
      const top = downedHolomem.stack[0];
      if (top?.buzz || top?.bloomLevel === '2nd') {
        engine.log('SP推しスキル「スーパーまずった太郎」: Buzz/2ndのためデッキを2枚引く');
        new EffectContext(engine, ownerIdx, {}).draw(2);
      }
    },
  },
};
