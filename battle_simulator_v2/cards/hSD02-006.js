/**
 * 百鬼あやめ (hSD02-006) 赤・1st・HP140（#JP, #2期生, #シューター）
 * ブルームエフェクト「お誕生日会」:
 *   自分の手札1枚をアーカイブできる：相手のセンターホロメンかコラボホロメンに特殊ダメージ20を与える。
 *   → 「できる」=任意。手札が1枚以上ある時に任意でアーカイブ→対象（センター/コラボ）に特殊ダメージ20。
 * アーツ「一緒にお祝い」(dmg:30): テキスト効果なし（素点のみ）。
 */
export default {
  number: 'hSD02-006',
  bloomEffect: {
    name: 'お誕生日会',
    *run(ctx) {
      if (ctx.player.hand.length === 0) return; // コスト（手札1枚）を払えない
      // 対象が存在しなければ意味がない
      const hasTarget = ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'collab').length > 0;
      if (!hasTarget) return;
      const ok = yield ctx.confirm('手札1枚をアーカイブして特殊ダメージ20を与えますか？');
      if (!ok) return;
      const card = yield ctx.chooseCard({
        cards: [...ctx.player.hand],
        title: 'コスト: アーカイブする手札を選択',
      });
      if (!card) return;
      ctx.removeFromHand(card);
      ctx.player.archive.push(card);
      ctx.log('手札1枚をアーカイブした');
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: '特殊ダメージ20を与える相手ホロメンを選択（センターかコラボ）',
      });
      if (target) yield* ctx.dealSpecialDamage(target, 20);
    },
  },
};
