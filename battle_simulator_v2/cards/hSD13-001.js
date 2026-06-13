/**
 * エリザベス・ローズ・ブラッドフレイム (hSD13-001) 推しホロメン・赤
 *
 * 推しスキル「秩序の先駆者」[ホロパワー：-3][ターンに1回]:
 *   自分のホロメン1人が相手からアーツダメージを受ける時、自分のステージの[Buzzか2nd]の
 *   赤ホロメン1人を選べる：そのダメージを、選んだホロメンがかわりに受ける。
 *   → 「アーツダメージを受ける時」に割り込んでダメージ対象を変更する
 *     タイミング割り込み型の推しスキル。エンジンに被ダメージ割り込み／対象変更の
 *     機構が無いため未実装（保留）。
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

  // 推しスキル「秩序の先駆者」は被アーツダメージの割り込み（対象変更）型のため未実装（保留）

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
      if (!ctx.putToBack(picked)) return; // 上限などで出せなければ終了
      // 出したホロメン（バック末尾に追加された）を取得
      const target = ctx.player.back[ctx.player.back.length - 1];

      // その後、アーカイブのエール1～5枚をそのホロメンに送る（最低1枚・最大5枚）
      for (let i = 0; i < 5; i++) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const cheer = yield ctx.chooseCard({
          cards: cheers,
          title: `${picked.name} に送るエールをアーカイブから選択 (${i + 1}/5枚目)`,
          optional: i > 0, // 1枚目は必須、2枚目以降は任意
          skipLabel: 'ここまでにする',
        });
        if (!cheer) break;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, target);
      }
    },
  },
};
