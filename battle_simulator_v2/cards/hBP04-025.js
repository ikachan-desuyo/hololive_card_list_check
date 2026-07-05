/**
 * 儒烏風亭らでん (hBP04-025) ホロメン・2nd
 *
 * コラボエフェクト「伝統と革新」:
 *   自分のデッキから、#きのこを持つイベント1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → デッキサーチ（無ければシャッフルのみ）。
 *
 * アーツ「御後がよろしいようで」:
 *   自分の推しホロメンが〈儒烏風亭らでん〉の時、このホロメンのエール2枚を、
 *   自分のバックホロメン2人に1枚ずつ付け替えられる: このアーツ+30。
 *   → 推しが〈儒烏風亭らでん〉のときだけ、エール2枚を別々のバック2人へ1枚ずつ付け替え（任意）。
 *     2枚とも付け替えたら +30（「1枚ずつを2人に」＝送り先は別々のホロメン）。
 */
export default {
  number: 'hBP04-025',
  collabEffect: {
    name: '伝統と革新',
    *run(ctx) {
      const cand = ctx.deckCards(
        (c) => c.kind === 'support' && c.supportType === 'イベント' && (c.tags || []).includes('きのこ'));
      if (cand.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: 'デッキから#きのこを持つイベント1枚を選択（公開して手札へ）',
          optional: true,
          skipLabel: '加えない',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      } else {
        ctx.log('デッキに#きのこを持つイベントが無い');
      }
      ctx.shuffleDeck();
    },
  },
  arts: {
    '御後がよろしいようで': {
      *run(ctx) {
        if (ctx.player.oshi?.name !== '儒烏風亭らでん') return; // 推しが〈儒烏風亭らでん〉の時のみ
        const self = ctx.sourceHolomem;
        const backs = ctx.holomems('self', (e) => e.pos.zone === 'back');
        if (self.cheers.length < 2 || backs.length < 2) return; // エール2枚＋別々のバック2人が必要
        const ok = yield ctx.confirm('エール2枚をバックホロメン2人に1枚ずつ付け替えて、このアーツ+30しますか？');
        if (!ok) return;
        // 1枚目
        const c1 = yield ctx.chooseCard({ cards: [...self.cheers], title: '付け替えるエール（1枚目）' });
        if (!c1) return;
        const t1 = yield ctx.chooseHolomem({ side: 'self', filter: (e) => e.pos.zone === 'back', title: '1枚目の送り先バックホロメン' });
        if (!t1) return;
        ctx.moveCheer(c1, self, t1.holomem);
        // 2枚目（別のバックホロメンへ）
        const c2 = yield ctx.chooseCard({ cards: self.cheers.filter((c) => c !== c1), title: '付け替えるエール（2枚目）' });
        if (!c2) return;
        const t2 = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.pos.zone === 'back' && e.holomem !== t1.holomem,
          title: '2枚目の送り先バックホロメン（1枚目とは別のホロメン）',
        });
        if (!t2) return;
        ctx.moveCheer(c2, self, t2.holomem);
        ctx.addArtBonus(30, '御後がよろしいようで: エール2枚を別々のバックへ付け替え');
      },
    },
  },
};
