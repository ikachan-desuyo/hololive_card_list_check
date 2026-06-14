/**
 * 角巻わためのハープ (hBP05-084) サポート・ツール
 *
 * テキスト:
 *   このツールが付いているホロメンのアーツ+10。
 *   ◆2nd以上の〈角巻わため〉に付いていたら能力追加:
 *     ■自分のステージに〈わためいと〉がある間、このツールが付いているホロメンのアーツ+10。
 *     ■このツールが付いているホロメンがアーツを使った時、自分のアーカイブのエール1枚を
 *       自分の〈角巻わため〉に送れる。
 *   ツールは、自分のホロメン1人につき1枚だけ付けられる（エンジンの装着ルールで担保）。
 *
 * 実装:
 *  - attached.artsPlus で常時アーツ+10。
 *    付け先が「2nd の〈角巻わため〉」のときは追加判定を行い、自分のステージに〈わためいと〉
 *    （＝いずれかの自分ホロメンに付いたファン）が1枚でもあれば さらに +10（合計+20）。
 *    「2nd以上」= このゲームの最大ブルームレベルが 2nd のため bloomLevel === '2nd' で判定。
 *  - 「このツールが付いているホロメンがアーツを使った時、自分のアーカイブのエール1枚を
 *     自分の〈角巻わため〉に送れる」部分は triggers.onArtsUse で実装。
 *     engine.js の afterAllDamage が、アーツを使ったホロメンの装着カードの triggers.onArtsUse も
 *     走査して発火するようになった（ctx.sourceHolomem=ホスト, ctx.sourceCard=このツール。hBP01-119 参照）。
 *     ◆能力なので付け先が 2nd の〈角巻わため〉のときのみ発動。送り先は自分の〈角巻わため〉に限定。
 *     アーカイブのエール1枚を chooseCard（任意・optional）で選び、送り先を chooseHolomem で選んで
 *     removeFromArchive → attachCheer する（hBP02-021 アーツと同じ「アーカイブのエールを送る」処理）。
 */
export default {
  number: 'hBP05-084',
  attached: {
    artsPlus(holomem, engine) {
      let plus = 10; // 常時アーツ+10
      const top = holomem.stack[0];
      // ◆2nd以上の〈角巻わため〉に付いていたら能力追加
      if (top.name === '角巻わため' && top.bloomLevel === '2nd') {
        // 付け先（＝このツールが付いているホロメン）の持ち主を特定し、その自分ステージを見る
        const owner = engine.state.players.find(
          (p) => engine._stageHolomems(p).includes(holomem));
        if (owner) {
          // 自分のステージに〈わためいと〉がある間（いずれかの自分ホロメンに付いたファン）
          const hasWatameito = engine._stageHolomems(owner).some(
            (h) => (h.attachments || []).some((a) => a.name === 'わためいと'));
          if (hasWatameito) plus += 10;
        }
      }
      return plus;
    },
  },
  triggers: {
    // ◆2nd以上の〈角巻わため〉に付いていたら: ホストがアーツを使った時、
    //   自分のアーカイブのエール1枚を自分の〈角巻わため〉に送れる
    *onArtsUse(ctx) {
      const host = ctx.sourceHolomem; // このツールが付いているホロメン
      const top = host?.stack[0];
      if (!top || top.name !== '角巻わため' || top.bloomLevel !== '2nd') return;
      // 送れるエールが無ければ何もしない
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;
      // 送り先候補: 自分のステージの〈角巻わため〉
      const watameTargets = ctx.holomems('self', (e) => e.holomem.stack[0].name === '角巻わため');
      if (watameTargets.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cheers,
        title: 'アーカイブから〈角巻わため〉に送るエールを選択（任意）',
        optional: true,
        skipLabel: '送らない',
      });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem.stack[0].name === '角巻わため',
        title: 'エールを送る〈角巻わため〉を選択',
      });
      if (target) {
        ctx.removeFromArchive(picked);
        ctx.attachCheer(picked, target.holomem);
      }
    },
  },
};
