/**
 * 共通ユーティリティを使用したカード効果の実装例
 * ツートンカラーパソコンの実装を簡素化
 */

const TwoToneColorPCWithUtils = {
  cardId: 'hBP04-089_U',
  name: 'ツートンカラーパソコン',
  type: 'support',
  
  // 発動条件チェック
  canActivate: (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem?.utils;
    if (!utils) return false;

    const currentPlayer = battleEngine.gameState.currentPlayer;
    
    // フェーズとステージ条件をチェック
    return utils.checkConditions(currentPlayer, {
      phase: 3,        // メインフェーズのみ
      minColors: 2     // 2色以上のホロメンが必要
    });
  },
  
  // 効果実行（大幅に簡素化）
  execute: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    const currentPlayer = battleEngine.gameState.currentPlayer;
    
    try {
      // 1. ステージから異なる色の単色ホロメンを2体選択
      const stageHolomens = utils.getStageHolomens(currentPlayer);
      const singleColorHolomens = stageHolomens.filter(h => 
        h.card.card_color && 
        h.card.card_color !== '無' && 
        !h.card.card_color.includes('/')
      );
      
      if (singleColorHolomens.length < 2) {
        return { success: false, reason: '単色ホロメンが2体いません' };
      }

      // 簡易実装：最初の2体の色を取得
      const selectedColors = [
        singleColorHolomens[0].card.card_color,
        singleColorHolomens[1].card.card_color
      ];

      // 2. デッキから該当色の1stホロメンを検索
      const searchResult = await utils.selectCardsFromDeck(currentPlayer, {
        count: 2,
        types: ['ホロメン'],
        colors: selectedColors,
        bloomLevel: '1st',
        excludeBuzz: true,
        description: `${selectedColors.join('と')}の1stホロメンを選択してください`,
        allowLess: true
      });

      if (!searchResult.success || searchResult.cards.length === 0) {
        return { success: false, reason: '条件に合うカードがデッキにありません' };
      }

      // 3. 見つかったカードを手札に加える（シャッフル込み）
      const addResult = utils.addCardsToHand(currentPlayer, searchResult.cards, true);
      
      // 4. UI更新
      utils.updateDisplay();

      return {
        success: true,
        message: `${addResult.cards.map(c => c.name).join('、')}を手札に加えました`,
        cardsAdded: addResult.cards
      };
      
    } catch (error) {
      return { success: false, reason: 'エラーが発生しました', error };
    }
  }
};

// === 他のカード実装例 ===

// 作業用パソコン（簡素化版）
const WorkingPCWithUtils = {
  cardId: 'hBP04-090_U',
  name: '作業用パソコン',
  type: 'support',
  
  canActivate: (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem?.utils;
    if (!utils) return false;

    const currentPlayer = battleEngine.gameState.currentPlayer;
    const player = battleEngine.players[currentPlayer];
    
    // 手札6枚以下（このカードを除く）
    return utils.checkConditions(currentPlayer, {
      phase: 3,
      maxHandSize: 6
    });
  },
  
  execute: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    const currentPlayer = battleEngine.gameState.currentPlayer;
    
    // デッキの上から4枚見て、ホロメン1枚と[ツールかマスコットかファン]1枚を選択
    const player = battleEngine.players[currentPlayer];
    const topCards = player.deck.slice(0, 4);
    
    if (topCards.length === 0) {
      return { success: false, reason: 'デッキにカードがありません' };
    }

    // ホロメンを検索
    const holomenResult = await utils.selectCardsFromDeck(currentPlayer, {
      count: 1,
      types: ['ホロメン'],
      customFilter: [card => topCards.includes(card)],
      description: 'ホロメン1枚を選択してください',
      allowLess: true
    });

    // [ツールかマスコットかファン]を検索
    const supportResult = await utils.selectCardsFromDeck(currentPlayer, {
      count: 1,
      types: ['ツール', 'マスコット', 'ファン'],
      customFilter: [card => topCards.includes(card)],
      description: 'ツール・マスコット・ファンから1枚を選択してください',
      allowLess: true
    });

    const selectedCards = [
      ...(holomenResult.cards || []),
      ...(supportResult.cards || [])
    ];

    if (selectedCards.length > 0) {
      // 選択されたカードを手札に追加
      const addResult = utils.addCardsToHand(currentPlayer, selectedCards, false);
      
      // 残りのカードをデッキの下に戻す
      const remainingCards = topCards.filter(card => !selectedCards.includes(card));
      player.deck.splice(0, 4); // 上4枚を除去
      player.deck.push(...remainingCards); // 下に追加
      
      utils.updateDisplay();
      
      return {
        success: true,
        message: `${addResult.cards.map(c => c.name).join('、')}を手札に加えました`
      };
    }

    return { success: false, reason: '選択できるカードがありませんでした' };
  }
};

// シンプルなドロー効果
const SimpleDrawEffect = {
  cardId: 'example_draw_card',
  name: 'ドロー効果カード',
  type: 'support',
  
  execute: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    const currentPlayer = battleEngine.gameState.currentPlayer;
    
    // 2枚ドロー
    const drawResult = utils.drawCards(currentPlayer, 2);
    
    if (drawResult.success) {
      utils.updateDisplay();
      return {
        success: true,
        message: `${drawResult.cards.length}枚ドローしました`
      };
    }
    
    return drawResult;
  }
};

// ダメージ効果
const DamageEffect = {
  cardId: 'example_damage_card',
  name: 'ダメージ効果カード',
  type: 'support',
  
  execute: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    const currentPlayer = battleEngine.gameState.currentPlayer;
    const opponent = currentPlayer === 1 ? 2 : 1;
    
    // 相手に1ダメージ
    const damageResult = utils.dealDamage(opponent, 1, {
      source: card,
      type: 'effect'
    });
    
    if (damageResult.success) {
      utils.updateDisplay();
      return {
        success: true,
        message: `相手に${damageResult.damage}ダメージを与えました`
      };
    }
    
    return damageResult;
  }
};

// グローバル登録
if (typeof window !== 'undefined' && window.cardEffects) {
  window.cardEffects['hBP04-089_U'] = TwoToneColorPCWithUtils;
  window.cardEffects['hBP04-090_U'] = WorkingPCWithUtils;
  window.cardEffects['example_draw_card'] = SimpleDrawEffect;
  window.cardEffects['example_damage_card'] = DamageEffect;
}
