/**
 * ネリッサ・レイヴンクロフト (hBP05-006) 推しホロメン 紫 ライフ5
 *
 * 推しスキル「Liebesträume」[ホロパワー：-1][ターンに1回]:
 *   このターンの間、自分の#歌を持つ[センターホロメンとコラボホロメン]のアーツ+10。
 *   → oshiSkill（能動）。artsPlus ターン修正を付与し、match で「自分のステージの
 *     センター/コラボにいる #歌 ホロメン」に動的適用する（位置やBloomが変わっても評価時に再判定）。
 *     ターン終了で自動消滅。
 *
 * SP推しスキル「Shoot for the Moon」[ホロパワー：-4][ゲームに1回]:
 *   このゲームの間、自分の〈ネリッサ・レイヴンクロフト〉全員のアーツに必要な無色-1。
 *   → spOshiSkill。kind:'artCostReduce'（色=無色, amount=1）の修正を duration/untilTurn 無しで
 *     state.modifiers に積む＝ゲーム終了まで残る恒常修正。match で「持ち主のステージにいる
 *     〈ネリッサ・レイヴンクロフト〉名のホロメン」に限定する（_effectiveArtCost が参照）。
 *
 * 保留: なし
 */
export default {
  number: 'hBP05-006',

  // 推しスキル: このターンの間、自分の#歌のセンター/コラボのアーツ+10
  oshiSkill: {
    name: 'Liebesträume',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // #歌を持つセンター/コラボがいる時だけ意味がある
      const frontline = [p.center, p.collab].filter(Boolean);
      return frontline.some((h) => (h.stack[0].tags || []).includes('歌'));
    },
    *run(ctx) {
      const me = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 10,
        ownerIdx: me,
        match: (h) => {
          const p = ctx.engine.state.players[me];
          // 自分のセンター/コラボにいる #歌 ホロメンであること
          const isFrontline = p.center === h || p.collab === h;
          return isFrontline && (h.stack[0].tags || []).includes('歌');
        },
        description: 'このターンの間、自分の#歌のセンター/コラボのアーツ+10',
      });
    },
  },

  // SP推しスキル: このゲームの間、自分の〈ネリッサ・レイヴンクロフト〉全員のアーツ必要無色-1
  spOshiSkill: {
    name: 'Shoot for the Moon',
    canUse(engine, ownerIdx) {
      return true; // 常に使える（ステージにネリッサが今いなくても、以後出すホロメンにも効くため）
    },
    *run(ctx) {
      const me = ctx.playerIdx;
      // duration/untilTurn を付けない＝ターン終了でもエンドステップでも消えない＝ゲーム終了まで持続。
      ctx.engine.state.modifiers.push({
        kind: 'artCostReduce',
        ownerIdx: me,
        color: '無色',
        amount: 1,
        match: (h) => h.stack[0].name === 'ネリッサ・レイヴンクロフト',
        description: 'このゲームの間、自分の〈ネリッサ・レイヴンクロフト〉全員のアーツ必要無色-1',
      });
      ctx.log('Shoot for the Moon: このゲームの間、自分の〈ネリッサ・レイヴンクロフト〉全員のアーツ必要無色-1');
    },
  },
};
