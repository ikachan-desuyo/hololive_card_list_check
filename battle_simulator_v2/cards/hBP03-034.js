/**
 * 赤井はあと (hBP03-034) 赤・Buzzホロメン・1st・HP240（#JP #1期生 #料理）
 * ブルームエフェクト「もう1人のはあと」:
 *   自分のアーカイブの#1期生を持つBuzz以外の[1stホロメンか2ndホロメン]1枚を手札に戻せる。
 *   → 任意（「戻せる」）。アーカイブから手札へ。
 * アーツ「レッド オア ルージュ」(40+):
 *   サイコロを1回振れる：奇数の時、相手のセンターホロメンとコラボホロメンに特殊ダメージ20を与える。
 *   偶数の時、このアーツ+40。
 *   → 任意（「振れる」）。アーツ解決の run 内でサイコロ→分岐。
 */
export default {
  number: 'hBP03-034',
  bloomEffect: {
    name: 'もう1人のはあと',
    *run(ctx) {
      const cand = ctx.player.archive.filter((c) =>
        c.kind === 'holomen' &&
        !c.buzz &&
        (c.bloomLevel === '1st' || c.bloomLevel === '2nd') &&
        (c.tags || []).includes('1期生'));
      if (cand.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に戻す#1期生のBuzz以外[1st/2nd]ホロメンを選択（任意）',
        optional: true,
        skipLabel: '戻さない',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked);
    },
  },
  arts: {
    'レッド オア ルージュ': {
      *run(ctx) {
        const ok = yield ctx.confirm('サイコロを1回振りますか？');
        if (!ok) return;
        const v = (yield* ctx.rollDice());
        if (v % 2 === 1) {
          // 奇数: 相手のセンターホロメンとコラボホロメンに特殊ダメージ20
          const targets = ctx.holomems('opp', (e) =>
            e.pos.zone === 'center' || e.pos.zone === 'collab');
          for (const t of targets) yield* ctx.dealSpecialDamage(t, 20);
        } else {
          // 偶数: このアーツ+40
          ctx.addArtBonus(40, 'サイコロ偶数');
        }
      },
    },
  },
};
