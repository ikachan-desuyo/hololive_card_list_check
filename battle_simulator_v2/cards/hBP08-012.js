/**
 * IRyS (hBP08-012) 白・1st・HP160（#EN,#Promise,#歌）
 *
 * ブルームエフェクト「希望が照らす轍」:
 *   自分のステージのエール1枚をエールデッキの下に戻せる: 自分のエールデッキの上から1枚を自分の〈IRyS〉に送る。
 *   → bloomEffect。コストは「〜戻せる:」=任意（払わなければ効果なし）。
 *     ・払うエール: 自分のステージのホロメン全員のエールが対象（プレイヤーが1枚選択）。
 *     ・戻し先: エールデッキの「下」（cheerDeck の末尾に push）。
 *     ・効果本体: 戻した後、エールデッキの上から1枚を公開し、選んだ自分の〈IRyS〉に送る
 *       （sendCheerFromCheerDeckTop）。送り先〈IRyS〉が複数いれば選択。
 *     ・コストを払えない/払わない（ステージにエールが無い、エールデッキが空、〈IRyS〉不在）の時は何もしない。
 *
 * アーツ「片や天使 片や悪魔」(50):
 *   このホロメンに紫エールが付いているなら、相手のセンターホロメンに特殊ダメージ20を与える。
 *   → arts.*run。基本ダメージ50はエンジンが処理。run では条件（このホロメン=sourceHolomem に紫エール）を
 *     満たす時だけ相手センターに特殊ダメージ20。
 *
 * 保留: なし（全文 context.js のプリミティブで実装）。
 */
export default {
  number: 'hBP08-012',

  bloomEffect: {
    name: '希望が照らす轍',
    *run(ctx) {
      // 送り先の自分の〈IRyS〉（Bloom先のこのホロメン含む）
      const irysList = ctx.holomems('self', (e) => e.top.name === 'IRyS');
      if (irysList.length === 0) return;
      if (ctx.player.cheerDeck.length === 0) return;
      // コストに使えるエール（自分のステージのホロメンに付いているエール全て）
      const cheerOptions = [];
      for (const { holomem } of ctx.holomems('self')) {
        for (const cheer of holomem.cheers) cheerOptions.push({ cheer, holomem });
      }
      if (cheerOptions.length === 0) return;

      // コスト: エール1枚をエールデッキの下に戻す（任意）
      const picked = yield ctx.chooseCard({
        cards: cheerOptions.map((o) => o.cheer),
        title: 'エールデッキの下に戻すエールを選択（希望が照らす轍）',
        optional: true,
        skipLabel: '戻さない（効果を使わない）',
      });
      if (!picked) return;
      const owner = cheerOptions.find((o) => o.cheer === picked).holomem;
      const i = owner.cheers.indexOf(picked);
      if (i !== -1) owner.cheers.splice(i, 1);
      ctx.player.cheerDeck.push(picked);
      ctx.log(`${owner.stack[0].name} の ${picked.name} をエールデッキの下に戻した`);

      // 効果本体: エールデッキの上から1枚を自分の〈IRyS〉に送る
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === 'IRyS',
        title: 'エールを送る自分の〈IRyS〉を選択（希望が照らす轍）',
      });
      if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },

  arts: {
    '片や天使 片や悪魔': {
      *run(ctx) {
        // このホロメンに紫エールが付いているなら、相手センターに特殊ダメージ20
        const hasPurple = (ctx.sourceHolomem?.cheers || []).some((c) => c.color === '紫');
        if (!hasPurple) return;
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) yield* ctx.dealSpecialDamage(center, 20);
      },
    },
  },
};
