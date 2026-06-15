/**
 * 白上フブキ（推しホロメン hBP02-001・白）
 *
 * 推しスキル「マスコット創造」[ホロパワー：2消費][ターンに1回]:
 *   自分のデッキから、マスコット1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → oshiSkill（能動）。デッキはマスコットを検索（非公開領域なので「見つからない」も許容＝optional）、
 *     1枚を公開して手札に加え、最後にデッキをシャッフルする。コスト[ホロパワー：-2]はエンジンが処理。
 *
 * SP推しスキル「フブキングダム」[ホロパワー：2消費][ゲームに1回]:
 *   自分の白ホロメンが相手のホロメンをダウンさせた時、自分のステージのマスコット2枚につき、
 *   サイコロを1回振れる：奇数が1回以上出たなら、相手のライフ-1。
 *   → onDamageDealtOshiSkills（攻撃時誘発の推しスキル）で実装。エンジンがアーツ解決の
 *     「ダメージを与えた時」タイミングで、攻撃側に使用可否（コスト[ホロパワー：-2]・[ゲームに1回]）を提示する。
 *     canUse: 攻撃したホロメン（info.sourceHolomem）が白で、かつこのアーツで相手をダウンさせた
 *     （info.downed.length > 0）こと。run: 自分のステージのマスコット枚数 ÷2（端数切り捨て）回
 *     サイコロを振り（yield* ctx.rollDice）、奇数が1回以上なら相手のライフ-1（opponent.lifeDamage += 1。
 *     hBP01-014 等と同じく、アーツ解決後の _checkTiming で通常のライフ処理が走る）。
 */
export default {
  number: 'hBP02-001',

  oshiSkill: {
    name: 'マスコット創造',
    canUse(engine, ownerIdx) {
      // 空振り（コストだけ払う）を避けるため、デッキにマスコットがある時のみ使える
      const p = engine.state.players[ownerIdx];
      return p.deck.some((c) => c.kind === 'support' && c.supportType === 'マスコット');
    },
    *run(ctx) {
      const mascots = ctx.deckCards((c) => c.kind === 'support' && c.supportType === 'マスコット');
      if (mascots.length > 0) {
        const card = yield ctx.chooseCard({
          cards: mascots,
          title: 'デッキから手札に加えるマスコットを選択',
          optional: true,
          skipLabel: '加えない',
        });
        if (card) {
          ctx.removeFromDeck(card);
          ctx.addToHand(card, { reveal: true });
        }
      }
      ctx.shuffleDeck();
    },
  },

  // SP推しスキル「フブキングダム」: 自分の白ホロメンが相手をダウンさせた時に使える（ゲームに1回）。
  // 攻撃時誘発（onDamageDealtOshiSkills）。コスト[ホロパワー：-2]・[ゲームに1回]はエンジンが処理する。
  onDamageDealtOshiSkills: [
    {
      cost: 2,
      sp: true,
      title: 'SP推しスキル「フブキングダム」: マスコット2枚につきサイコロを振り、奇数が出たら相手のライフ-1？（ホロパワー-2 / ゲームに1回）',
      canUse(engine, idx, info) {
        const sh = info.sourceHolomem;
        if (!sh || !engine._hasColor(sh, '白')) return false;   // 自分の白ホロメンが
        if (!(info.downed || []).length) return false;          // 相手のホロメンをダウンさせた時
        // マスコット2枚につき1回振れる＝マスコットが2枚以上ないと振れない（空振り回避）
        const me = engine.state.players[idx];
        let mascots = 0;
        for (const pos of engine._stagePositions(me)) {
          const h = engine._holomemAt(me, pos);
          mascots += h.attachments.filter((a) => a.supportType === 'マスコット').length;
        }
        return mascots >= 2;
      },
      *run(ctx) {
        // 自分のステージのマスコット枚数を数える
        let mascots = 0;
        for (const { holomem } of ctx.holomems('self')) {
          mascots += holomem.attachments.filter((a) => a.supportType === 'マスコット').length;
        }
        const rolls = Math.floor(mascots / 2); // マスコット2枚につきサイコロ1回
        ctx.log(`SP推しスキル「フブキングダム」: マスコット${mascots}枚 → サイコロ${rolls}回`);
        let anyOdd = false;
        for (let i = 0; i < rolls; i++) {
          const v = yield* ctx.rollDice();
          if (v % 2 === 1) anyOdd = true;
        }
        if (anyOdd) {
          ctx.reduceOpponentLife(1); // 相手のライフ-1（免疫があれば減らない。_checkTiming で処理）
          ctx.log('SP推しスキル「フブキングダム」: 奇数が出た → 相手のライフ-1');
        } else {
          ctx.log('SP推しスキル「フブキングダム」: 奇数が出なかった（ライフ変動なし）');
        }
      },
    },
  ],
};
