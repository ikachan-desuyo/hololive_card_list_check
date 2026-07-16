/**
 * ラオーラ・パンテーラ (hSD13-015) 無色・Spot・HP160（#EN #Justice #ケモミミ #絵）
 *
 * コラボエフェクト「正義の諧調」:
 *   自分のステージのエール1枚をエールデッキの下に戻せる。戻したなら、自分のエールデッキから、
 *   エール1枚を公開し、自分のホロメンに送る。そしてエールデッキをシャッフルする。
 *   → 任意（「戻せる」）。ステージのエール1枚を自分のエールデッキの下（末尾）へ。
 *     戻したら、「エールデッキから、エール1枚を公開し送る」= エールデッキ内から任意の1枚を
 *     選ぶサーチ（hBP02-023 と同じ）。非公開領域のサーチなので「見つからなかったことに
 *     できる」= optional。最後にエールデッキをシャッフルする。
 *
 * アーツ「コーヒーをどうぞ！」(30+):
 *   自分の#Justiceを持つ[センターホロメンとコラボホロメン]に異なる色のエールが付いているなら、
 *   このアーツ+20。
 *   → 自分の #Justice センターホロメン と #Justice コラボホロメン に付いているエールの色を集め、
 *     2色以上（=異なる色が存在する）なら +20。
 */
export default {
  number: 'hSD13-015',
  collabEffect: {
    name: '正義の諧調',
    *run(ctx) {
      // ステージ上の自分のエールを列挙
      const entries = [];
      for (const e of ctx.holomems('self')) {
        for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
      }
      if (entries.length === 0) return;

      // 「戻せる」=任意。エールデッキに送り先（戻す枠）は常にあるが、戻すかどうかは選択
      const picked = yield ctx.chooseCard({
        cards: entries.map((e) => e.cheer),
        title: 'エールデッキの下に戻すステージのエールを選択（任意）',
        optional: true,
        skipLabel: '戻さない',
      });
      if (!picked) return;

      // ステージから取り除いて自分のエールデッキの下（末尾）へ
      const from = entries.find((e) => e.cheer === picked).from;
      const i = from.cheers.indexOf(picked);
      if (i !== -1) from.cheers.splice(i, 1);
      ctx.player.cheerDeck.push(picked);
      ctx.log(`${from.stack[0].name} の ${picked.name} をエールデッキの下に戻した`);

      // 戻したなら、エールデッキから1枚を選んで公開し、自分のホロメンに送る（hBP02-023 と同パターン）
      const cheer = yield ctx.chooseCard({
        cards: ctx.player.cheerDeck,
        title: 'エールデッキから送るエールを選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (cheer) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'エールを送る自分のホロメンを選択',
        });
        if (target) {
          ctx.removeFromCheerDeck(cheer);
          ctx.log(`${ctx.player.name}: エールデッキから ${cheer.name} を公開`);
          ctx.flashReveal(cheer);
          ctx.attachCheer(cheer, target.holomem);
        }
      }

      // そしてエールデッキをシャッフルする
      ctx.shuffleCheerDeck();
      ctx.log(`${ctx.player.name}: エールデッキをシャッフルした`);
    },
  },
  arts: {
    'コーヒーをどうぞ！': {
      dmgBonus(ctx) {
        // 自分の #Justice センターホロメン と #Justice コラボホロメン に付いているエールの色
        const colors = new Set();
        for (const e of ctx.holomems('self', (h) => (h.pos.zone === 'center' || h.pos.zone === 'collab') && ctx.hasTag(h.top, 'Justice'))) {
          for (const cheer of e.holomem.cheers) {
            if (cheer.color) colors.add(cheer.color);
          }
        }
        return colors.size >= 2 ? 20 : 0;
      },
    },
  },
};
