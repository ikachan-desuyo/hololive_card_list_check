/**
 * IRyS (hBP08-001) 推しホロメン・白・ライフ5
 *
 * 推しスキル「ネフィリムの祝福」[ホロパワー：-2][ターンに1回]:
 *   自分のステージのホロメン1人を選ぶ。このターンの間、選んだホロメンのアーツ+20。
 *   選んだホロメンに紫エールが付いているなら、かわりに、そのホロメンのアーツ+50。
 *   → メインステップの能動推しスキル（oshiSkill）。コスト[ホロパワー：-2]と
 *     [ターンに1回]はエンジンが処理するので run では支払わない。
 *     紫エールの有無は「選んだホロメン」自身の cheers を判定（addTurnModifier 付与時に確定）。
 *
 * SP推しスキル「HOPE and DESPAIR」[ホロパワー：-2][ゲームに1回]:
 *   自分の〈IRyS〉全員のエール1枚につき、自分のデッキを1枚引く。その後、
 *   自分の〈IRyS〉全員の紫エール1枚につき、自分のデッキの上から1枚をホロパワーにする。
 *   → spOshiSkill（能動）。コスト[ホロパワー：-2]・[ゲームに1回]はエンジンが処理する。
 *     〈IRyS〉= 名前が「IRyS」のホロメン（自分のステージ）。
 *     エール総数ぶんドロー → 紫エール総数ぶんデッキトップをホロパワーへ。
 *     （ホロパワーへの移動は context に専用プリミティブが無いため
 *      エンジンと同じく deck.shift() → holoPower.push() で直接処理する）
 *
 * 保留: なし（両スキルとも実装済み）。
 */
const NAME = 'IRyS';
const PURPLE = '紫';

export default {
  number: 'hBP08-001',

  oshiSkill: {
    name: 'ネフィリムの祝福',
    canUse(engine, ownerIdx) {
      // ステージにホロメンが1人以上いること
      return engine._stageHolomems(engine.state.players[ownerIdx]).length > 0;
    },
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'アーツを上げるホロメンを選ぶ',
      });
      if (!target) return;
      const chosen = target.holomem;
      // 選んだホロメンに紫エールが付いているなら +50、それ以外は +20
      const hasPurple = chosen.cheers.some((c) => c.color === PURPLE);
      const amount = hasPurple ? 50 : 20;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${target.top.name} のアーツ+${amount}`,
      });
    },
  },

  spOshiSkill: {
    name: 'HOPE and DESPAIR',
    *run(ctx) {
      // 自分の〈IRyS〉全員のエール枚数・紫エール枚数を数える
      const iryses = ctx.holomems('self', (e) => ctx.nameIs(e.top, NAME));
      let cheerTotal = 0;
      let purpleTotal = 0;
      for (const { holomem } of iryses) {
        cheerTotal += holomem.cheers.length;
        purpleTotal += holomem.cheers.filter((c) => c.color === PURPLE).length;
      }

      // エール1枚につきデッキを1枚引く
      ctx.log(`${ctx.player.name}: 〈${NAME}〉のエール${cheerTotal}枚ぶんドロー`);
      if (cheerTotal > 0) ctx.draw(cheerTotal);

      // その後、紫エール1枚につきデッキの上から1枚をホロパワーにする
      if (purpleTotal > 0) {
        let moved = 0;
        for (let i = 0; i < purpleTotal && ctx.player.deck.length > 0; i++) {
          ctx.player.holoPower.push(ctx.player.deck.shift());
          moved++;
        }
        ctx.log(`${ctx.player.name}: 〈${NAME}〉の紫エール${purpleTotal}枚ぶん、デッキの上から${moved}枚をホロパワーへ`);
      }
    },
  },
};
