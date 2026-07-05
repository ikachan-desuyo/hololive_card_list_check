/**
 * ライブスタッフ (hBP07-091) サポート・スタッフ
 *
 * [サポート効果] このカードは、自分のステージのエール1枚をアーカイブしなければ使えない。
 *   自分のアーカイブのファン1枚を自分のホロメンに付ける。
 *   付けたなら、自分のアーカイブのホロメン1枚を手札に戻す。
 *
 * 解釈:
 * - コスト「ステージのエール1枚をアーカイブ」は必須。ステージにエールが1枚も無ければ使えない（canUse）。
 * - 「付ける」は強制効果。アーカイブにファンがあり付けられるホロメンがいる限り付ける。
 *   （付け先ルール／装着上限は _canAttachSupport が判定。ファンは色マスコット/ツールと違い基本制限なし）
 * - 「付けたなら」= ファンを実際に付けたときのみ、アーカイブのホロメン1枚を手札に戻す。
 *   アーカイブにファンが無い／付けられるホロメンがいない場合は、エールのコストだけ払って終了する
 *   （コストは「使うために」払うものなので、本文が空振りでも返却はしない）。
 */
export default {
  number: 'hBP07-091',
  support: {
    canUse(ctx) {
      // コスト: 自分のステージにエールが1枚以上あること
      return ctx.holomems('self').some((e) => e.holomem.cheers.length > 0);
    },
    *run(ctx) {
      // --- コスト: ステージのエール1枚をアーカイブ ---
      const cheerEntries = [];
      for (const e of ctx.holomems('self')) {
        for (const cheer of e.holomem.cheers) cheerEntries.push({ cheer, from: e.holomem });
      }
      if (cheerEntries.length === 0) return; // 念のため（canUseで担保済み）
      const pickedCheer = yield ctx.chooseCard({
        cards: cheerEntries.map((e) => e.cheer),
        title: 'アーカイブするエールを選択（コスト）',
      });
      if (!pickedCheer) return;
      yield* ctx.archiveCheer(cheerEntries.find((e) => e.cheer === pickedCheer).from, pickedCheer);

      // --- 本文: アーカイブのファン1枚を自分のホロメンに付ける ---
      const fans = ctx.player.archive.filter(
        (c) => c.kind === 'support' && c.supportType === 'ファン');
      if (fans.length === 0) return;
      const fan = yield ctx.chooseCard({
        cards: fans,
        title: '付けるファンを選択（アーカイブ）',
      });
      if (!fan) return;
      // 付けられるホロメン（付け先ルール・装着上限を尊重）
      const targets = ctx.holomems('self', (e) => ctx.engine._canAttachSupport(e.holomem, fan));
      if (targets.length === 0) return;
      const dest = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._canAttachSupport(e.holomem, fan),
        title: `${fan.name} を付けるホロメンを選択`,
      });
      if (!dest) return;
      ctx.removeFromArchive(fan);
      // アーカイブから付けるので「付けた時」トリガーも誘発する
      yield* ctx.attachSupportWithTrigger(fan, dest.holomem);

      // --- 付けたなら: アーカイブのホロメン1枚を手札に戻す ---
      const holos = ctx.player.archive.filter((c) => c.kind === 'holomen');
      if (holos.length === 0) return;
      const back = yield ctx.chooseCard({
        cards: holos,
        title: '手札に戻すホロメンを選択（アーカイブ）',
      });
      if (!back) return;
      ctx.removeFromArchive(back);
      ctx.addToHand(back);
    },
  },
};
