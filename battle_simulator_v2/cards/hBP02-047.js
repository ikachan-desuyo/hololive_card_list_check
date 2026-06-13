/**
 * 紫咲シオン (hBP02-047) 紫・2nd・HP200（#JP #2期生）
 * ブルームエフェクト「いたずらの魔法」:
 *   サイコロを1回振れる：4以上の時、相手のステージのエール1枚を、相手のホロメンに付け替える。
 *   → 任意でサイコロを振り、4以上なら相手ステージのエール1枚を別の相手ホロメンへ moveCheer。
 * アーツ「ヴァイオレットマジック」(80, 特攻 緑+50):
 *   相手のセンターホロメンとコラボホロメンに、相手のセンターホロメンのエール1枚につき、特殊ダメージ20を与える。
 *   → 相手センターのエール枚数 × 20 を、相手センターとコラボの両方に特殊ダメージとして与える。
 */
export default {
  number: 'hBP02-047',
  bloomEffect: {
    name: 'いたずらの魔法',
    *run(ctx) {
      // 相手ステージにエールが1枚以上ある時のみ意味がある
      const oppMembers = ctx.holomems('opp');
      const hasCheer = oppMembers.some((e) => e.holomem.cheers.length > 0);
      if (!hasCheer) return;
      const ok = yield ctx.confirm('サイコロを振りますか？（4以上で相手のエール1枚を付け替える）');
      if (!ok) return;
      const roll = ctx.rollDice();
      if (roll < 4) return;
      // 付け替え元のエールを選択（相手ステージ上の全エールから）
      const cheerChoices = [];
      for (const { holomem } of oppMembers) {
        for (const cheer of holomem.cheers) cheerChoices.push({ cheer, from: holomem });
      }
      if (cheerChoices.length === 0) return;
      const pickedCheer = yield ctx.chooseCard({
        cards: cheerChoices.map((c) => c.cheer),
        title: '付け替える相手のエールを選択',
      });
      if (!pickedCheer) return;
      const src = cheerChoices.find((c) => c.cheer === pickedCheer);
      const dest = yield ctx.chooseHolomem({
        side: 'opp',
        title: 'エールの付け替え先（相手のホロメン）を選択',
      });
      if (!dest) return;
      ctx.moveCheer(pickedCheer, src.from, dest.holomem);
    },
  },
  arts: {
    'ヴァイオレットマジック': {
      *run(ctx) {
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        // 相手のセンターホロメンのエール1枚につき特殊ダメージ20
        const cheerCount = center ? center.holomem.cheers.length : 0;
        const amount = cheerCount * 20;
        if (amount <= 0) return;
        // 相手のセンターホロメンとコラボホロメンの両方に与える
        const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab')[0];
        if (center) ctx.dealSpecialDamage(center, amount);
        if (collab) ctx.dealSpecialDamage(collab, amount);
      },
    },
  },
};
