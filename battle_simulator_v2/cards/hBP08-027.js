/**
 * セシリア・イマーグリーン (hBP08-027) ホロメン・緑・2nd・HP210
 *
 * ブルームエフェクト「絡繰のラプソディー」:
 *   自分のお休みしている#Justiceを持つホロメン1人につき、
 *   自分のアーカイブのエール1枚をこのホロメン（Bloom先）に送る。
 *   → お休み中(rested)かつタグ #Justice を持つ自分のホロメンの人数 N を数え、
 *     アーカイブのエールを N 枚（アーカイブのエール枚数が上限）、
 *     1枚ずつプレイヤーに選ばせて ctx.sourceHolomem（このホロメン）に送る。
 *     ※「1人につき1枚」＝強制で N 枚送る（アーカイブのエールが足りる範囲で）。
 *       送り先は固定（このホロメン）なので chooseHolomem は不要。
 *
 * アーツ「翠嵐のシュトルム」(200):
 *   自分のお休みしている#Justiceを持つホロメン1人につき、自分のデッキを1枚引く。
 *   その後、このホロメンをお休みさせる。
 *   → お休み中(rested)かつ #Justice を持つ自分のホロメンの人数 N を数え、N枚ドロー。
 *     その後 ctx.sourceHolomem.rested = true でこのホロメンをお休みさせる（強制）。
 *     ※アーツ使用中のこのホロメン自身はアクティブなので N には含まれない。
 *
 * 保留: なし（全文 context.js のプリミティブで実装）。
 */
function isRestingJustice(e) {
  return e.holomem.rested && (e.top.tags || []).includes('Justice');
}

export default {
  number: 'hBP08-027',

  bloomEffect: {
    name: '絡繰のラプソディー',
    *run(ctx) {
      const n = ctx.holomems('self', isRestingJustice).length;
      if (n === 0) {
        ctx.log('お休みしている#Justiceホロメンがいない');
        return;
      }
      for (let i = 0; i < n; i++) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) {
          ctx.log('アーカイブに送れるエールがない');
          break;
        }
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: `アーカイブから送るエールを選択（${i + 1}/${n}枚目）`,
        });
        if (!picked) break;
        ctx.removeFromArchive(picked);
        ctx.attachCheer(picked, ctx.sourceHolomem);
      }
    },
  },

  arts: {
    '翠嵐のシュトルム': {
      *run(ctx) {
        const n = ctx.holomems('self', isRestingJustice).length;
        if (n > 0) ctx.draw(n);
        // その後、このホロメンをお休みさせる
        if (ctx.sourceHolomem) {
          ctx.sourceHolomem.rested = true;
          ctx.log(`${ctx.sourceHolomem.stack[0].name} をお休みさせた`);
        }
      },
    },
  },
};
