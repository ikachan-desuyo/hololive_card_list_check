/**
 * ラオーラ・パンテーラ (hSD13-015) 無色・Spot・HP160（#EN #Justice #ケモミミ #絵）
 *
 * コラボエフェクト「正義の諧調」:
 *   自分のステージのエール1枚をエールデッキの下に戻せる。戻したなら、自分のエールデッキから、
 *   エール1枚を公開し、自分のホロメンに送る。そしてエールデッキをシャッフルする。
 *   → 任意（「戻せる」）。ステージのエール1枚を自分のエールデッキの下（末尾）へ。
 *     戻したら、エールデッキの上から1枚を公開し自分のホロメンに送り、最後にシャッフルする。
 *     （「エールデッキから、エール1枚を公開し送る」= 上から1枚を送る sendCheerFromCheerDeckTop。
 *      その後シャッフルなので、どのエールが出るかはランダムで問題ない。）
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

      // 戻したなら、エールデッキから1枚を公開して自分のホロメンに送る
      if (ctx.player.cheerDeck.length > 0) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'エールデッキから公開する1枚を送る自分のホロメンを選択',
        });
        if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
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
