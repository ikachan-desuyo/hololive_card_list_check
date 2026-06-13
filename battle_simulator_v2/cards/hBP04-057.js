/**
 * ラプラス・ダークネス (hBP04-057) 紫・HP130・1stBloom
 * ブルームエフェクト「holoX集合」:
 *   サイコロを1回振れる：
 *     奇数の時、自分のアーカイブの #秘密結社holoX を持つホロメン1枚を手札に戻す。
 *     偶数の時、自分のアーカイブの #秘密結社holoX を持つホロメン1枚をデッキの上に戻す。
 * ※アーツ「最高のステージ魅せてやるからな！！」はテキスト効果なし（基本値40のみ＝エンジンが処理）
 * 保留: なし
 */
export default {
  number: 'hBP04-057',
  bloomEffect: {
    name: 'holoX集合',
    *run(ctx) {
      const ok = yield ctx.confirm('サイコロを振りますか？', '振る', '振らない');
      if (!ok) return;
      const v = yield* ctx.rollDice();
      const odd = v % 2 === 1;
      // 自分のアーカイブの #秘密結社holoX を持つホロメン
      const candidates = ctx.player.archive.filter(
        (c) => c.kind === 'holomen' && ctx.hasTag(c, '秘密結社holoX'));
      if (candidates.length === 0) {
        ctx.log('アーカイブに #秘密結社holoX のホロメンがいない');
        return;
      }
      const dest = odd ? '手札' : 'デッキの上';
      const card = yield ctx.chooseCard({
        cards: candidates,
        title: `アーカイブから${dest}に戻す #秘密結社holoX ホロメンを選択`,
      });
      if (!card) return;
      ctx.removeFromArchive(card);
      if (odd) {
        ctx.addToHand(card);
      } else {
        ctx.deckToTop([card]);
        ctx.log(`${ctx.player.name}: ${card.name} をデッキの上に戻した`);
      }
    },
  },
};
