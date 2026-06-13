/**
 * りっちしょこらのハンバーグ (hBP08-097) サポート・イベント（#食べ物）
 *
 * [サポート効果]:
 *   自分のステージのホロメン1人を選ぶ。選んだホロメンのHP20回復。
 *   その後、自分のアーカイブに#食べ物を持つイベントが2枚以上あるなら、
 *   自分のアーカイブのエール1枚をそのホロメンに送る。
 *
 *   自分の〈りっちしょこらのハンバーグ〉はターンに1回しか使えない。
 *
 *   → 実装:
 *     ・ステージのホロメン1人を選択（yield ctx.chooseHolomem。強制＝必ず1人選ぶ）。
 *       選んだホロメンを HP20回復（ctx.heal）。
 *     ・「その後」: 自分のアーカイブの #食べ物 を持つイベント
 *       （kind==='support' && supportType==='イベント' かつ #食べ物）が 2枚以上 なら、
 *       自分のアーカイブのエール1枚（kind==='cheer'）をそのホロメンに送る
 *       （removeFromArchive → attachCheer）。エールが無ければ送らない。
 *       ※このカード自身は解決中は解決領域(revealed)にあり、解決後にアーカイブへ
 *         置かれる（engine 10.7.2.5.1.1）。よって自身はこのカウントに含まれない。
 *     ・「ターンに1回しか使えない」: ONCE_KEY を canUse で判定（使用済みなら使えない）、
 *       run の冒頭で markOncePerTurn して消費する（カード名単位の制限。同名複数枚で共有）。
 *
 * 保留: なし（全文 context.js のプリミティブで実装）。
 */
const FOOD_TAG = '食べ物';
const ONCE_KEY = 'hBP08-097_りっちしょこらのハンバーグ';

export default {
  number: 'hBP08-097',

  support: {
    // 〈りっちしょこらのハンバーグ〉はターンに1回しか使えない
    canUse(ctx) {
      // ステージにホロメンが1人もいなければ「選ぶ」ができない
      if (ctx.holomems('self').length === 0) return false;
      return !ctx.oncePerTurnUsed(ONCE_KEY);
    },
    *run(ctx) {
      // 「ターンに1回」制限を消費
      ctx.markOncePerTurn(ONCE_KEY);

      // 自分のステージのホロメン1人を選ぶ（強制）
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'HP20回復するホロメンを選択',
      });
      if (!target) return; // 念のため（候補不在）
      // 選んだホロメンのHP20回復
      ctx.heal(target.holomem, 20);

      // その後: アーカイブに #食べ物 を持つイベントが2枚以上あるなら、
      // アーカイブのエール1枚をそのホロメンに送る
      const foodEvents = ctx.player.archive.filter(
        (c) => c.kind === 'support' && c.supportType === 'イベント' && ctx.hasTag(c, FOOD_TAG));
      if (foodEvents.length < 2) {
        ctx.log(`アーカイブの#食べ物イベントが${foodEvents.length}枚（2枚未満）のためエールは送らない`);
        return;
      }
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) {
        ctx.log('アーカイブに送れるエールが無い');
        return;
      }
      const cheer = yield ctx.chooseCard({
        cards: cheers,
        title: `${target.top.name} に送るエールをアーカイブから選択`,
      });
      if (!cheer) return;
      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, target.holomem);
    },
  },
};
