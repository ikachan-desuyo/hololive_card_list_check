/**
 * 鷹嶺ルイ (hBP08-067) ホロメン・紫・2nd・HP200（#JP #秘密結社holoX #トリ #お酒）
 * バトンタッチ: 無色
 *
 * [ブルームエフェクト] ヴァイオレットドミネーション:
 *   [センターポジション限定]自分の手札2枚をアーカイブできる：
 *   相手のステージのエール1枚を、相手のホロメンに付け替える。
 *   → センター限定（sourceHolomemPos().zone === 'center'）。
 *     コストは「自分の手札2枚をアーカイブ」=任意（「できる」）。手札が2枚以上必要。
 *     効果: 相手ステージの任意のエール1枚を、付いている先とは別の相手ホロメンへ付け替える（付け替え=別ホロメン必須）。
 *     付け替え先が無い（相手ホロメンが1人だけ、または相手ステージにエールが無い）なら発動できない。
 *     対象選択（どのエール・どこへ）はコントローラー（自分）が行う。
 *
 * [アーツ] 逆転の一手 (130+ / 紫紫紫 / 特攻:緑+50):
 *   自分の手札が2枚以下なら、このアーツ+50。自分の手札が0枚なら、かわりに、このアーツ+70。
 *   → dmgBonus(ctx): 手札0枚なら+70、1〜2枚なら+50、3枚以上なら0（0枚は「かわりに」なので+50ではなく+70）。
 *
 * 保留: なし（ブルームエフェクト・アーツとも全文実装）。
 */
export default {
  number: 'hBP08-067',

  bloomEffect: {
    name: 'ヴァイオレットドミネーション',
    *run(ctx) {
      // [センターポジション限定]
      if (ctx.sourceHolomemPos()?.zone !== 'center') return;

      // コスト: 自分の手札2枚をアーカイブできる（手札が2枚以上必要）
      if (ctx.player.hand.length < 2) {
        ctx.log('手札が2枚未満のため発動できない（ヴァイオレットドミネーション）');
        return;
      }

      // 効果対象が存在するかを先に確認（付け替え=別ホロメンへ移すので相手ホロメンが2人以上必要）
      const oppHolomems = ctx.holomems('opp');
      const withCheer = oppHolomems.filter((e) => (e.holomem.cheers || []).length > 0);
      if (oppHolomems.length < 2 || withCheer.length === 0) {
        ctx.log('付け替えできる相手のエールがいないため発動できない（ヴァイオレットドミネーション）');
        return;
      }

      const ok = yield ctx.confirm(
        'ブルームエフェクト「ヴァイオレットドミネーション」: 手札2枚をアーカイブして相手のエール1枚を付け替えますか？'
      );
      if (!ok) return;

      // コスト支払い: 手札から2枚を選んでアーカイブ
      const paid = yield ctx.chooseCards({
        cards: [...ctx.player.hand],
        count: 2,
        title: 'コスト: アーカイブする手札を選択（2枚）',
      });
      if (paid.length < 2) return; // 念のため（候補があるので通常は来ない）
      for (const picked of paid) {
        ctx.removeFromHand(picked);
        ctx.player.archive.push(picked);
        ctx.log(`${ctx.player.name}: ${picked.name} をアーカイブ`);
      }

      // どの相手ホロメンのエールを動かすか
      const fromEntry = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => (e.holomem.cheers || []).length > 0,
        title: '付け替えるエールが付いている相手ホロメンを選択',
      });
      if (!fromEntry) return;

      const cheer = yield ctx.chooseCard({
        cards: [...fromEntry.holomem.cheers],
        title: '付け替えるエールを選択',
      });
      if (!cheer) return;

      // 付け替え先（元のホロメンとは別の相手ホロメン）
      const toEntry = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.holomem !== fromEntry.holomem,
        title: 'エールの付け替え先（相手の別のホロメン）を選択',
      });
      if (!toEntry) return;

      ctx.moveCheer(cheer, fromEntry.holomem, toEntry.holomem);
    },
  },

  arts: {
    '逆転の一手': {
      dmgBonus(ctx) {
        const hand = ctx.player.hand.length;
        if (hand === 0) return 70; // 0枚なら「かわりに」+70
        if (hand <= 2) return 50;  // 2枚以下（1〜2枚）なら+50
        return 0;
      },
    },
  },
};
