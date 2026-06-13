/**
 * 一条莉々華 (hBP04-033) 赤・Debut・HP120
 * アーツ「莉々華スタンバイ」(20): 効果なし（バニラ。エンジンが基本ダメージのみ解決）→ 定義不要。
 * アーツ「リミットオーバー」(30):
 *   このターンに自分が〈限界飯〉を使っていた時、相手のコラボホロメンに特殊ダメージ20を与える。
 *   → 基本ダメージ解決後の追加効果として *run で実装。
 *   〈限界飯〉使用判定は ctx.usedSupportNamed('限界飯')。
 *   相手にコラボがいない場合は何もしない（コラボは存在しないことがある）。
 */
export default {
  number: 'hBP04-033',
  arts: {
    'リミットオーバー': {
      *run(ctx) {
        if (!ctx.usedSupportNamed('限界飯')) return;
        for (const entry of ctx.holomems('opp', (e) => e.pos.zone === 'collab')) {
          yield* ctx.dealSpecialDamage(entry, 20);
        }
      },
    },
  },
};
