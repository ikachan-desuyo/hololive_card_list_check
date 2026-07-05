/**
 * 儒烏風亭らでん (hSD15-007) 緑・1st・HP130（#DEV_IS #ReGLOSS #お酒）
 * コラボエフェクト「旅の前日」:
 *   自分のデッキの上から1枚をアーカイブする。
 *   その後、自分のアーカイブのDebutホロメン1枚をステージに出せる（任意・「出せる」）。
 *   → デッキ先頭をアーカイブへ移動 → アーカイブのDebutホロメン候補から1枚を選び putToBack。
 *     アーカイブしたばかりのカードがDebutホロメンなら、それも候補に含まれる。
 *     ステージ上限(6)に空きがなければ出せない。
 * アーツ「この博物館おもしろそう！」(30):
 *   追加効果なし（素のダメージのみ）のため定義不要。
 * 保留: なし。
 */
export default {
  number: 'hSD15-007',
  collabEffect: {
    name: '旅の前日',
    *run(ctx) {
      // デッキの上から1枚をアーカイブする
      if (ctx.player.deck.length > 0) {
        const top = ctx.player.deck.shift();
        ctx.player.archive.push(top);
        ctx.recordDeckArchive(1);
        ctx.log(`${ctx.player.name}: デッキの上から ${top.name} をアーカイブした`);
      }
      // その後、アーカイブのDebutホロメン1枚をステージに出せる（任意）
      if (ctx.engine._stageCount(ctx.player) >= 6) return; // 空きがなければ出せない
      const candidates = ctx.player.archive.filter(
        (c) => c.kind === 'holomen' && c.bloomLevel === 'Debut');
      if (candidates.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'ステージに出すDebutホロメンをアーカイブから選択',
        optional: true,
        skipLabel: '出さない',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.putToBack(picked);
    },
  },
};
