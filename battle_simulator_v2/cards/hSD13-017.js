/**
 * JUSTICE, JUST LIKE THAT!!!! (hSD13-017) サポート・イベント・LIMITED
 *
 * [サポート効果] このカードは、自分のステージのホロメン全員が#Justiceを持つホロメンでなければ使えない。
 *   自分のステージのホロメン1人を選ぶ。選んだホロメンに重なっているホロメン1～2枚を手札に戻す。
 *   このターンの間、この能力で戻したホロメン1枚につき、選んだホロメンのアーツ+20。
 * LIMITED：ターンに1枚しか使えない。（LIMITED制限はエンジンが処理）
 *
 * 実装方針:
 *   - 使用条件 canUse: ステージにホロメンが1人以上いて、全員が#Justiceを持ち、
 *     かつ「重なっているホロメン(stack[1..])」が1枚以上あるホロメンが存在すること
 *     （「1～2枚を手札に戻す」は0枚不可＝必須なので、戻せる対象が無ければ使えない扱いにする）。
 *   - 対象選択: 重なっているホロメンが1枚以上いる自分のホロメン1人を選ぶ。
 *   - 「1～2枚」=必ず1枚、最大2枚を手札に戻す（「まで」ではないので最低1枚）。
 *     1枚目は必須、重なりが2枚以上ある場合のみ2枚目を任意で戻せる。
 *   - 戻した枚数 × 20 を、このターンの間そのホロメンのアーツ+（addTurnModifier match=対象ホロメン同一性）。
 *   ※「重なっているホロメン」= stack.slice(1)（Bloomで下に重なったホロメンカード）。stack[0]は最上段。
 */
export default {
  number: 'hSD13-017',
  support: {
    canUse(ctx) {
      const stage = ctx.holomems('self');
      if (stage.length === 0) return false;
      // ステージのホロメン全員が #Justice を持つ
      if (!stage.every((e) => ctx.hasTag(e.top, 'Justice'))) return false;
      // 重なっているホロメンが1枚以上いるホロメンが存在する（最低1枚戻せること）
      return stage.some((e) => e.holomem.stack.length > 1);
    },
    *run(ctx) {
      // 重なっているホロメンが1枚以上いる自分のホロメンから選ぶ
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem.stack.length > 1,
        title: '重なっているホロメンを手札に戻すホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;

      let returned = 0;
      // 1枚目（必須）
      const first = yield ctx.chooseCard({
        cards: chosen.stack.slice(1),
        title: '手札に戻す重なっているホロメンを選択（1枚目）',
      });
      if (first) {
        const idx = chosen.stack.indexOf(first);
        if (idx !== -1) {
          chosen.stack.splice(idx, 1);
          ctx.addToHand(first, { reveal: false });
          ctx.log(`${first.name} を手札に戻した`);
          returned++;
        }
      }

      // 2枚目（任意。重なりがまだ残っている場合のみ）
      const remaining = chosen.stack.slice(1);
      if (returned >= 1 && remaining.length > 0) {
        const second = yield ctx.chooseCard({
          cards: remaining,
          title: '手札に戻す重なっているホロメンを選択（2枚目・任意）',
          optional: true,
          skipLabel: '戻さない',
        });
        if (second) {
          const idx = chosen.stack.indexOf(second);
          if (idx !== -1) {
            chosen.stack.splice(idx, 1);
            ctx.addToHand(second, { reveal: false });
            ctx.log(`${second.name} を手札に戻した`);
            returned++;
          }
        }
      }

      if (returned > 0) {
        const amount = returned * 20;
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount,
          ownerIdx: ctx.playerIdx,
          match: (h) => h === chosen,
          description: `このターン、${chosen.stack[0].name} のアーツ+${amount}（戻したホロメン${returned}枚）`,
        });
      }
    },
  },
};
