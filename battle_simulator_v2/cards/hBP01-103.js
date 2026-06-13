/**
 * ゲーミングパソコン (hBP01-103) サポート・アイテム・LIMITED
 *
 * [サポート効果] このカードは、自分のホロパワー1枚をアーカイブしなければ使えない。
 *   → 必須コスト。ホロパワーが1枚以上ないと使えない（canUse でガード）。run の冒頭で
 *     ホロパワーの上から1枚をアーカイブして支払う。
 * 自分のデッキから、自分の推しホロメンと同色のBuzz以外の[Debutホロメンか1stホロメン]1枚を
 * 公開し、手札に加える。そしてデッキをシャッフルする。
 *   → 推しホロメンの色（ctx.player.oshi.color）と同色で、Buzzでない Debut/1st ホロメンをサーチ。
 *     ホロライブOCGの推しホロメンは単色なので color の完全一致で判定する。
 * LIMITED：ターンに1枚しか使えない（エンジンが card.limited で処理）。
 *
 * 注: ホロパワー専用プリミティブは context.js に無いため、ホロパワー領域
 *     (ctx.player.holoPower) を直接操作している（カードは常にいずれかの領域に属する＝保存則を満たす）。
 */
export default {
  number: 'hBP01-103',
  ai: {
    // 推しと同色のBuzz以外Debut/1stがデッキに残っていて、ホロパワーを1枚払えるなら価値
    supportValue({ engine, player }) {
      const oshiColor = player.oshi?.color;
      if (!oshiColor || player.holoPower.length < 1) return 0;
      const hits = player.deck.some((c) =>
        c.kind === 'holomen' &&
        (c.bloomLevel === 'Debut' || c.bloomLevel === '1st') &&
        !c.buzz &&
        c.color === oshiColor);
      return hits ? 24 : 0;
    },
  },
  support: {
    canUse(ctx) {
      // ホロパワー1枚をアーカイブできなければ使えない
      return ctx.player.holoPower.length >= 1 && !!ctx.player.oshi?.color;
    },
    *run(ctx) {
      const p = ctx.player;
      // コスト: ホロパワーの上から1枚をアーカイブ
      if (p.holoPower.length < 1) return;
      const paid = p.holoPower.shift();
      p.archive.push(paid);
      ctx.log(`${p.name}: ホロパワー1枚をアーカイブ（${paid.name}）`);

      const oshiColor = p.oshi?.color;
      if (!oshiColor) {
        ctx.shuffleDeck();
        return;
      }
      // 推しと同色のBuzz以外のDebut/1stホロメンをサーチ
      const candidates = ctx.deckCards((c) =>
        c.kind === 'holomen' &&
        (c.bloomLevel === 'Debut' || c.bloomLevel === '1st') &&
        !c.buzz &&
        c.color === oshiColor);
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: `手札に加える${oshiColor}のBuzz以外のDebut/1stホロメンを選択`,
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
