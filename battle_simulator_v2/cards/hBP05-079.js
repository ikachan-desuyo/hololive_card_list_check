/**
 * み俺恥 (hBP05-079) サポート・イベント・LIMITED
 * 効果: 自分のデッキを2枚引く。その後、直前の相手のターンに自分のホロメンがダウンしていて、
 *   かつ自分のライフが相手のライフより少ないなら、アーカイブのエール1枚を自分のホロメン1人に送る。
 *   - 「直前の相手のターンにダウン」= ctx.player.downedCardsLastOppTurn（hBP06-088 と同じ機構）。
 *   - 「ライフが相手より少ない」= ctx.player.life.length < ctx.opponent.life.length。
 *   - 条件分岐は run 時に判定（ドロー2枚は条件に関係なく必ず行う）。
 *   - エール送付は、アーカイブにエールがあり、かつ自分のホロメンがいる場合のみ実行（強制効果だが対象が無ければ何もしない）。
 * LIMITED：ターンに1枚しか使えない（engine 側で c.limited を制御）。
 *
 * 保留: なし
 */
export default {
  number: 'hBP05-079',
  support: {
    *run(ctx) {
      // まずデッキを2枚引く（無条件）
      ctx.draw(2);

      // その後の条件判定
      const downedLastOppTurn = (ctx.player.downedCardsLastOppTurn || []).length > 0;
      const lifeBehind = ctx.player.life.length < ctx.opponent.life.length;
      if (!downedLastOppTurn || !lifeBehind) return;

      // アーカイブのエール1枚を自分のホロメン1人に送る
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) {
        ctx.log('アーカイブにエールが無いためエールを送れない');
        return;
      }
      if (ctx.holomems('self').length === 0) {
        ctx.log('自分のホロメンがいないためエールを送れない');
        return;
      }

      const cheer = yield ctx.chooseCard({
        cards: cheers,
        title: '自分のホロメンに送るエールをアーカイブから選択',
      });
      if (!cheer) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールを送るホロメンを選択',
      });
      if (!target) return;
      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, target.holomem);
    },
  },
};
