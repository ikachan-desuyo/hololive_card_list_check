/**
 * 猫又おかゆ (hBP05-045) 青・2nd・HP200（#ゲーマーズ）
 * アーツ「僕のコト、大好きになってみない？」(120): 相手のホロメン1人に特殊ダメージ20を与える。
 *   その後、自分のアーカイブのエール1枚を自分の#ゲーマーズを持つバックホロメンに送れる。
 * ※キーワード「自分らしく居られる場所」(ギフト・特殊ダメージ+20の常時アウラ)は
 *   他ホロメンを恒常強化するアウラ機構が未対応のため未実装（CARD_EFFECT_STATUS.md §8）。
 */
export default {
  number: 'hBP05-045',
  arts: {
    '僕のコト、大好きになってみない？': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({ side: 'opp', title: '特殊ダメージ20を与える相手ホロメンを選択' });
        if (target) ctx.dealSpecialDamage(target, 20);
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        const backs = ctx.holomems('self', (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, 'ゲーマーズ'));
        if (cheers.length === 0 || backs.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: cheers, title: '送るエールを選択（アーカイブ・任意）', optional: true, skipLabel: '送らない',
        });
        if (!picked) return;
        const dest = yield ctx.chooseHolomem({
          side: 'self', filter: (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, 'ゲーマーズ'),
          title: 'エールを送る #ゲーマーズ のバックホロメンを選択',
        });
        if (dest) { ctx.removeFromArchive(picked); ctx.attachCheer(picked, dest.holomem); }
      },
    },
  },
};
