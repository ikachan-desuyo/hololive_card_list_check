/**
 * AZKi（推しホロメン hSD01-002）
 * SP推しスキル「右手にマイク」[ホロパワー：-3][ゲームに1回]:
 *   自分のアーカイブのエールを自分の緑ホロメン1人に好きな枚数送る。
 *
 * 推しスキル「左手に地図」[ホロパワー：-3][ターンに1回]:
 *   自分のホロメンの能力でサイコロを振る時に使える：サイコロの目1つを宣言し、次に出る目を宣言した目として扱う。
 *   → oshiSkill で実装。目（1～6）を宣言し、ターン修正 kind:'diceFixed'(once:true) を積む。
 *     次の能力ダイスロールが rollDice でその目に置き換えられ、一発で消費される。
 *     （「振る時に使える」を、振る前に宣言しておく能動形で近似。出目を宣言値にする効果は同じ）
 */
export default {
  number: 'hSD01-002',
  oshiSkill: {
    name: '左手に地図',
    *run(ctx) {
      const value = yield {
        kind: 'confirm', player: ctx.playerIdx,
        title: 'サイコロの目を宣言（次に能力で振る目をこの目として扱う）',
        buildOptions: () => [1, 2, 3, 4, 5, 6].map((n) => ({ id: `dice${n}`, label: `${n}`, value: n })),
      };
      if (!value) return;
      ctx.addTurnModifier({
        kind: 'diceFixed', once: true, value, ownerIdx: ctx.playerIdx,
        description: `左手に地図: 次のサイコロを${value}として扱う`,
      });
    },
  },
  spOshiSkill: {
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.color === '緑',
        title: 'エールを送る緑ホロメンを選択',
      });
      if (!entry) return;
      while (true) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: 'アーカイブから送るエールを選択（好きな枚数）',
          optional: true,
          skipLabel: '終了する',
        });
        if (!picked) break;
        ctx.removeFromArchive(picked);
        ctx.attachCheer(picked, entry.holomem);
      }
    },
  },
};
