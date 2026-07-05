/**
 * 星街すいせい (hSD07-013) 青・Debut・HP70（#JP #0期生 #歌）
 * コラボエフェクト「ご飯が底をつきそう……」:
 *   自分のセンターホロメンが〈不知火フレア〉の時、自分のアーカイブのエール1枚を、
 *   このホロメン以外の自分のホロメンに送れる。
 *   → 条件: センターの名前が「不知火フレア」。任意（「送れる」）。
 *      送り先は sourceHolomem（このカード自身）を除く自分のホロメン。
 * アーツ「雇ってください‼」(dmg:20, 無色×1): 効果なし（ダメージのみ）。
 */
export default {
  number: 'hSD07-013',
  collabEffect: {
    name: 'ご飯が底をつきそう……',
    *run(ctx) {
      const center = ctx.player.center;
      // センターホロメンが〈不知火フレア〉でなければ何もしない
      if (!center || center.stack[0].name !== '不知火フレア') return;

      // アーカイブにあるエール1枚が対象
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;

      // 送り先はこのホロメン以外の自分のホロメン
      const dests = ctx.holomems('self', (e) => e.holomem !== ctx.sourceHolomem);
      if (dests.length === 0) return;

      const cheer = yield ctx.chooseCard({
        cards: cheers,
        title: 'アーカイブから送るエール1枚を選択（任意）',
        optional: true,
        skipLabel: '送らない',
      });
      if (!cheer) return;

      const dest = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem !== ctx.sourceHolomem,
        title: 'エールを送るホロメンを選択（このホロメン以外）',
      });
      if (!dest) return;

      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, dest.holomem);
    },
  },
};
