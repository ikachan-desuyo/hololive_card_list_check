/**
 * 鈍器でぶっ叩くわよ！ (hBP01-110) サポート・イベント・LIMITED
 *
 * [サポート効果] サイコロを1回振る：3以下の時、相手のホロメンのエール1枚をアーカイブする。
 *   → 本ファイルではこの基本効果のみを実装する。
 *
 * ◆自分の推しホロメンが〈七詩ムメイ〉の時、能力変更可能
 *   [ゲームに1回] 相手のセンターホロメンのエール2枚をアーカイブする。
 *   → 推しが〈七詩ムメイ〉かつ未使用（ゲームに1回）なら、基本効果のかわりにこの能力を使うか確認する。
 *     「ゲームに1回」は player._gameOnce['hBP01-110'] フラグで管理（ターンをまたいで永続）。
 *
 * LIMITED（ターンに1枚しか使えない）はエンジン側で処理する。
 */
export default {
  number: 'hBP01-110',
  ai: {
    // 相手のエールを剥がす妨害（サイコロ依存なので控えめな固定評価）
    supportValue() {
      return 8;
    },
  },
  support: {
    canUse(ctx) {
      // 相手ステージにエールが付いているホロメンがいる時のみ意味がある
      return ctx.holomems('opp', (e) => e.holomem.cheers.length > 0).length > 0;
    },
    *run(ctx) {
      // ◆推しが〈七詩ムメイ〉かつゲームに1回未使用なら、能力変更（相手センターのエール2枚アーカイブ）を選べる
      const g = (ctx.player._gameOnce = ctx.player._gameOnce || {});
      if (ctx.player.oshi?.name === '七詩ムメイ' && !g['hBP01-110']) {
        const useAlt = yield ctx.confirm('能力変更【ゲームに1回】: 相手のセンターホロメンのエール2枚をアーカイブする？（いいえ＝通常効果）');
        if (useAlt) {
          g['hBP01-110'] = true;
          const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
          if (!center) { ctx.log('相手のセンターがいないため効果なし'); return; }
          const picked = yield ctx.chooseCards({
            cards: [...center.holomem.cheers],
            count: 2,
            title: 'アーカイブする相手センターのエールを選択（2枚）',
          });
          for (const cheer of picked) {
            const idx = center.holomem.cheers.indexOf(cheer);
            if (idx !== -1) { center.holomem.cheers.splice(idx, 1); ctx.opponent.archive.push(cheer); ctx.log(`相手センターの ${cheer.name} をアーカイブ`); }
          }
          return;
        }
      }
      const dice = (yield* ctx.rollDice());
      if (dice > 3) {
        ctx.log('サイコロが4以上のため効果なし');
        return;
      }
      // 3以下: 相手のホロメン1人のエール1枚をアーカイブ
      const candidates = ctx.holomems('opp', (e) => e.holomem.cheers.length > 0);
      if (candidates.length === 0) return;
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.holomem.cheers.length > 0,
        title: 'エールをアーカイブする相手のホロメンを選択',
      });
      if (!target) return;
      const cheer = yield ctx.chooseCard({
        cards: [...target.holomem.cheers],
        title: 'アーカイブする相手のエールを選択',
      });
      if (!cheer) return;
      // 相手のエールは相手のアーカイブへ（ctx.archiveCheer は自分のアーカイブに送るため使わない）
      const i = target.holomem.cheers.indexOf(cheer);
      if (i !== -1) {
        target.holomem.cheers.splice(i, 1);
        ctx.opponent.archive.push(cheer);
        ctx.log(`${target.holomem.stack[0].name} の ${cheer.name} をアーカイブ`);
      }
    },
  },
};
