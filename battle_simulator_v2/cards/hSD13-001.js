/**
 * エリザベス・ローズ・ブラッドフレイム (hSD13-001) 推しホロメン・赤
 *
 * 推しスキル「秩序の先駆者」[ホロパワー：-3][ターンに1回]:
 *   自分のホロメン1人が相手からアーツダメージを受ける時、自分のステージの[Buzzか2nd]の
 *   赤ホロメン1人を選べる：そのダメージを、選んだホロメンがかわりに受ける。
 *   → 「アーツダメージを受ける時」に割り込んで受け手を差し替える割り込み推しスキル。
 *     onDamageOshiSkill.redirect（generatorで選んだホロメンを返す）で実装。
 *     エンジンは _offerDamageOshiSkill の after に redirectTo を渡し、算出済みのダメージ値を
 *     その受け手へ移す（特攻/軽減は元の対象基準で確定済みの「そのダメージ」を移し替える）。
 *     redirect は kind==='arts' のときのみ提示される（特殊ダメージには出ない）。
 *
 * SP推しスキル「JUST LIKE THAT」[ホロパワー：-3][ゲームに1回]:
 *   自分のアーカイブの#Justiceを持つホロメン1枚をステージに出す。その後、自分のアーカイブの
 *   エール1～5枚をそのホロメンに送る。
 *   → spOshiSkill（能動）。アーカイブの #Justice ホロメン1枚をバックに出し（ステージ上限6まで）、
 *     その後アーカイブのエール1～5枚を、出したホロメン1人に送る（「1～5枚」=最低1枚・最大5枚）。
 *     コスト[ホロパワー：-3]と[ゲームに1回]制限はエンジンが処理するため run には書かない。
 */
export default {
  number: 'hSD13-001',

  // 推しスキル「秩序の先駆者」[ホロパワー：-3][ターンに1回]:
  //   自分のホロメンが相手からアーツダメージを受ける時、[Buzzか2nd]の赤ホロメン1人にかわりに受けさせる。
  onDamageOshiSkill: {
    cost: 3,
    title: '推しスキル「秩序の先駆者」: このアーツダメージを[Buzzか2nd]の赤ホロメン1人にかわりに受けさせますか？',
    canUse(engine, defIdx) {
      const p = engine.state.players[defIdx];
      // 受け手候補（自分のステージの[Buzzか2nd]の赤ホロメン）が1人以上いること
      return engine._stageHolomems(p).some((h) => {
        const top = h.stack[0];
        // 「赤ホロメン」= 赤を持つ（多色・全色扱い対応の _hasColor で判定）
        return engine._hasColor(h, '赤') && (top.bloomLevel === 'Buzz' || top.bloomLevel === '2nd');
      });
    },
    *redirect(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => {
          // 「赤ホロメン」= 赤を持つ（多色・全色扱い対応の _hasColor で判定）
          const isRed = ctx.engine._hasColor(e.holomem, '赤');
          return isRed && (e.top.bloomLevel === 'Buzz' || e.top.bloomLevel === '2nd');
        },
        title: 'かわりにダメージを受ける[Buzzか2nd]の赤ホロメンを選択',
      });
      return entry ? entry.holomem : null; // 選んだホロメンを返す（= 新しい受け手）
    },
  },

  spOshiSkill: {
    name: 'JUST LIKE THAT',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // アーカイブに #Justice ホロメンがいて、ステージに空きがあること
      const hasJustice = p.archive.some(
        (c) => c.kind === 'holomen' && (c.tags || []).includes('Justice'));
      if (!hasJustice) return false;
      return engine._stageCount(p) < 6;
    },
    *run(ctx) {
      if (ctx.engine._stageCount(ctx.player) >= 6) return; // ステージ上限
      // アーカイブの #Justice ホロメン1枚を選んでステージ（バック）に出す
      const cand = ctx.player.archive.filter(
        (c) => c.kind === 'holomen' && ctx.hasTag(c, 'Justice'));
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'ステージに出す#Justiceホロメンを選択',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      // バックに出し、「ステージに出た時」の onEnter（セシリア「正義の旋律」等）も誘発する
      const target = yield* ctx.putToBackWithTrigger(picked);
      if (!target) return; // 上限などで出せなければ終了

      // その後、アーカイブのエール1～5枚をそのホロメンに送る（最低1枚・最大5枚）。一括選択
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      const pickedCheers = yield ctx.chooseCards({
        cards: cheers,
        min: 1,
        max: 5,
        title: `${picked.name} に送るエールをアーカイブから選択（1～5枚）`,
      });
      for (const cheer of pickedCheers) {
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, target);
      }
    },
  },
};
