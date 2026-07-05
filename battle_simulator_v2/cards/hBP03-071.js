/**
 * 角巻わため (hBP03-071) 黄・1st・HP160（#JP #4期生 #ケモミミ #歌）
 * ブルームエフェクト「Member sheep おかえり～」:
 *   自分のアーカイブの〈わためいと〉1枚を手札に戻せる。（任意。0枚可＝戻さなくてよい）
 *
 * アーツ「つのまきじゃんけん」(50):
 *   「相手と勝敗が決まるまでじゃんけんできる：自分が勝った時、このターンの間、このホロメンは赤特攻+30を得る。」
 *   → arts.run でじゃんけん（自分→相手の順に手を選ぶ。あいこは繰り返し）。自分が勝ったら
 *     ターン修正 kind:'tokkouPlus'（赤+30, このホロメン限定）を付与。engine の特攻計算がこれを読む。
 *     あいこ無限ループ防止に上限回数を設ける。
 */
const JANKEN = ['グー', 'チョキ', 'パー'];

export default {
  number: 'hBP03-071',
  arts: {
    'つのまきじゃんけん': {
      *run(ctx) {
        const self = ctx.sourceHolomem;
        if (!self) return;
        let won = false;
        for (let round = 0; round < 30; round++) { // あいこは continue。上限はループ保護
          const myHand = yield {
            kind: 'confirm', player: ctx.playerIdx, title: `じゃんけん（${round + 1}回目）: 手を選ぶ`,
            buildOptions: () => JANKEN.map((h, i) => ({ id: `me${i}`, label: h, value: i })),
          };
          const oppHand = yield {
            kind: 'confirm', player: 1 - ctx.playerIdx, title: 'じゃんけん: 手を選ぶ',
            buildOptions: () => JANKEN.map((h, i) => ({ id: `op${i}`, label: h, value: i })),
          };
          ctx.log(`じゃんけん: 自分=${JANKEN[myHand]} / 相手=${JANKEN[oppHand]}`);
          if (myHand === oppHand) { ctx.log('あいこ → もう一度'); continue; }
          // グー(0)>チョキ(1)>パー(2)>グー(0)。自分の勝ち条件: 相手の手 ===(自分の手+1)%3
          won = ((myHand + 1) % 3 === oppHand);
          ctx.log(won ? 'じゃんけんに勝った！' : 'じゃんけんに負けた');
          break;
        }
        if (won) {
          ctx.addTurnModifier({
            kind: 'tokkouPlus', color: '赤', amount: 30, ownerIdx: ctx.playerIdx,
            match: (hm) => hm === self,
            description: 'つのまきじゃんけん勝利: このターン このホロメンは赤特攻+30',
          });
        }
      },
    },
  },
  bloomEffect: {
    name: 'Member sheep おかえり～',
    *run(ctx) {
      const candidates = ctx.player.archive.filter((c) => c.name === 'わためいと');
      if (candidates.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'アーカイブから手札に戻す〈わためいと〉を選択（任意）',
        optional: true,
        skipLabel: '戻さない',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked);
    },
  },
};
