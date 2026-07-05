/**
 * アキ・ローゼンタールの斧 (hBP05-082) サポート・ツール
 *
 * [サポート効果]
 *  ■このカードは、自分の手札1枚か自分のステージの〈石の斧〉1枚をアーカイブしなければ使えない。
 *    → 付ける（プレイする）ための必須コスト。
 *      支払い可能性は support.canUse でガードし、実際の支払いは triggers.onAttach で行う。
 *      （エンジンの supportAttach 適用フローは support.run を呼ばず、triggers.onAttach のみ発火するため）
 *      ・コスト判定はこのカードを手札から取り除いた後（=付けた時点）の状態で行う。
 *        canUse はカードがまだ手札にある時点で評価されるので、
 *        「手札にこのカード以外が1枚以上ある（hand.length>=2）」または
 *        「自分のステージに〈石の斧〉が1枚以上付いている」ことを条件にする。
 *      ・支払いはプレイヤーが選択（手札のカード1枚 か ステージの〈石の斧〉1枚）。
 *
 *  ■このツールが付いているホロメンのアーツ+10。
 *    → attached.artsPlus で常時 +10。
 *
 *  ◆2nd以上の〈アキ・ローゼンタール〉に付いていたら能力追加
 *    このツールが付いているホロメンのアーツ+40。
 *    → 付け先のトップカードが名前〈アキ・ローゼンタール〉かつ bloomLevel が '2nd'（=2nd以上の最上位）なら
 *      さらに +40（合計 +50）。Spot は bloom 進行外なので「2nd以上」に含めない。
 *
 *  ■ツールは、自分のホロメン1人につき1枚だけ付けられる。
 *    → エンジン既定の付け上限（_canAttachSupport）で担保。attachRule 不要。
 *
 * 保留: なし
 */

const isStoneAxe = (c) => c.name === '石の斧';

// 自分のステージに付いている〈石の斧〉(ツール)を {holomem, axe} のリストで列挙
function stageStoneAxes(ctx) {
  const out = [];
  for (const { holomem } of ctx.holomems('self')) {
    for (const att of holomem.attachments || []) {
      if (att.supportType === 'ツール' && isStoneAxe(att)) out.push({ holomem, axe: att });
    }
  }
  return out;
}

export default {
  number: 'hBP05-082',

  support: {
    canUse(ctx) {
      // コストは「付けた後」に支払う。canUse 時点ではこのカードはまだ手札にあるので、
      // 「手札にこのカード以外が1枚以上ある」または「ステージに〈石の斧〉がある」ことを要求する。
      const otherHand = ctx.player.hand.length >= 2;
      const hasAxe = stageStoneAxes(ctx).length > 0;
      return otherHand || hasAxe;
    },
  },

  triggers: {
    // 付けた時にコストを支払う（必須コスト）。手札1枚 か ステージの〈石の斧〉1枚をアーカイブ。
    *onAttach(ctx) {
      const p = ctx.player;
      const handCards = [...p.hand]; // 付けた時点なのでこのカード自身は既に手札に無い
      const axes = stageStoneAxes(ctx);

      // 支払い候補（手札のカード / ステージの〈石の斧〉）をまとめて1つの選択肢にする
      const options = [
        ...handCards.map((c) => ({ type: 'hand', card: c })),
        ...axes.map((a) => ({ type: 'axe', card: a.axe, holomem: a.holomem })),
      ];
      if (options.length === 0) {
        ctx.log('アキ・ローゼンタールの斧: アーカイブできるコストが無い');
        return;
      }

      const picked = yield ctx.chooseCard({
        cards: options.map((o) => o.card),
        title: 'コスト: 手札1枚 か ステージの〈石の斧〉1枚をアーカイブ',
      });
      if (!picked) {
        // 必須コストだが念のため：候補があるのに未選択なら先頭を支払う
        const fb = options[0];
        if (fb.type === 'hand') { ctx.removeFromHand(fb.card); p.archive.push(fb.card); }
        else { const i = fb.holomem.attachments.indexOf(fb.card); if (i !== -1) fb.holomem.attachments.splice(i, 1); p.archive.push(fb.card); }
        ctx.log(`アキ・ローゼンタールの斧 コスト: ${fb.card.name} をアーカイブ`);
        return;
      }

      const opt = options.find((o) => o.card === picked);
      if (opt.type === 'hand') {
        ctx.removeFromHand(opt.card);
        p.archive.push(opt.card);
        ctx.log(`アキ・ローゼンタールの斧 コスト: 手札の ${opt.card.name} をアーカイブ`);
      } else {
        const i = opt.holomem.attachments.indexOf(opt.card);
        if (i !== -1) opt.holomem.attachments.splice(i, 1);
        p.archive.push(opt.card);
        ctx.log(`アキ・ローゼンタールの斧 コスト: ステージの〈石の斧〉をアーカイブ`);
      }
    },
  },

  attached: {
    // 付いているホロメンのアーツ+10。付け先が 2nd の〈アキ・ローゼンタール〉なら さらに +40。
    artsPlus(holomem) {
      const top = holomem.stack[0];
      let bonus = 10;
      if (top && top.name === 'アキ・ローゼンタール' && top.bloomLevel === '2nd') {
        bonus += 40;
      }
      return bonus;
    },
  },

  ai: {
    // 付けるためのコスト（手札1枚 か 石の斧）が払える前提で、攻撃補強として一定の価値。
    supportValue({ player }) {
      const otherHand = player.hand.length >= 2;
      const hasAxe = [player.center, player.collab, ...(player.back || [])]
        .filter(Boolean)
        .some((h) => (h.attachments || []).some((a) => a.supportType === 'ツール' && a.name === '石の斧'));
      if (!otherHand && !hasAxe) return 0;
      return 14;
    },
  },
};
