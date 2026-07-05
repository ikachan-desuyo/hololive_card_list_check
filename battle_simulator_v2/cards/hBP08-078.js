/**
 * 音乃瀬奏 (hBP08-078) 黄・Debut・HP100
 * コラボエフェクト「楽しい月曜日だよー！！！！！！！！」:
 *   自分のステージの#歌を持つ2ndホロメン1人を選ぶ。このターンの間、選んだホロメンのアーツ+20。
 *   → collabEffect。自分のステージの「bloomLevel==='2nd' かつ #歌タグ持ち」のホロメン1人を選び、
 *     artsPlus +20 のターン修正を付与する（エンドステップで自動消滅）。対象がいなければ効果なし。
 * アーツ「れろれろれろれろ」(20): 効果テキスト無し（素点のみ）。
 *
 * 保留: なし
 */
export default {
  number: 'hBP08-078',

  collabEffect: {
    name: '楽しい月曜日だよー！！！！！！！！',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.bloomLevel === '2nd' && ctx.hasTag(e.top, '歌'),
        title: 'アーツ+20する自分の#歌を持つ2ndホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name}（#歌・2nd）のアーツ+20`,
      });
    },
  },
};
