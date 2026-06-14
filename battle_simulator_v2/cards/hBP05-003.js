/**
 * 尾丸ポルカ (hBP05-003) 推しホロメン 赤 ライフ5
 *
 * 推しスキル「ポルカの伝説」[ホロパワー：-2][ターンに1回]:
 *   自分の手札が自分のステージの〈座員〉の枚数と同じになるまで、自分のデッキを引く。
 *   ただし、引ける枚数は4枚まで。
 *   → 〈座員〉= name "座員" のカード（hBP01-126, サポート・ファン）。
 *     自分のステージ（センター/コラボ/バック）の全ホロメンに付いている「座員」装着カードの総枚数を数える。
 *     目標手札枚数 = その座員枚数。現在の手札がそれより少なければ差分だけドロー（最大4枚、デッキ切れで打ち止め）。
 *     手札が既に目標以上なら0枚（「まで」=0可）。
 *
 * SP推しスキル「成功体験－！！！」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキの上から7枚を見る。その中から、[〈尾丸ポルカ〉とスタッフ]1枚ずつを公開し、
 *   公開した[〈尾丸ポルカ〉とスタッフ]を手札に加える。そして残ったカードをアーカイブする。
 *   → 〈尾丸ポルカ〉= name "尾丸ポルカ"。スタッフ = card_type サポート・スタッフ（c.kind==='support' && c.supportType==='スタッフ'）。
 *     見た7枚から、尾丸ポルカを1枚、スタッフを1枚（それぞれ複数あればプレイヤーが選択／無ければ加えない）を
 *     公開して手札に加え、残り全てをアーカイブする。
 *     ※コスト表記はテキスト上 [ホロパワー：-2] だが、SP推しスキルのコストはエンジン側で
 *       カードDBの値から解決されるため、ここでは効果本体のみ記述する。
 */

const isZain = (card) => card.name === '座員';
const isStaff = (card) => card.kind === 'support' && card.supportType === 'スタッフ';

export default {
  number: 'hBP05-003',

  // 推しスキル「ポルカの伝説」: ステージの〈座員〉枚数まで手札を満たすようドロー（最大4枚）
  oshiSkill: {
    *run(ctx) {
      // 自分のステージ全ホロメンに付いている「座員」の総枚数
      let zainCount = 0;
      for (const { holomem } of ctx.holomems('self')) {
        zainCount += holomem.attachments.filter(isZain).length;
      }
      const need = zainCount - ctx.player.hand.length; // 目標手札枚数との差
      const drawN = Math.max(0, Math.min(need, 4));     // 「まで」=0可、上限4枚
      ctx.log(`ポルカの伝説: 〈座員〉${zainCount}枚 / 手札${ctx.player.hand.length}枚 → ${drawN}枚ドロー`);
      if (drawN > 0) ctx.draw(drawN);
    },
  },

  // SP推しスキル「成功体験－！！！」: デッキ上7枚から尾丸ポルカ1枚＋スタッフ1枚を手札に、残りはアーカイブ
  spOshiSkill: {
    *run(ctx) {
      const looked = ctx.lookTopDeck(7);

      // 〈尾丸ポルカ〉1枚（複数あれば選択、なければ加えない）
      const polkas = looked.filter((c) => c.name === '尾丸ポルカ');
      if (polkas.length > 0) {
        let polka = polkas[0];
        if (polkas.length > 1) {
          polka = yield ctx.chooseCard({
            cards: polkas,
            title: '手札に加える〈尾丸ポルカ〉を選択',
            displayCards: looked,
          });
        }
        if (polka) {
          const i = looked.indexOf(polka);
          if (i !== -1) looked.splice(i, 1);
          ctx.flashReveal(polka);
          ctx.addToHand(polka); // _unreveal + 公開ログ
        }
      }

      // スタッフ1枚（複数あれば選択、なければ加えない）
      const staffs = looked.filter(isStaff);
      if (staffs.length > 0) {
        let staff = staffs[0];
        if (staffs.length > 1) {
          staff = yield ctx.chooseCard({
            cards: staffs,
            title: '手札に加えるスタッフを選択',
            displayCards: looked,
          });
        }
        if (staff) {
          const i = looked.indexOf(staff);
          if (i !== -1) looked.splice(i, 1);
          ctx.flashReveal(staff);
          ctx.addToHand(staff);
        }
      }

      // 残ったカードをアーカイブする
      for (const card of looked) {
        ctx._unreveal(card);
        ctx.player.archive.push(card);
      }
      if (looked.length > 0) ctx.log(`成功体験－！！！: 残り${looked.length}枚をアーカイブ`);
      ctx.recordDeckArchive(looked.length);
    },
  },
};
