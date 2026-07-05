/**
 * パヴォリア・レイネ (hBP08-030) 緑・Debut・HP130（#ID #ID2期生 #トリ #絵）
 *
 * [コラボエフェクト] 一歩ずつ:
 *   自分の手札の#ID2期生を持つホロメン1枚をアーカイブできる:
 *   自分のエールデッキの上から1枚を自分のバックホロメンに送る。
 *   → 「アーカイブできる:」=任意のコスト。コスト(手札の#ID2期生ホロメン1枚をアーカイブ)を
 *      支払えた場合のみ効果(エールデッキ上1枚をバックホロメンに送る)を実行する。
 *   → 送り先は「バックホロメン」限定。バックにホロメンが居なければ送れない（その場合はコストを払わない）。
 *
 * [アーツ] 以後　お見知りおきを… (10): 追加効果なし（固定10ダメージ）。アーツ定義は不要のため記述しない。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-030',
  collabEffect: {
    name: '一歩ずつ',
    *run(ctx) {
      // コスト候補: 手札の #ID2期生 を持つホロメンカード
      const handCandidates = ctx.player.hand.filter(
        (c) => c.kind === 'holomen' && ctx.hasTag(c, 'ID2期生'),
      );
      if (handCandidates.length === 0) return;

      // 送り先候補: 自分のバックポジションのホロメン（居なければ効果が成立しないので発動しない）
      const backTargets = ctx.holomems('self', (e) => e.pos.zone === 'back');
      if (backTargets.length === 0) return;

      const ok = yield ctx.confirm(
        '手札の#ID2期生ホロメン1枚をアーカイブして、エールデッキの上から1枚をバックホロメンに送りますか？',
      );
      if (!ok) return;

      // コスト支払い: 手札の #ID2期生 ホロメン1枚をアーカイブ
      const picked = yield ctx.chooseCard({
        cards: handCandidates,
        title: 'アーカイブする手札の#ID2期生ホロメンを選択',
      });
      if (!picked) return;
      ctx.removeFromHand(picked);
      ctx.player.archive.push(picked);
      ctx.log(`${ctx.player.name}: ${picked.name}（#ID2期生）を手札からアーカイブ`);

      // 効果: エールデッキの上から1枚を自分のバックホロメンに送る
      const dest = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back',
        title: 'エールを送るバックホロメンを選択',
      });
      if (!dest) return;
      ctx.sendCheerFromCheerDeckTop(dest.holomem);
    },
  },
};
