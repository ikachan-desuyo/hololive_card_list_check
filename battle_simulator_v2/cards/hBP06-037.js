/**
 * 百鬼あやめ (hBP06-037) 赤・1st・HP140 / JP・2期生・シューター
 * ブルームエフェクト「お参りデート」:
 *   自分のアーカイブの赤エール2枚を好きな順でエールデッキの下に戻せる。
 *   → 任意（「戻せる」）。1枚ずつ選んでエールデッキの下に積むことで「好きな順」を再現。
 * アーツ「ずっと元気でいられますように…」(50):
 *   自分のエールデッキの上から1枚をアーカイブできる：
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ30を与える。
 *   → コスト（エールデッキの上から1枚をアーカイブ）を払えば特殊ダメージ30。
 */
export default {
  number: 'hBP06-037',
  bloomEffect: {
    name: 'お参りデート',
    *run(ctx) {
      // 赤エールを最大2枚、好きな順でエールデッキの下に戻す（任意）
      for (let i = 0; i < 2; i++) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer' && c.color === '赤');
        if (cheers.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: `エールデッキの下に戻す赤エールを選択（${i + 1}/2・任意）`,
          optional: true,
          skipLabel: '戻さない',
        });
        if (!picked) break;
        ctx.removeFromArchive(picked);
        ctx.player.cheerDeck.push(picked); // 下に戻す。選んだ順がそのまま「好きな順」
        ctx.log(`${ctx.player.name}: ${picked.name} をエールデッキの下に戻した`);
      }
    },
  },
  arts: {
    'ずっと元気でいられますように…': {
      *run(ctx) {
        if (ctx.player.cheerDeck.length === 0) return; // コスト（エールデッキの上から1枚）を払えない
        const ok = yield ctx.confirm('エールデッキの上から1枚をアーカイブして特殊ダメージ30を与えますか？');
        if (!ok) return;
        const cheer = ctx.player.cheerDeck.shift(); // 上から1枚
        ctx.player.archive.push(cheer);
        ctx.log(`${ctx.player.name}: エールデッキの上から ${cheer.name} をアーカイブ`);
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ30を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 30);
      },
    },
  },
};
