/**
 * 常闇トワ (hBP03-054) 紫・1st・HP140（#JP #4期生 #歌 #シューター）
 * コラボエフェクト「トワにしか出せない色」:
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ20を与える。
 * アーツ「大爆発させちゃうぜ！」(30):
 *   このホロメンの紫エール4枚をアーカイブできる：相手のステージのエール1枚をエールデッキの下に戻す。
 *   → コスト（紫エール4枚アーカイブ）を払えば任意で発動。相手ステージのエール1枚を相手のエールデッキ下へ。
 */
export default {
  number: 'hBP03-054',
  collabEffect: {
    name: 'トワにしか出せない色',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: '特殊ダメージ20を与える相手ホロメンを選択（センターかコラボ）',
      });
      if (target) yield* ctx.dealSpecialDamage(target, 20);
    },
  },
  arts: {
    '大爆発させちゃうぜ！': {
      *run(ctx) {
        // コスト: このホロメンの紫エール4枚をアーカイブ（任意）
        const purple = ctx.sourceHolomem.cheers.filter((c) => c.color === '紫');
        if (purple.length < 4) return; // コストを払えない
        // 相手のステージにエールが無ければ意味がない（コストだけ払う意味もない）
        const oppHasCheer = ctx.holomems('opp').some((e) => e.holomem.cheers.length > 0);
        if (!oppHasCheer) return;
        const ok = yield ctx.confirm('このホロメンの紫エール4枚をアーカイブして、相手のステージのエール1枚をエールデッキの下に戻しますか？');
        if (!ok) return;
        // コスト支払い: 紫エール4枚を選んでアーカイブ
        for (let i = 0; i < 4; i++) {
          const remaining = ctx.sourceHolomem.cheers.filter((c) => c.color === '紫');
          const cheer = yield ctx.chooseCard({
            cards: remaining,
            title: `コスト: アーカイブする紫エールを選択（${i + 1}/4）`,
          });
          if (!cheer) return;
          ctx.archiveCheer(ctx.sourceHolomem, cheer);
        }
        // 効果: 相手のステージのエール1枚を相手のエールデッキの下に戻す
        const entries = [];
        for (const e of ctx.holomems('opp')) {
          for (const ch of e.holomem.cheers) entries.push({ ch, from: e.holomem });
        }
        if (entries.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: entries.map((e) => e.ch),
          title: '相手のエールデッキの下に戻す相手のエールを選択',
        });
        if (!picked) return;
        const from = entries.find((e) => e.ch === picked).from;
        const idx = from.cheers.indexOf(picked);
        if (idx !== -1) from.cheers.splice(idx, 1);
        // 相手のエールデッキの下（末尾）へ戻す
        ctx.opponent.cheerDeck.push(picked);
        ctx.log(`${ctx.opponent.name}: ${picked.name} を相手のステージからエールデッキの下に戻した`);
      },
    },
  },
};
