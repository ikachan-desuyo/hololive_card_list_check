/**
 * セシリア・イマーグリーン (hBP08-023) 緑・1st・HP150（#EN #Justice #語学）
 *
 * ブルームエフェクト「一緒に居てくれる時間」:
 *   このホロメンをお休みさせることができる。その後、自分のお休みしている#Justiceを持つ
 *   ホロメンが2人以上いるなら、自分のホロメン1人のHP50回復。
 *   → bloomEffect。
 *     ・前段は任意（「できる」）。ctx.confirm で「お休みさせる」を選んだら sourceHolomem.rested=true。
 *       （お休みは holomem.rested を直接立てる確立済みパターン。hBP04-055 と同じ）
 *     ・後段「その後」: 自分のステージで rested かつ #Justice を持つホロメンが2人以上なら、
 *       自分のホロメン1人を選んでHP50回復（heal）。回復先は任意ではなく必須（候補がいれば必ず1人選ぶ）。
 *       ※お休みさせたこのホロメン自身も #Justice 持ちなので2人以上のカウントに含まれる。
 *     ・条件を満たさない（お休みJusticeが1人以下）なら回復はしない。
 *
 * アーツ「とってもとっても特別！」(40):
 *   追加効果テキスト無し（素点40のみ）。エンジンが処理するため arts 定義は不要。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-023',

  bloomEffect: {
    name: '一緒に居てくれる時間',
    *run(ctx) {
      const self = ctx.sourceHolomem;
      // 前段: このホロメンをお休みさせることができる（任意）
      if (self && !self.rested) {
        const rest = yield ctx.confirm(
          'このホロメンをお休みさせる？（一緒に居てくれる時間）',
          'お休みさせる',
          'お休みさせない',
        );
        if (rest) {
          self.rested = true;
          ctx.log(`${self.stack[0].name} をお休みさせた`);
        }
      }

      // 後段: 自分のお休みしている#Justiceを持つホロメンが2人以上いるなら回復
      const restingJustice = ctx.holomems(
        'self',
        (e) => e.holomem.rested && ctx.hasTag(e.top, 'Justice'),
      );
      if (restingJustice.length < 2) return;

      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'HP50回復する自分のホロメンを選択（一緒に居てくれる時間）',
      });
      if (target) ctx.heal(target.holomem, 50);
    },
  },
};
