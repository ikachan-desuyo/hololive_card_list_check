/**
 * 音乃瀬奏 (hBP08-079) ホロメン・黄・1st・HP170（#DEV_IS #ReGLOSS #歌）
 * バトンタッチ: 無色
 *
 * キーワード/ギフト「黎明の歌姫」:
 *   自分のステージに#ReGLOSSを持つ2ndホロメンがいるなら、このホロメンのHP+50。
 *   → auraHpPlus（src===target のときのみ＝自身のHP修正）。
 *     条件は「自分のステージ全体」に #ReGLOSS かつ bloomLevel==='2nd' のホロメンが
 *     1人でもいるか。src の持ち主のステージを engine._stageHolomems で走査して判定する
 *     （src 自身は1stなので 2nd 条件には該当しない。他のホロメンが対象）。
 *     条件を満たせば +50、満たさなければ 0。
 *
 * アーツ「清廉なる歌声」(10/any):
 *   自分のアーカイブのエール1枚を自分の#ReGLOSSを持つセンターホロメンに送れる。
 *   → 「送れる」＝任意効果。送り先は自分の#ReGLOSSを持つセンターホロメン（通常は1人）。
 *     送り先が居ない／アーカイブにエールが無いなら何もしない。
 *     アーカイブのエール1枚をプレイヤーに選ばせてセンターへ送る（任意なので skip 可）。
 *     ダメージ10はdmgで処理されるためrunでは扱わない。
 *
 * 保留: なし（ギフト・アーツとも全文を context.js / 常時アウラで実装）。
 */
function hasReglossSecond(stageHolomems) {
  return stageHolomems.some((h) => {
    const top = h.stack[0];
    return top && top.bloomLevel === '2nd' && (top.tags || []).includes('ReGLOSS');
  });
}

export default {
  number: 'hBP08-079',

  // ■自分のステージに#ReGLOSSを持つ2ndホロメンがいるなら、このホロメンのHP+50
  auraHpPlus(src, target, engine) {
    if (src !== target) return 0; // 「このホロメンのHP」= 自分自身のみ
    const owner = engine.state.players.find((p) => engine._stageHolomems(p).includes(src));
    if (!owner) return 0;
    return hasReglossSecond(engine._stageHolomems(owner)) ? 50 : 0;
  },

  arts: {
    '清廉なる歌声': {
      *run(ctx) {
        // 送り先候補: 自分の#ReGLOSSを持つセンターホロメン
        const centers = ctx.holomems('self', (e) => e.pos.zone === 'center' && ctx.hasTag(e.top, 'ReGLOSS'));
        if (centers.length === 0) {
          ctx.log('#ReGLOSSを持つセンターホロメンがいない');
          return;
        }
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) {
          ctx.log('アーカイブに送れるエールがない');
          return;
        }
        // 「送れる」= 任意。エールを選ぶ（選ばない可）
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: 'アーカイブから#ReGLOSSセンターに送るエールを選択',
          optional: true,
          skipLabel: '送らない',
        });
        if (!picked) return;
        // 送り先（通常はセンター1人。複数該当はないが念のため選択フローを通す）
        const dest = centers.length === 1
          ? centers[0]
          : yield ctx.chooseHolomem({
              side: 'self',
              filter: (e) => e.pos.zone === 'center' && ctx.hasTag(e.top, 'ReGLOSS'),
              title: 'エールを送るセンターホロメンを選択',
            });
        if (!dest) return;
        ctx.removeFromArchive(picked);
        ctx.attachCheer(picked, dest.holomem);
      },
    },
  },
};
