/**
 * 輪堂千速 (hSD10-005) 緑・1st・HP160（#DEV_IS #FLOW #GLOW）
 * コラボエフェクト「FLOW GLOWのDJ兼運転手担当」:
 *   自分のアーカイブの#FLOW GLOW（FLOW+GLOW両方）を持つホロメン1～3枚を好きな順でデッキの下に戻せる。
 *   ホロメン3枚をデッキに戻したなら、自分のエールデッキの上から1枚を自分のホロメンに送れる。
 * アーツ「行きます！！！！」(20+):
 *   このターンに自分のホロメンがBloomしていたなら、このターンの間、
 *   自分のステージの〈輪堂千速〉1人のアーツ+20。
 *
 * 注: #FLOW GLOW は「FLOWとGLOWの両タグを持つ」の意（既存実装 hBP06-002 等に準拠）。
 */
const isFlowGlow = (ctx, card) => ctx.hasTag(card, 'FLOW') && ctx.hasTag(card, 'GLOW');

export default {
  number: 'hSD10-005',
  collabEffect: {
    name: 'FLOW GLOWのDJ兼運転手担当',
    *run(ctx) {
      // アーカイブの#FLOW GLOWホロメン
      const candidates = ctx.player.archive.filter((c) => c.kind === 'holomen' && isFlowGlow(ctx, c));
      if (candidates.length === 0) return;
      // 1～3枚を選ぶ（「まで」ではなく「1～3枚を…戻せる」=任意効果。0枚も可）
      const ok = yield ctx.confirm('アーカイブの#FLOW GLOWホロメンをデッキの下に戻しますか？');
      if (!ok) return;
      const picked = [];
      const max = Math.min(3, candidates.length);
      for (let i = 0; i < max; i++) {
        const remaining = candidates.filter((c) => !picked.includes(c));
        if (remaining.length === 0) break;
        const sel = yield ctx.chooseCard({
          cards: remaining,
          title: `デッキの下に戻す#FLOW GLOWホロメンを選択（${picked.length + 1}枚目／最大3枚）`,
          optional: picked.length >= 1, // 1枚目は必須（戻すと決めたため）、2枚目以降は任意
          skipLabel: 'これ以上戻さない',
        });
        if (!sel) break;
        picked.push(sel);
      }
      if (picked.length === 0) return;
      // 好きな順でデッキの下に戻す
      const ordered = yield* ctx.orderCardsFlow(picked, 'デッキの下に戻す順番');
      for (const c of ordered) ctx.removeFromArchive(c);
      ctx.deckToBottom(ordered);
      ctx.log(`アーカイブの#FLOW GLOWホロメン${ordered.length}枚をデッキの下に戻した`);
      // ホロメン3枚を戻したなら、エールデッキの上から1枚を自分のホロメンに送れる
      if (ordered.length === 3) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'エールデッキの上から1枚を送る自分のホロメンを選択（任意）',
          optional: true,
        });
        if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
      }
    },
  },
  arts: {
    '行きます！！！！': {
      *run(ctx) {
        // このターンに自分のホロメンがBloomしていたか
        const bloomedThisTurn = ctx.holomems('self').some(
          (e) => e.holomem.bloomedTurn === ctx.state.turn,
        );
        if (!bloomedThisTurn) return;
        // このターンの間、自分のステージの〈輪堂千速〉1人のアーツ+20
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === '輪堂千速',
          title: 'このターン アーツ+20する〈輪堂千速〉を選択',
        });
        if (!target) return;
        const chosen = target.holomem;
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount: 20,
          ownerIdx: ctx.playerIdx,
          match: (h) => h === chosen,
          description: `このターン、${chosen.stack[0].name} のアーツ+20`,
        });
      },
    },
  },
};
