/**
 * ムーナびと (hBP06-101) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で実装。
 *
 * ◆〈ムーナ・ホシノヴァ〉に付いていたら能力追加
 *   [ターンに1回]このマスコットが付いているホロメンが相手のホロメンに特殊ダメージを与えた時、
 *   自分のアーカイブの青エール1枚を自分のバックホロメンに送れる。
 *   → triggers.onSpecialDamageDealt で実装。engine が dealSpecialDamage 時に発生源の装着カードへ発火する。
 *     ホスト（ムーナ）が相手に特殊ダメージを与えた時、[ターンに1回]アーカイブの青エール1枚をバックへ送れる（任意）。
 *
 * マスコットは自分のホロメン1人につき1枚だけ付けられる（エンジン既定のマスコット制限で処理）。
 */
export default {
  number: 'hBP06-101',
  attached: {
    // [サポート効果] 付いているホロメンのHP+20
    hpPlus() { return 20; },
  },
  triggers: {
    // ◆〈ムーナ・ホシノヴァ〉に付いていたら: ホストが相手に特殊ダメージを与えた時、[ターン1回]アーカイブの青エール1枚をバックへ送れる
    *onSpecialDamageDealt(ctx) {
      const host = ctx.sourceHolomem; // 特殊ダメージを与えたホスト
      if (host?.stack[0].name !== 'ムーナ・ホシノヴァ') return;
      if (ctx.oncePerTurnUsed('hBP06-101:cheer')) return; // [ターンに1回]
      const blues = ctx.player.archive.filter((c) => c.kind === 'cheer' && c.color === '青');
      const backs = ctx.holomems('self', (e) => e.pos.zone === 'back');
      if (blues.length === 0 || backs.length === 0) return;
      const cheer = yield ctx.chooseCard({ cards: blues, title: 'バックに送る青エールをアーカイブから選択', optional: true });
      if (!cheer) return;
      const target = yield ctx.chooseHolomem({ side: 'self', filter: (e) => e.pos.zone === 'back', title: '青エールを送るバックホロメンを選択' });
      if (!target) return;
      ctx.markOncePerTurn('hBP06-101:cheer');
      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, target.holomem);
    },
  },
};
