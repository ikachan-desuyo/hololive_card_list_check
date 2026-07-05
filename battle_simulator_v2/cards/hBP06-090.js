/**
 * ブルームステージ (hBP06-090) サポート・イベント・LIMITED
 *
 * [サポート効果]
 *   自分のデッキを2枚引く。その後、自分のライフが4以下なら、
 *   自分のこのターンにDebutホロメンからBloomした1stホロメン1人を、
 *   自分の手札のホロメンを使ってもう1回Bloomできる。
 * LIMITED：ターンに1枚しか使えない。
 *
 * 実装: ドロー2枚＋ライフ4以下時の再Bloom（ctx.reBloom）。
 *   「このターンにDebutからBloomした1stホロメン」= bloomedTurn===turn かつ top が1st・直下(stack[1])がDebut。
 * LIMITED（ターン1枚制限）はエンジン側のサポート使用制御で処理される。
 */
export default {
  number: 'hBP06-090',
  ai: {
    // 純粋なドロー加速として中程度に評価（手札が薄いほど価値が上がる）
    supportValue({ player }) {
      return (player.hand?.length ?? 7) <= 4 ? 24 : 14;
    },
  },
  support: {
    *run(ctx) {
      ctx.draw(2);
      // その後、自分のライフが4以下なら、このターンにDebutからBloomした1stホロメン1人をもう1回Bloomできる
      if (ctx.player.life.length > 4) return;
      const matches = (e) => e.holomem.bloomedTurn === ctx.state.turn
        && e.top.bloomLevel === '1st'
        && e.holomem.stack[1]?.bloomLevel === 'Debut'
        && ctx.player.hand.some((c) => ctx.canReBloom(e.holomem, c));
      const valid = ctx.holomems('self', matches);
      if (valid.length === 0) return;
      const entry = valid.length === 1
        ? valid[0]
        : yield ctx.chooseHolomem({ side: 'self', filter: matches, title: 'もう1回Bloomする1stホロメンを選択', optional: true });
      if (!entry) return;
      yield* ctx.reBloom(entry.holomem, { title: `${entry.top.name} をもう1回Bloomするホロメンを選択`, optional: true });
    },
  },
};
