/**
 * GEOW (hSD12-016) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で常時 +20。
 *
 * このマスコットを手札から1st以上の〈古石ビジュー〉に付けた時、
 *   自分のステージのエール1枚をアーカイブできる：
 *   自分のエールデッキから、エール1枚を公開し、自分のホロメンに送る。そしてエールデッキをシャッフルする。
 *   → triggers.onAttach（手札からのマスコット装着＝engine の supportAttach 経由で発火）。
 *     付け先が〈古石ビジュー〉かつ bloomLevel が 1st 以上（1st/2nd）の時のみ誘発。
 *     コスト（自分のステージのエール1枚をアーカイブ）は任意（「できる：」）なので confirm + 選択で支払う。
 *     コストを支払えた場合、エールデッキ内から任意のエール1枚を選んで公開し（非公開領域の
 *     サーチ＝見つからなかったことにできる。参考: hBP02-023）、選んだ自分のホロメンに送り、
 *     エールデッキをシャッフルする（トップ固定ではない。だから後でシャッフルする）。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる。
 *   → マスコットの既定ルール（1人1枚）。attachRule を特に指定しない。
 */
export default {
  number: 'hSD12-016',
  attached: {
    // [サポート効果] このマスコットが付いているホロメンのHP+20
    hpPlus() { return 20; },
  },
  triggers: {
    *onAttach(ctx) {
      const holomem = ctx.sourceHolomem;
      if (!holomem) return;
      // 付け先が〈古石ビジュー〉で、bloomLevel が 1st 以上（1st/2nd）であること
      const top = holomem.stack[0];
      if (top?.name !== '古石ビジュー') return;
      if (!['1st', '2nd'].includes(top.bloomLevel)) return;
      if (ctx.player.cheerDeck.length === 0) return;

      // 自分のステージのエール（コストとしてアーカイブする候補）を集める
      const cheerOptions = [];
      for (const { holomem: h } of ctx.holomems('self')) {
        for (const cheer of h.cheers) cheerOptions.push({ cheer, owner: h });
      }
      if (cheerOptions.length === 0) return;

      const ok = yield ctx.confirm(
        'ステージのエール1枚をアーカイブして、エールデッキから1枚を送りますか？');
      if (!ok) return;

      const picked = yield ctx.chooseCard({
        cards: cheerOptions.map((o) => o.cheer),
        title: 'コストとしてアーカイブする自分のステージのエールを選択',
        optional: true,
        skipLabel: 'やめる',
      });
      if (!picked) return;
      const owner = cheerOptions.find((o) => o.cheer === picked).owner;
      yield* ctx.archiveCheer(owner, picked);

      // エールデッキ内からエール1枚を選んで公開し、自分のホロメンに送る → エールデッキをシャッフル
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
      ctx.shuffleCheerDeck();
    },
  },
};
