/**
 * 鈍器でぶっ叩くわよ！ (hBP01-110) サポート・イベント・LIMITED
 *
 * [サポート効果] サイコロを1回振る：3以下の時、相手のホロメンのエール1枚をアーカイブする。
 *   → 本ファイルではこの基本効果のみを実装する。
 *
 * ◆自分の推しホロメンが〈七詩ムメイ〉の時、能力変更可能
 *   [ゲームに1回] 相手のセンターホロメンのエール2枚をアーカイブする。
 *   → 「能力変更可能」（推しによる能力差し替え）＋サポートカードの「ゲームに1回」制限は
 *      エンジンに対応機構が無いため未実装。基本効果のみ提供する（差し替えは任意のため
 *      省略しても基本効果の挙動は正しい）。
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
      const dice = ctx.rollDice();
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
