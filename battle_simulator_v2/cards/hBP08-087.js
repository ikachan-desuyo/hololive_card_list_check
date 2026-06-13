/**
 * 不知火フレア 2nd (hBP08-087) ホロメン・黄
 *
 * コラボエフェクト「ドリーミングエール」:
 *   自分のアーカイブのエール1～2枚を自分のセンターホロメンの
 *   [〈不知火フレア〉か#ENを持つホロメン]に送れる。
 *   → センターが〈不知火フレア〉または #EN を持つホロメンの場合のみ送れる。
 *     「1～2枚」かつ「送れる」=最大2枚・0枚も可（任意）。1枚ずつアーカイブから選んで送る。
 *     条件を満たすセンターがいない／アーカイブにエールが無い場合は何もしない。
 *
 * アーツ「夢から醒めたら」(dmg:90, 特攻 青+50):
 *   追加テキストなし（素のダメージ＋特攻のみ）。個別実装不要。
 *
 * 保留: なし
 */
export default {
  number: 'hBP08-087',
  collabEffect: {
    name: 'ドリーミングエール',
    *run(ctx) {
      const center = ctx.player.center;
      if (!center) return;
      const centerTop = center.stack[0];
      // 送り先はセンターのみ。〈不知火フレア〉か #EN を持つホロメンであること
      const eligible = ctx.nameIs(centerTop, '不知火フレア') || ctx.hasTag(centerTop, '#EN');
      if (!eligible) return;
      // アーカイブのエール1～2枚を、1枚ずつセンターへ送る（任意・最大2枚）
      for (let i = 0; i < 2; i++) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const cheer = yield ctx.chooseCard({
          cards: cheers,
          title: `センターホロメンに送るエールをアーカイブから選択 (${i + 1}/2枚目・任意)`,
          optional: true,
          skipLabel: i === 0 ? '送らない' : 'ここまでにする',
        });
        if (!cheer) break;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, center);
      }
    },
  },
};
