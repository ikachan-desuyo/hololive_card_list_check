/**
 * さくらみこ (hSD16-005) 赤・Debut・HP100（#JP #0期生 #ベイビー）
 *
 * アーツ「桜風ランニング」(20):
 *   サイコロを1回振る。3か5なら、自分のデッキを1枚引く。
 *   → 「振る」=強制（confirm無し）。出目が3または5の時、デッキから1枚ドロー。
 *
 * 保留: なし
 */
export default {
  number: 'hSD16-005',
  arts: {
    '桜風ランニング': {
      *run(ctx) {
        const roll = (yield* ctx.rollDice());
        if (roll === 3 || roll === 5) {
          ctx.draw(1);
        }
      },
    },
  },
};
