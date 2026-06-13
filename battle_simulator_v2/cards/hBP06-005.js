/**
 * ハコス・ベールズ（推しホロメン hBP06-005）
 *
 * 推しスキル「混沌の化身」[ホロパワー：-1][ターンに1回]:
 *   このゲーム中に、自分のSP推しスキルを使っていたなら、サイコロを1回振る。
 *   自分の手札が出た目の数と同じになるまで、自分のデッキを引く。
 *   → SP使用済み(usedSpOshiSkillThisGame)を canUse 条件にする。
 *     出た目より手札が少なければ差分だけドロー（多ければ0枚＝引かない）。
 *
 * SP推しスキル「ƎNOZ N∩Ⅎ ƎH⊥ O⊥ ƎWOϽ˥ƎM」[ホロパワー：-2][ゲームに1回]:
 *   サイコロを1回振る。出た目の数1につき、自分の手札1枚をアーカイブする。
 *   → 出た目の数だけ、手札（推しスキルのコストで払った後の手札）から
 *     プレイヤーが選んでアーカイブ。手札がそれより少なければある分だけ。
 */
export default {
  number: 'hBP06-005',

  oshiSkill: {
    canUse(engine, ownerIdx) {
      // このゲーム中にSP推しスキルを使っていたなら使える
      return engine.state.players[ownerIdx].usedSpOshiSkillThisGame === true;
    },
    *run(ctx) {
      const value = (yield* ctx.rollDice());
      const need = value - ctx.player.hand.length;
      if (need > 0) {
        ctx.draw(need);
      } else {
        ctx.log(`混沌の化身: 手札が既に${ctx.player.hand.length}枚（出た目${value}）のためドローなし`);
      }
    },
  },

  spOshiSkill: {
    *run(ctx) {
      const value = (yield* ctx.rollDice());
      const count = Math.min(value, ctx.player.hand.length);
      for (let i = 0; i < count; i++) {
        // 残り手札から1枚選んでアーカイブ（手札が尽きたら終了）
        if (ctx.player.hand.length === 0) break;
        const card = yield ctx.chooseCard({
          cards: [...ctx.player.hand],
          title: `アーカイブする手札を選択（残り ${count - i} 枚）`,
        });
        if (!card) break;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${ctx.player.name}: ${card.name} をアーカイブ`);
      }
    },
  },
};
