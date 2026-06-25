/**
 * 沙花叉クロヱ (hBP06-055) 青・2nd・HP190（#JP #秘密結社holoX #海）
 * コラボエフェクト「ワンワーーン！！！」:
 *   自分の推しホロメンが〈紫咲シオン〉なら、相手のアーカイブのエール3枚を相手のセンターホロメンに送る。
 *   その後、自分のアーカイブのエール1枚を自分の〈紫咲シオン〉に送れる。
 *   ※「3枚を送る」=最大3枚（アーカイブにある分だけ）。どのエールを送るかは効果の使用者（自分）が選ぶ。
 * アーツ「二人で紡いだ魔法」(100+ / 青紫・特攻 赤+50):
 *   自分のデッキの上から4枚を公開する。公開したホロメン1枚につき、このアーツ+20。
 *   そして公開したカードをアーカイブする。その中にイベントがあるなら、自分のデッキを2枚引く。
 */
export default {
  number: 'hBP06-055',
  collabEffect: {
    name: 'ワンワーーン！！！',
    *run(ctx) {
      if (ctx.player.oshi?.name !== '紫咲シオン') return;

      // 相手のアーカイブのエール最大3枚を、相手のセンターホロメンに送る
      const oppCenter = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (oppCenter) {
        const cheers = ctx.opponent.archive.filter((c) => c.kind === 'cheer');
        const picked = yield ctx.chooseCards({
          cards: cheers,
          count: 3,
          title: '相手のセンターに送るエールを選択（相手のアーカイブから・最大3枚）',
        });
        for (const cheer of picked) {
          const idx = ctx.opponent.archive.indexOf(cheer);
          if (idx !== -1) ctx.opponent.archive.splice(idx, 1);
          ctx.attachCheer(cheer, oppCenter.holomem);
        }
      }

      // その後、自分のアーカイブのエール1枚を自分の〈紫咲シオン〉ホロメンに送れる（任意）
      const shionTargets = ctx.holomems('self', (e) => e.top.name === '紫咲シオン');
      const myCheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (shionTargets.length > 0 && myCheers.length > 0) {
        const cheer = yield ctx.chooseCard({
          cards: myCheers,
          title: '自分の〈紫咲シオン〉に送るエールを選択（アーカイブから・任意）',
          optional: true,
          skipLabel: '送らない',
        });
        if (cheer) {
          let dest = shionTargets[0];
          if (shionTargets.length > 1) {
            dest = yield ctx.chooseHolomem({
              side: 'self',
              filter: (e) => e.top.name === '紫咲シオン',
              title: 'エールを送る〈紫咲シオン〉を選択',
            });
          }
          if (dest) {
            ctx.removeFromArchive(cheer);
            ctx.attachCheer(cheer, dest.holomem);
          }
        }
      }
    },
  },
  arts: {
    '二人で紡いだ魔法': {
      *run(ctx) {
        const looked = ctx.lookTopDeck(4); // 解決領域(revealed)に置かれる＝公開
        if (looked.length === 0) return;
        for (const c of looked) ctx.flashReveal(c);

        // 公開したホロメン1枚につき このアーツ+20
        const holoCount = looked.filter((c) => c.kind === 'holomen').length;
        if (holoCount > 0) ctx.addArtBonus(holoCount * 20, '公開したホロメン');

        // 公開したカードにイベントがあるか判定
        const hasEvent = looked.some((c) => c.kind === 'support' && c.supportType === 'イベント');

        // 公開したカードを全てアーカイブする
        for (const c of looked) {
          ctx._unreveal(c);
          ctx.player.archive.push(c);
        }
        ctx.recordDeckArchive(looked.length);
        ctx.log(`公開した${looked.length}枚をアーカイブした`);

        // その中にイベントがあるなら、デッキを2枚引く
        if (hasEvent) ctx.draw(2);
      },
    },
  },
};
