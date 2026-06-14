/**
 * カード効果レジストリ
 *
 * 個別カードの効果定義は battle_simulator_v2/cards/<カードナンバー>.js に置き、
 * cards/index.js の IMPLEMENTED に登録する（動的 import で遅延読み込み）。
 *
 * カード定義の形式:
 *   export default {
 *     number: 'hBP04-048',
 *     bloomEffect:  { name, *run(ctx) {...} },          // ブルームエフェクト (13.3)
 *     collabEffect: { name, *run(ctx) {...} },          // コラボエフェクト (13.2)
 *     giftEffect:   { name, *run(ctx) {...} },          // ギフト (13.4) ※未対応
 *     arts: { 'アーツ名': {
 *       *run(ctx) {...},                                 // テキスト効果（パイプライン段階4）
 *       dmgBonus(ctx) { return N; },                     // 条件付き「このアーツ+N」
 *       *onDownDealt(ctx) {...},                          // 「このアーツで相手をダウンさせた時」（ダメージ適用後に発火）
 *       *onDamageDealt(ctx, dealt) {...},                 // 「このアーツでダメージを与えた時」（与ダメージ量を受け取る。ライフスティール等）
 *       canUse(ctx) { return bool; },                     // アーツ使用条件（満たさなければ選択肢に出ない）
 *       redirectTargets(ctx) { return [holomem, ...]; },  // 対象差し替え（「対象のかわりに相手センター＋コラボに与える」等。非空配列で複数対象化）
 *     } },
 *     support: {
 *       canUse(ctx) { return bool; },                    // 追加の使用条件
 *       *run(ctx) {...},                                 // サポート効果本体
 *     },
 *     attached: {                                        // 付いている間の常時修正
 *       artsPlus(holomem, engine) { return N; },
 *       hpPlus(holomem, engine) { return N; },
 *       specialDmgPlus(sourceHolomem, targetEntry, engine) { return N; },
 *       damageDelta(holomem, zone, engine, kind, attacker) { return N; }, // 受けるダメージ増減（負=軽減）
 *       cheerSupply(holomem, engine) { return [{color:'白'}]; }, // アーツ使用時の擬似エール供給（「この装着を○エールとしても扱う」。コスト充足判定のみ・消費しない）
 *       onCheerAttached(holomem, engine, self) {},          // このホロメンにエールが付いた時（同期・選択不可。即時の継続修正付与等）
 *     },
 *     attachRule: {                                      // 付け先制限（雪民など）
 *       canAttach(holomem) { return bool; },
 *       unlimited: true,                                 // 1人に何枚でも
 *     },
 *     activatedAbilities: [{                             // メインステップで使う起動型能力「[コスト]：[効果]」
 *       name: '...',                                     // ログ表示名
 *       oncePerTurn: true,                               // [ターンに1回] 制限（省略時は無制限）
 *       canUse(ctx) { return bool; },                    // 使用条件（位置限定・付け先・コスト支払い可否など）
 *       *run(ctx) {...},                                 // コスト支払い(yield)＋効果本体
 *     }],                                                // ※ソースはホロメン自身/装着カード。ctx.sourceHolomem=付いているホロメン
 *                                                        //   ctx.sourceHolomemPos().zone で位置限定を判定できる
 *     ai: {                                              // AI用のカード固有知識（任意）
 *       supportValue({ engine, player, card }) {},       // サポートの使用価値（0=使わない）
 *     },
 *     triggers: {                                        // ホロメン/カードのトリガー効果
 *       *onDown(ctx) {...},                              // このホロメンがダウンした時（アーカイブ前。_processDown で発火）
 *       *onAttach(ctx) {...},                            // このカードを付けた時（supportAttach / attachSupportWithTrigger で発火）
 *       *onOpponentDown(ctx) {...},                      // このホロメンが相手をダウンさせた時（アーツ解決時に発火。選択可）
 *       *onOpponentPerformanceEnd(ctx) {...},            // 相手のパフォーマンスステップ終了時（防御側で発火。ctx.lifeDecreasedThisPerf でそのステップ中のライフ減少を判定）
 *     },                                                 //   ※ctx.sourceCard=自分, ctx.sourceHolomem=付いた/ダウンした/ダウンさせたホロメン
 *     specialBloom(h, handCard, engine, ownerIdx) { return bool; }, // 特殊Bloom: true でメインのBloom候補に追加（レベル遷移条件のみ迂回。同名/HP/ターン制限は通常通り）
 *     onDamageReceivedReact: {                          // 「ダメージを受ける時に使える」リアクティブ割り込み（推しスキル以外。ホロメンギフト/装着ファン）
 *       title, yesLabel,                                //   防御側に決定ポイントを提示。アーツ/特殊どちらのダメージ経路でも発火する
 *       canUse(engine, info) { return bool; },          //   info = { defIdx, target, dmg, kind:'arts'|'special', reactor?(ステージ側), attachedCard?(装着側) }
 *       apply(engine, info) { return newDmg; },         //   コスト/副作用を実行し、調整後ダメージを返す（hBP03-105 ファン-30 / hSD13-012 特殊シールド）
 *     },
 *     onDiceRollReact: {                                // 「サイコロを振った時に使える」リアクティブ割り込み（自分のファン等。コントローラー自身が選択）
 *       title, yesLabel,                                //   ctx.rollDice() 内で発火
 *       canUse(engine, info) { return bool; },          //   info = { ownerIdx, roller(振ったホロメン/推しはnull), rollerCard, value, fanCard, fanHolomem }
 *       apply(engine, info) { return newValue; },       //   コスト/副作用を実行し、置き換える出目を返す（hBP06-103 目を4に / hBP01-123 振り直し）
 *     },
 *     // ※ターン修正による機構: kind:'artTargetDamagedBack'（アーツ対象をHP減バックに拡張）/ kind:'reArts'（使ったアーツをもう1回。used フラグで消費）
 *     //   いずれも ctx.addTurnModifier({kind, ownerIdx, match}) で付与する
 *     artsCostReduceAura(src, target, engine) {          // アーツ必要エール軽減オーラ（[{color,amount}]を返す。engine が実効コスト算出に使用）
 *       return [{ color: '黄', amount: 1 }];             //   src=この能力の持ち主, target=コスト判定対象のホロメン
 *     },
 *     // 常時アウラ＝別ホロメンを恒常強化/保護するギフト（src=持ち主, target=評価対象。味方ステージを走査して合算）
 *     auraArtsPlus(src, target, engine) { return N; },        // 「自分の#0期生全員のアーツ+30」等
 *     auraHpPlus(src, target, engine) { return N; },          // 「自分の〇〇のHP+N」等
 *     auraDamageDelta(src, target, zone, engine, kind, attacker) { return -N; }, // 「コラボが受けるダメージ-10」「特殊のみ無効＝kind==='special'で-100000」「相手1stから受けるアーツ-30＝src===target&&attacker条件」等
 *       // kind='arts'|'special'、attacker=攻撃元ホロメン（無ければnull）。src===target で自己ギフトも表現できる
 *     auraSpecialDmgPlus(src, sourceHolomem, targetEntry, engine) { return N; }, // 「〈X〉が相手センターに与える特殊+20」等
 *     oshiSkill / spOshiSkill: { canUse(engine, idx), *run(ctx) },  // メインステップの起動型推しスキル（spは次相手ターンの前衛移動禁止 hBP01-005 等）
 *     onDownOshiSkill: { cost, title, canUse(engine, idx, holomem), apply(engine, idx, holomem) },
 *     onDamageOshiSkill: { cost, sp?, title, canUse(engine, defIdx, target, dmg), reduce(engine, defIdx, target, dmg)=>N },
 *       // 「相手のターンで自分のホロメンが相手からダメージを受ける時に使える：ダメージ-N」（被ダメージ割り込み。汎用 onDamageReceivedReact と同経路で提示）
 *     onDiceRollOshiSkill: { cost, sp?, title, canUse(engine, idx, info), apply(engine, idx, info)=>newValue }, // 「自分の〈X〉がサイコロを振った時：振り直す」等（ダイス割り込み。info={roller,rollerCard,value}）
 *     onArtsUseOshiSkills:    [{ cost, sp?, title, canUse(engine, idx, attackInfo), *run(ctx) }], // 「アーツを使った時に使える」（攻撃時誘発。配列で通常＋SP併記可）
 *     onDamageDealtOshiSkills: [{ cost, sp?, title, canUse(engine, idx, attackInfo), *run(ctx) }], // 「ダメージを与えた時に使える」（攻撃時誘発。ctx.attackInfo={sourceHolomem,art,artName,dealtList:[{target,zone,dealt}],downed}）
 *   }
 *
 * 設計原則: カード固有の知識（効果もAI評価も）は必ずこのカード定義に置く。
 * エンジンや core/ai/heuristic.js にカード番号を直書きしない（実装対象は874種ある）。
 * ai ブロックが無いカードは、AIがカードテキストのパターンから汎用評価する。
 */

import { IMPLEMENTED } from '../../cards/index.js';
import { compileCard } from './text-compiler.js';

export class EffectRegistry {
  constructor() {
    this.defs = new Map(); // number -> def
  }

  /**
   * デッキ内カードの効果定義を事前読み込みする（ゲーム開始時に呼ぶ）。
   * 優先順: 手書き定義（cards/<番号>.js） > テキストコンパイラの自動実装 > 未実装
   * lib (CardLibrary) を渡すと自動コンパイルが有効になる。
   */
  async preload(numbers, lib = null) {
    const unique = [...new Set(numbers)];
    await Promise.all(unique.map(async (number) => {
      if (this.defs.has(number)) return;
      const loader = IMPLEMENTED[number];
      if (loader) {
        try {
          const mod = await loader();
          this.defs.set(number, mod.default);
          return;
        } catch (e) {
          console.error(`カード効果の読み込み失敗: ${number}`, e);
        }
      }
      if (lib) {
        const card = lib.getByNumber(number);
        if (card) {
          try {
            const compiled = compileCard(card);
            if (compiled) this.defs.set(number, compiled);
          } catch (e) {
            console.error(`カード効果の自動コンパイル失敗: ${number}`, e);
          }
        }
      }
    }));
  }

  get(number) {
    return this.defs.get(number) || null;
  }

  /** アーツ定義の取得（アーツ名で引く） */
  getArt(number, artName) {
    return this.get(number)?.arts?.[artName] || null;
  }
}
