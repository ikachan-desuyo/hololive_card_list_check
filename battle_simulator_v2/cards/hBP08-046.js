/**
 * エリザベス・ローズ・ブラッドフレイム (hBP08-046) 赤・1st（#Justice / #EN / #歌）
 *
 * ギフト「マジェスティック・デヴォーション」:
 *   [コラボポジション限定]相手のターンで、このホロメン以外の自分の#Justiceを持つホロメンが
 *   ダウンした時、自分のデッキから2ndホロメン1枚を公開し手札に加える。そしてデッキをシャッフルする。
 *   → triggers.onAnyDown で実装。
 *      ・このホロメン（ctx.sourceHolomem）がコラボポジションにいる（[コラボポジション限定]）
 *      ・相手のターン（state.turnPlayer !== playerIdx）
 *      ・ダウンしたのが自分のホロメン（downedInfo.ownerIdx === playerIdx）で
 *      ・このホロメン自身ではない（downedInfo.holomem !== sourceHolomem）
 *      ・#Justice を持つ（downedInfo.card.tags に 'Justice'）
 *      を満たした時、デッキの2ndホロメンを1枚選んで公開→手札に加え、デッキをシャッフルする。
 *      ※「ターンに1回」の記載は無いので回数制限は付けない。
 *
 * アーツ「スイートトゥース」(red / 30): テキスト効果なし。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-046',
  triggers: {
    *onAnyDown(ctx) {
      // [コラボポジション限定]: このホロメンがコラボにいること
      if (!ctx.sourceHolomem) return;
      if (ctx.sourceHolomemPos()?.zone !== 'collab') return;
      // 相手のターンで
      if (ctx.state.turnPlayer === ctx.playerIdx) return;
      // このホロメン以外の自分の#Justiceを持つホロメンがダウンした時
      if (ctx.downedInfo?.ownerIdx !== ctx.playerIdx) return;        // 自分のホロメン
      if (ctx.downedInfo.holomem === ctx.sourceHolomem) return;      // このホロメン以外
      if (!(ctx.downedInfo.card.tags || []).includes('Justice')) return; // #Justice

      // 自分のデッキから2ndホロメン1枚を公開し手札に加える
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && c.bloomLevel === '2nd');
      if (cand.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: '公開して手札に加える2ndホロメンを選択',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      } else {
        ctx.log(`${ctx.player.name}: デッキに2ndホロメンが無い`);
      }
      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
