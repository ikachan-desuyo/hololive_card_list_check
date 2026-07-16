/**
 * パヴォリア・レイネ (hBP08-033) ホロメン・緑・2nd・HP190（#ID #ID2期生 #トリ #絵）
 *
 * [コラボエフェクト] 監視者の眼差し:
 *   自分のエールデッキから、エール1枚を自分の#IDを持つホロメンに送る。
 *   そしてエールデッキをシャッフルする。
 *   → 「エールデッキから…そしてシャッフルする」はデッキ内から任意の1枚を選ぶサーチ（hBP02-023 と同型）。
 *     非公開領域のサーチなので「見つからなかったことにする」を選べる（総合ルール 4.1.2.3 → optional）。
 *     送り先は #ID を持つ自分のホロメン1人（プレイヤー選択）。最後にエールデッキをシャッフル。
 *     送り先が居ない／エールデッキが空なら何もしない。
 *
 * [アーツ] ノックアウト・ツイスト (140):
 *   自分のアーカイブのエール1～2枚を自分の〈パヴォリア・レイネ〉1人に送る。
 *   → 送り先は名称〈パヴォリア・レイネ〉の自分のホロメン1人（複数バージョン含む）をプレイヤーが選ぶ。
 *     その1人に、アーカイブのエールを1～2枚送る（アーカイブの枚数が上限）。1枚目は必須、2枚目は任意。
 *     アーカイブにエールが無い／送り先が居ないなら何もしない。
 *     特攻〔青+50〕とダメージ140はアイコン/dmgで処理されるためrunでは扱わない。
 *
 * 保留: なし（全文 context.js のプリミティブで実装）。
 */
const REINE = 'パヴォリア・レイネ';

export default {
  number: 'hBP08-033',

  collabEffect: {
    name: '監視者の眼差し',
    *run(ctx) {
      if (ctx.player.cheerDeck.length === 0) {
        ctx.log('エールデッキにエールがない');
        return;
      }
      const targets = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'ID'));
      if (targets.length === 0) {
        ctx.log('#IDを持つホロメンがいない');
        return;
      }
      // エールデッキ内から送るエール1枚を選ぶ（非公開領域のサーチ＝見つからなかったことにできる）
      const picked = yield ctx.chooseCard({
        cards: ctx.player.cheerDeck,
        title: 'エールデッキから送るエールを選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        const dest = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'ID'),
          title: 'エールを送る#IDホロメンを選択',
        });
        if (dest) {
          ctx.removeFromCheerDeck(picked);
          ctx.log(`${ctx.player.name}: エールデッキから ${picked.name} を公開`);
          ctx.flashReveal(picked);
          ctx.attachCheer(picked, dest.holomem);
        }
      }
      ctx.shuffleCheerDeck();
    },
  },

  arts: {
    'ノックアウト・ツイスト': {
      *run(ctx) {
        // 送り先候補: 自分の〈パヴォリア・レイネ〉（複数バージョン含む）
        const reineTargets = ctx.holomems('self', (e) => ctx.nameIs(e.top, REINE));
        if (reineTargets.length === 0) {
          ctx.log('〈パヴォリア・レイネ〉がいない');
          return;
        }
        if (ctx.player.archive.filter((c) => c.kind === 'cheer').length === 0) {
          ctx.log('アーカイブに送れるエールがない');
          return;
        }
        const dest = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.nameIs(e.top, REINE),
          title: 'アーカイブのエールを送る〈パヴォリア・レイネ〉を選択',
        });
        if (!dest) return;
        // アーカイブのエールを1～2枚まとめて送る（最低1枚・最大2枚）
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        const picked = yield ctx.chooseCards({
          cards: cheers,
          min: 1,
          max: 2,
          title: 'アーカイブから送るエールを選択（1～2枚）',
        });
        for (const cheer of picked) {
          ctx.removeFromArchive(cheer);
          ctx.attachCheer(cheer, dest.holomem);
        }
      },
    },
  },
};
