/**
 * セシリア・イマーグリーン (hBP04-030) 緑・1st・HP130（EN / Justice / 語学）
 * ブルームエフェクト「こんな旋律思いついたの」:
 *   自分のステージのエール1～2枚を選び、自分のホロメンに割り振って付け替えられる。
 *   →「できる」=任意。「1～2枚」=1枚目を選んだら2枚目は任意（0枚もありうるが「1～2枚」なので
 *     最低1枚を勧める形。skip可）。「割り振って」=各エールごとに付け替え先ホロメンを個別に選べる
 *     （別々のホロメンへ付け替え可）。付け先は自分のホロメンならどれでもよい。
 * アーツ「聞いてくれる？」(dmg:50): テキスト効果なし（実装不要）。
 */
export default {
  number: 'hBP04-030',
  bloomEffect: {
    name: 'こんな旋律思いついたの',
    *run(ctx) {
      // エールを1枚選んで付け替えるサブフローを最大2回
      const moveOne = function* (ordinal, optional) {
        // ステージ上の全エールを毎回列挙（前の付け替えを反映）
        const entries = [];
        for (const e of ctx.holomems('self')) {
          for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
        }
        if (entries.length === 0) return false;
        const picked = yield ctx.chooseCard({
          cards: entries.map((e) => e.cheer),
          title: `付け替えるエールを選択（${ordinal}枚目）`,
          optional,
          skipLabel: ordinal === 1 ? '付け替えない' : 'ここまでにする',
        });
        if (!picked) return false;
        const from = entries.find((e) => e.cheer === picked).from;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: '付け替え先の自分のホロメンを選択',
          optional: true,
        });
        if (!target) return false;
        ctx.moveCheer(picked, from, target.holomem);
        return true;
      };

      // 1枚目（任意：そもそも付け替えなくてもよい）
      const did1 = yield* moveOne(1, true);
      if (!did1) return;
      // 2枚目（1～2枚なので任意）
      yield* moveOne(2, true);
    },
  },
};
