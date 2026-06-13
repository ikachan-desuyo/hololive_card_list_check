/**
 * 紫咲シオン (hBP02-046) 紫・1st・HP130（#JP, #2期生）
 * ブルームエフェクト「入れ替えの魔法」:
 *   自分の手札1枚をアーカイブできる：自分のアーカイブの#魔法を持つカード1枚を手札に戻す。
 *   → コロン前がコスト（手札1枚アーカイブ・任意）、コロン後が効果（アーカイブの#魔法カードを手札へ）。
 * アーツ「チェンジ・ザ・エール」(30):
 *   サイコロを1回振れる：5以上の時、相手のステージのエール1枚を、相手のホロメンに付け替える。
 *   → 「振れる」=任意。出目5以上なら相手ステージのエール1枚を別の相手ホロメンへ付け替え。
 */
export default {
  number: 'hBP02-046',
  bloomEffect: {
    name: '入れ替えの魔法',
    *run(ctx) {
      // コスト: 手札1枚をアーカイブ（任意）
      if (ctx.player.hand.length === 0) return;
      // 戻せる対象（アーカイブの#魔法カード）が無ければ意味が無いので確認だけ先に
      const magicInArchive = ctx.player.archive.filter((c) => ctx.hasTag(c, '魔法'));
      if (magicInArchive.length === 0) return;
      const ok = yield ctx.confirm('手札1枚をアーカイブして、アーカイブの#魔法カード1枚を手札に戻しますか？');
      if (!ok) return;
      const cost = yield ctx.chooseCard({
        cards: [...ctx.player.hand],
        title: 'コスト: アーカイブする手札を選択',
      });
      if (!cost) return;
      ctx.removeFromHand(cost);
      ctx.player.archive.push(cost);
      ctx.log(`${ctx.player.name}: ${cost.name} をアーカイブした`);

      // 効果: アーカイブの#魔法カード1枚を手札へ（コスト分を含めた最新のアーカイブから選ぶ）
      const candidates = ctx.player.archive.filter((c) => ctx.hasTag(c, '魔法'));
      if (candidates.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に戻す#魔法カードを選択',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked);
    },
  },
  arts: {
    'チェンジ・ザ・エール': {
      *run(ctx) {
        // 相手ステージにエールが付いているホロメンが無ければ実行しても意味が無い
        const oppMems = ctx.holomems('opp');
        const hasAnyCheer = oppMems.some((e) => e.holomem.cheers.length > 0);
        if (!hasAnyCheer || oppMems.length < 2) return;
        const ok = yield ctx.confirm('サイコロを1回振りますか？（5以上で相手のエール1枚を付け替える）');
        if (!ok) return;
        const roll = ctx.rollDice();
        if (roll < 5) return;

        // 相手ステージのエール1枚を選ぶ（owner を記録）
        const cheerEntries = [];
        for (const e of oppMems) {
          for (const cheer of e.holomem.cheers) {
            cheerEntries.push({ cheer, owner: e.holomem });
          }
        }
        if (cheerEntries.length === 0) return;
        const cheer = yield ctx.chooseCard({
          cards: cheerEntries.map((x) => x.cheer),
          title: '付け替える相手のエールを選択',
        });
        if (!cheer) return;
        const from = cheerEntries.find((x) => x.cheer === cheer).owner;

        // 付け替え先（元のホロメン以外の相手ホロメン）
        const dest = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.holomem !== from,
          title: 'エールの付け替え先（相手ホロメン）を選択',
        });
        if (!dest) return;
        ctx.moveCheer(cheer, from, dest.holomem);
      },
    },
  },
};
