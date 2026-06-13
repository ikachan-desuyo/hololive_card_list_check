/**
 * 魔法のタンス (hBP02-083) サポート・イベント（#魔法）
 *
 * [サポート効果] このカードは、自分のホロパワー1枚をアーカイブしなければ使えない。
 *   → 必須コスト。ホロパワーが1枚以上ないと使えない（canUse でガード）。
 *     run 冒頭でホロパワーの上から1枚をアーカイブして支払う（hBP01-103 と同方式。
 *     ホロパワー専用プリミティブは無いため ctx.player.holoPower を直接操作する＝保存則は満たす）。
 *
 * 効果: 自分のアーカイブの紫エール1枚を、自分の〈紫咲シオン〉に送る。
 *   → アーカイブに紫エールがあり、かつステージに〈紫咲シオン〉がいる場合に送る。
 *     どちらか欠ける場合は何も起きない（コストのホロパワーは支払い済み）。
 *     〈紫咲シオン〉が複数いる場合は送り先を選択する。
 *
 * 未実装の制約: 「自分の#魔法を持つイベントはターンに1回しか使えない」
 *   → これは「このカード自身」ではなく「自分のすべての#魔法イベント」の使用回数を
 *     制限する常時制約。他カードのプレイ可否（サポート使用可否）を横断的に制御する
 *     エンジン機構が無いため未実装（保留カテゴリ: 他カードのプレイ制限）。
 *     本カードの主目的（紫エール送り）は実装済み。
 */
export default {
  number: 'hBP02-083',
  ai: {
    // アーカイブに紫エールがあり、ステージに紫咲シオンがいて、ホロパワーを払えるなら価値
    supportValue({ player }) {
      if (player.holoPower.length < 1) return 0;
      const hasPurpleCheer = player.archive.some((c) => c.kind === 'cheer' && c.color === '紫');
      const positions = [player.center, player.collab, ...(player.back || [])].filter(Boolean);
      const hasShion = positions.some((h) => h.stack && h.stack[0] && h.stack[0].name === '紫咲シオン');
      return (hasPurpleCheer && hasShion) ? 18 : 0;
    },
  },
  support: {
    canUse(ctx) {
      // ホロパワー1枚をアーカイブできなければ使えない（必須コスト）
      return ctx.player.holoPower.length >= 1;
    },
    *run(ctx) {
      const p = ctx.player;
      // コスト: ホロパワーの上から1枚をアーカイブ
      if (p.holoPower.length < 1) return;
      const paid = p.holoPower.shift();
      p.archive.push(paid);
      ctx.log(`${p.name}: ホロパワー1枚をアーカイブ（${paid.name}）`);

      // アーカイブの紫エール1枚を〈紫咲シオン〉に送る
      const purpleCheers = p.archive.filter((c) => c.kind === 'cheer' && c.color === '紫');
      const shions = ctx.holomems('self', (e) => e.top.name === '紫咲シオン');
      if (purpleCheers.length === 0 || shions.length === 0) {
        ctx.log('紫エールまたは〈紫咲シオン〉がいないため、エールは送られなかった');
        return;
      }

      const cheer = yield ctx.chooseCard({
        cards: purpleCheers,
        title: '〈紫咲シオン〉に送る紫エールを選択',
      });
      if (!cheer) return;

      let target = shions[0];
      if (shions.length > 1) {
        target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === '紫咲シオン',
          title: '紫エールを送る〈紫咲シオン〉を選択',
        });
      }
      if (!target) return;

      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, target.holomem);
    },
  },
};
