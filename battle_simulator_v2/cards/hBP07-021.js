/**
 * ベスティア・ゼータ (hBP07-021) 白・2nd・HP200（#ID, #ID3期生）
 * ブルームエフェクト「任務手伝ってくれる？」:
 *   自分のアーカイブの[〈BAZO〉か〈Zecretary〉]1枚を自分のホロメンに付ける。
 * アーツ「最高のシークレットエージェント」(160+):
 *   自分のステージに#ID3期生を持つBuzzホロメンがいるなら、このアーツ+40。
 */
export default {
  number: 'hBP07-021',
  bloomEffect: {
    name: '任務手伝ってくれる？',
    *run(ctx) {
      // アーカイブから〈BAZO〉か〈Zecretary〉（〈X〉=カード名指定）のサポートカードを抽出
      const candidates = ctx.player.archive.filter(
        (c) => c.kind === 'support' && (ctx.nameIs(c, 'BAZO') || ctx.nameIs(c, 'Zecretary'))
      );
      if (candidates.length === 0) return;
      // 付け先が存在するカードのみ選択可能（ツール等の装着上限で付けられない場合は実行不能）
      const attachable = candidates.filter((c) =>
        ctx.holomems('self', (e) => ctx.engine._canAttachSupport(e.holomem, c)).length > 0);
      if (attachable.length === 0) {
        ctx.log('付けられる〈BAZO〉〈Zecretary〉が無い（付け先の装着上限）');
        return;
      }
      // アーカイブ（公開領域）からの「付ける」= 強制
      const card = yield ctx.chooseCard({
        cards: attachable,
        title: '付ける〈BAZO〉か〈Zecretary〉を選択',
      });
      if (!card) return;
      // 付け先（このカードの付け先制限を尊重）
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._canAttachSupport(e.holomem, card),
        title: `${card.name} を付けるホロメンを選択`,
      });
      if (!target) return;
      ctx.removeFromArchive(card);
      yield* ctx.attachSupportWithTrigger(card, target.holomem);
    },
  },
  arts: {
    '最高のシークレットエージェント': {
      dmgBonus(ctx) {
        const hasBuzzID3 = ctx.holomems('self', (e) => e.top.buzz && ctx.hasTag(e.top, 'ID3期生')).length > 0;
        return hasBuzzID3 ? 40 : 0;
      },
    },
  },
};
