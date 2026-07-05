/**
 * 音乃瀬奏 1st (hBP03-082) 黄・HP160（#DEV_IS #ReGLOSS #歌）
 * ブルームエフェクト「ここが私のステージだから！」:
 *   自分のステージのエール1～2枚を、このホロメンに付け替えられる。
 *   （「付け替えられる」=任意。1枚または2枚まで。付け替え元はステージ上の任意のホロメン。）
 * アーツ「ぷにぷにじゃないっ」(60): テキスト効果なし（ダメージのみ）。
 */
export default {
  number: 'hBP03-082',
  bloomEffect: {
    name: 'ここが私のステージだから！',
    *run(ctx) {
      const dest = ctx.sourceHolomem;
      // 付け替え元の候補＝エールが付いている「dest（このホロメン）以外の」ホロメン。
      // 付け替え元にこのホロメン自身は選べない（奏が1人だけなら付け替え不可。Q338）。
      const hasMovable = () =>
        ctx.holomems('self').some((e) => e.holomem !== dest && e.holomem.cheers.length > 0);
      if (!hasMovable()) return;

      // 最大2枚まで、1枚ずつ任意のホロメンから選んで dest に付け替える
      for (let moved = 0; moved < 2; moved++) {
        if (!hasMovable()) break;
        const promptTitle =
          moved === 0
            ? '付け替えるエールを選択（1～2枚／任意）'
            : 'さらにもう1枚付け替えますか？（任意）';
        // 付け替え元のホロメンを選択（任意。1枚目はキャンセルで実行しない）
        const fromEntry = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.holomem !== dest && e.holomem.cheers.length > 0,
          title: promptTitle,
          optional: true,
        });
        if (!fromEntry) break;
        const fromHolomem = fromEntry.holomem;
        const cheer = yield ctx.chooseCard({
          cards: fromHolomem.cheers,
          title: `${fromHolomem.stack[0].name} から付け替えるエールを選択`,
        });
        if (!cheer) break;
        ctx.moveCheer(cheer, fromHolomem, dest);
      }
    },
  },
  arts: {
    // 「ぷにぷにじゃないっ」(60): テキスト効果なし。ダメージはエンジンが処理する。
  },
};
