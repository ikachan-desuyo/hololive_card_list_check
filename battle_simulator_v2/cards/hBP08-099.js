/**
 * HOLOTORI (hBP08-099) サポート・イベント
 *
 * [サポート効果] 以下の能力から1つを選んで使う。
 *   ■A: 自分の#トリを持つホロメンのエール1枚をアーカイブする。
 *        アーカイブしたなら、自分のデッキを2枚引いた後、手札1枚をデッキの下に戻す。
 *   ■B: 自分のアーカイブのエール1枚を自分の#トリを持つホロメンに送る。
 *   自分の〈HOLOTORI〉はターンに1回しか使えない。
 *
 * 解釈:
 * - 「ターンに1回しか使えない」= 同名カード〈HOLOTORI〉の使用はターンに1回まで。
 *   oncePerTurnUsed/markOncePerTurn で名前キー 'HOLOTORI' に対して制限する（canUseで使用済みなら不可）。
 * - 「1つを選んで使う」= 2能力からの選択（強制。どちらかは必ず使う）。confirm で A/B を選ばせる。
 *   ただし実行可能な能力が片方しか無い場合はそちらに限定して提示する（canUseで少なくとも片方が可能なことを担保）。
 * - 能力A:
 *   - 対象は「#トリを持つ自分のホロメンのエール」。アーカイブするエールは強制で1枚。
 *   - 「アーカイブしたなら」= 実際にエールをアーカイブできた時のみ、デッキを2枚引き、その後手札1枚をデッキの下に戻す。
 *     引いた後の手札が0枚（あり得ないが念のため）なら戻さない。戻すカードはプレイヤーが選ぶ。
 *   - archiveCheer はコスト置換を提示するジェネレータなので yield* で呼ぶ。
 * - 能力B:
 *   - 自分のアーカイブのエール1枚を、#トリを持つ自分のホロメン1人に送る（強制で1枚）。
 *   - 送り先が複数いれば選択。アーカイブのエールが複数あれば選択。
 *
 * 保留: なし（両能力とも全文実装）。
 */
const CARD_NAME = 'HOLOTORI';
const ONCE_KEY = 'support:HOLOTORI';

function toriWithCheer(ctx) {
  // #トリを持ち、エールが1枚以上付いている自分のホロメン
  return ctx.holomems('self', (e) => ctx.hasTag(e.top, 'トリ') && e.holomem.cheers.length > 0);
}
function toriHolomems(ctx) {
  return ctx.holomems('self', (e) => ctx.hasTag(e.top, 'トリ'));
}

export default {
  number: 'hBP08-099',
  support: {
    canUse(ctx) {
      // ターンに1回しか使えない（同名）
      if (ctx.oncePerTurnUsed(ONCE_KEY)) return false;
      // 能力Aが可能か: #トリホロメンのエールをアーカイブできる
      const canA = toriWithCheer(ctx).length > 0;
      // 能力Bが可能か: アーカイブにエールがあり、送り先の#トリホロメンがいる
      const canB = ctx.player.archive.some((c) => c.kind === 'cheer') && toriHolomems(ctx).length > 0;
      return canA || canB;
    },
    *run(ctx) {
      ctx.markOncePerTurn(ONCE_KEY);

      const canA = toriWithCheer(ctx).length > 0;
      const canB = ctx.player.archive.some((c) => c.kind === 'cheer') && toriHolomems(ctx).length > 0;

      // どちらの能力を使うか選ぶ（両方可能なときのみ確認）
      let useA;
      if (canA && canB) {
        useA = yield ctx.confirm(
          `${CARD_NAME}: 使う能力を選択`,
          '能力A（トリのエールをアーカイブ→2枚引き→1枚をデッキ下へ）',
          '能力B（アーカイブのエール1枚をトリに送る）',
        );
      } else {
        useA = canA; // 片方しか実行できない場合はそちらに確定
      }

      if (useA) {
        // ■A: #トリホロメンのエール1枚をアーカイブ
        const entries = [];
        for (const e of toriWithCheer(ctx)) {
          for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
        }
        if (entries.length === 0) return; // 念のため
        const picked = yield ctx.chooseCard({
          cards: entries.map((e) => e.cheer),
          title: 'アーカイブする#トリホロメンのエールを選択',
        });
        if (!picked) return;
        yield* ctx.archiveCheer(entries.find((e) => e.cheer === picked).from, picked);

        // アーカイブしたなら: デッキを2枚引いた後、手札1枚をデッキの下に戻す
        ctx.draw(2);
        if (ctx.player.hand.length === 0) return;
        const back = yield ctx.chooseCard({
          cards: [...ctx.player.hand],
          title: 'デッキの下に戻す手札を選択',
        });
        if (!back) return;
        ctx.removeFromHand(back);
        ctx.deckToBottom([back]);
        ctx.log(`${ctx.player.name}: 手札の ${back.name} をデッキの下に戻した`);
      } else {
        // ■B: アーカイブのエール1枚を#トリホロメンに送る
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) return;
        const cheer = yield ctx.chooseCard({
          cards: cheers,
          title: '#トリホロメンに送るエールを選択（アーカイブ）',
        });
        if (!cheer) return;
        const targets = toriHolomems(ctx);
        if (targets.length === 0) return;
        const dest = targets.length === 1
          ? targets[0]
          : yield ctx.chooseHolomem({
              side: 'self',
              filter: (e) => ctx.hasTag(e.top, 'トリ'),
              title: 'エールを送る#トリホロメンを選択',
            });
        if (!dest) return;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, dest.holomem);
      }
    },
  },
};
