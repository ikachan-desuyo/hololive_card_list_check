/**
 * FUWAMOCO (hBP08-003) 推しホロメン・赤・ライフ5
 *
 * 推しスキル「みんなの笑顔はモココが守る！」[ホロパワー：-2][ターンに1回]:
 *   自分のステージに赤エールがあるなら、自分のアーカイブの#Adventを持つホロメン1枚を手札に戻す。
 *   青エールがあるなら、自分のアーカイブのエール1枚を自分の#Adventを持つホロメンに送る。
 *   → メインステップの能動型推しスキル（oshiSkill）として実装。
 *     ステージ上のエール色は ctx.ownStageCheerColors() で判定。
 *     2つの条件は独立（「赤なら…青なら…」）。赤・青両方あれば両方処理する。
 *     - 赤条件: アーカイブの #Advent ホロメンカード（kind==='holomen' かつ tag 'Advent'）から1枚選び手札へ。
 *               候補が無ければ何もしない。
 *     - 青条件: アーカイブのエール1枚を選び、自分のステージの #Advent ホロメンへ送る。
 *               エールが無い／送り先の #Advent ホロメンが居なければ何もしない。
 *     コスト[ホロパワー：-2]はエンジン側で処理するため run には書かない。
 *     [ターンに1回]もエンジンの oshiSkill 経路（usedOshiSkillThisTurn）が管理する。
 *
 * 保留: なし（推しスキル全文を実装）。
 */
export default {
  number: 'hBP08-003',

  // 推しステージスキル「準備は出来てるよね！」:
  //   自分の[〈フワワ・アビスガード〉と〈モココ・アビスガード〉]に付いている赤エールすべては、
  //   青エールとしても扱う（常時）。アーツのコスト判定で赤エールが青コストも満たせる。
  oshiStageSkill: {
    name: '準備は出来てるよね！',
    cheerColorAlias(holomem, cheer, engine) {
      // 〈フワワ〉〈モココ〉= 名称参照（FUWAMOCO の別名「として扱う」も対象）
      const top = holomem.stack[0];
      const isFuwaMoco = engine
        ? (engine._nameIs(top, 'フワワ・アビスガード') || engine._nameIs(top, 'モココ・アビスガード'))
        : (top.name === 'フワワ・アビスガード' || top.name === 'モココ・アビスガード');
      if (!isFuwaMoco) return [];
      return cheer.color === '赤' ? ['青'] : [];
    },
  },

  oshiSkill: {
    name: 'みんなの笑顔はモココが守る！',
    canUse(engine, ownerIdx) {
      const ctxColors = new Set();
      const p = engine.state.players[ownerIdx];
      for (const pos of engine._stagePositions(p)) {
        const h = engine._holomemAt(p, pos);
        for (const cheer of h.cheers) {
          if (cheer.color) ctxColors.add(cheer.color);
        }
      }
      const hasRed = ctxColors.has('赤');
      const hasBlue = ctxColors.has('青');
      // 赤: アーカイブに #Advent ホロメンが居る / 青: アーカイブにエールが有り、かつステージに #Advent ホロメンが居る
      const redOk = hasRed &&
        p.archive.some((c) => c.kind === 'holomen' && (c.tags || []).includes('Advent'));
      const blueOk = hasBlue &&
        p.archive.some((c) => c.kind === 'cheer') &&
        engine._stagePositions(p).some((pos) => {
          const top = engine._holomemAt(p, pos).stack[0];
          return (top.tags || []).includes('Advent');
        });
      return redOk || blueOk;
    },
    *run(ctx) {
      const colors = ctx.ownStageCheerColors();
      const hasRed = colors.includes('赤');
      const hasBlue = colors.includes('青');

      // 赤エールがあるなら：アーカイブの #Advent ホロメン1枚を手札に戻す
      if (hasRed) {
        const advHolomems = ctx.player.archive.filter(
          (c) => c.kind === 'holomen' && (c.tags || []).includes('Advent'));
        if (advHolomems.length > 0) {
          const picked = yield ctx.chooseCard({
            cards: advHolomems,
            title: 'アーカイブから手札に戻す#Adventホロメンを選択',
          });
          if (picked) {
            ctx.removeFromArchive(picked);
            ctx.player.hand.push(picked);
            ctx.log(`${picked.name} を手札に戻した`);
          }
        } else {
          ctx.log('アーカイブに#Adventホロメンがいない');
        }
      }

      // 青エールがあるなら：アーカイブのエール1枚を自分の #Advent ホロメンに送る
      if (hasBlue) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        const hasAdventTarget = ctx.holomems('self',
          ({ top }) => (top.tags || []).includes('Advent')).length > 0;
        if (cheers.length > 0 && hasAdventTarget) {
          const picked = yield ctx.chooseCard({
            cards: cheers,
            title: 'アーカイブから送るエールを選択',
          });
          if (picked) {
            const entry = yield ctx.chooseHolomem({
              side: 'self',
              filter: ({ top }) => (top.tags || []).includes('Advent'),
              title: 'エールを送る#Adventホロメンを選択',
            });
            if (entry) {
              ctx.removeFromArchive(picked);
              ctx.attachCheer(picked, entry.holomem);
            }
          }
        } else {
          ctx.log('アーカイブのエールを送れる#Adventホロメンがいない');
        }
      }
    },
  },
};
