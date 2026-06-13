/**
 * 獅白ぼたん (hBP03-019) 緑・1st・HP130（#JP #5期生 #ケモミミ #シューター）
 * ブルームエフェクト「歌う事は楽しい事」:
 *   自分のバックホロメンのエール1枚をアーカイブできる：
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ30を与える。
 *   このブルームエフェクトはターンに1回しか使えない。
 * アーツ「じゅるり」(30):
 *   自分の手札の〈角巻わため〉1枚を公開し、デッキの下に戻せる：このホロメンのHP20回復。
 */
export default {
  number: 'hBP03-019',
  bloomEffect: {
    name: '歌う事は楽しい事',
    *run(ctx) {
      // ターンに1回しか使えない（同名を同ターンに複数Bloomしても1回まで）
      if (ctx.oncePerTurnUsed('hBP03-019:歌う事は楽しい事')) {
        ctx.log('ブルームエフェクト「歌う事は楽しい事」はこのターン既に使用済み');
        return;
      }
      // エールを持つ自分のバックホロメン
      const backsWithCheer = ctx.holomems('self', (e) => e.pos.zone === 'back' && e.holomem.cheers.length > 0);
      if (backsWithCheer.length === 0) return;
      const ok = yield ctx.confirm('バックホロメンのエール1枚をアーカイブして相手に特殊ダメージ30を与えますか？');
      if (!ok) return;
      // どのバックホロメンのエールをアーカイブするか
      const backSel = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && e.holomem.cheers.length > 0,
        title: 'エールをアーカイブするバックホロメンを選択',
      });
      if (!backSel) return;
      const cheer = yield ctx.chooseCard({
        cards: backSel.holomem.cheers,
        title: 'アーカイブするエールを選択',
      });
      if (!cheer) return;
      ctx.markOncePerTurn('hBP03-019:歌う事は楽しい事');
      ctx.archiveCheer(backSel.holomem, cheer);
      // 相手のセンターホロメンかコラボホロメンに特殊ダメージ30
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: '特殊ダメージ30を与える相手ホロメンを選択（センターかコラボ）',
      });
      if (target) yield* ctx.dealSpecialDamage(target, 30);
    },
  },
  arts: {
    'じゅるり': {
      *run(ctx) {
        const watames = ctx.player.hand.filter((c) => c.name === '角巻わため');
        if (watames.length === 0) return;
        const ok = yield ctx.confirm('手札の〈角巻わため〉1枚を公開しデッキの下に戻してHP20回復しますか？');
        if (!ok) return;
        const picked = yield ctx.chooseCard({
          cards: watames,
          title: 'デッキの下に戻す〈角巻わため〉を選択（公開）',
        });
        if (!picked) return;
        ctx.removeFromHand(picked);
        ctx.log(`${ctx.player.name}: 角巻わため を公開しデッキの下に戻した`);
        ctx.deckToBottom([picked]);
        ctx.heal(ctx.sourceHolomem, 20);
      },
    },
  },
};
