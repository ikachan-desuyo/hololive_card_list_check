/**
 * 効果パターンテンプレート集
 * 類似効果のカードをパターン化して効率的に実装
 */

class EffectPatternTemplates {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
  }

  /**
   * デッキ検索パターンテンプレート
   * 「デッキから〇〇を検索して手札に加える」系の効果
   */
  async executeDeckSearch(card, context, battleEngine) {
    const currentPlayer = battleEngine.gameState.currentPlayer;
    const player = battleEngine.players[currentPlayer];
    
    // カードテキストから検索条件を解析
    const searchConditions = this.parseSearchConditions(card);
    
    if (!searchConditions) {
      return { success: false, reason: '検索条件を解析できませんでした' };
    }

    try {
      // デッキから条件に合うカードを検索
      const matchingCards = player.deck.filter(deckCard => 
        this.matchesSearchCondition(deckCard, searchConditions)
      );

      if (matchingCards.length === 0) {
        return { success: false, reason: '条件に合うカードがデッキにありません' };
      }

      // 検索するカード数を決定
      const searchCount = Math.min(searchConditions.count, matchingCards.length);
      
      // プレイヤーにカード選択させる
      const selectedCards = await this.selectCardsFromDeck(
        matchingCards, 
        searchCount,
        searchConditions.description
      );

      if (!selectedCards || selectedCards.length === 0) {
        return { success: false, reason: '選択がキャンセルされました' };
      }

      // 選択されたカードを手札に移動
      for (const selectedCard of selectedCards) {
        const deckIndex = player.deck.indexOf(selectedCard);
        if (deckIndex !== -1) {
          player.deck.splice(deckIndex, 1);
          player.hand.push(selectedCard);
        }
      }

      // デッキシャッフル
      battleEngine.shuffleDeck(currentPlayer);
      
      // UI更新
      battleEngine.updateDisplay();

      return {
        success: true,
        message: `${selectedCards.map(c => c.name).join('、')}を手札に加えました`,
        cardsAdded: selectedCards
      };

    } catch (error) {
      return { success: false, reason: 'エラーが発生しました', error };
    }
  }

  /**
   * カードドローパターンテンプレート
   * 「〇枚ドローする」系の効果
   */
  async executeCardDraw(card, context, battleEngine) {
    const currentPlayer = battleEngine.gameState.currentPlayer;
    const player = battleEngine.players[currentPlayer];
    
    // カードテキストからドロー枚数を解析
    const drawCount = this.parseDrawCount(card);
    
    if (drawCount <= 0) {
      return { success: false, reason: 'ドロー枚数を解析できませんでした' };
    }

    try {
      // デッキからカードをドロー
      const drawnCards = [];
      
      for (let i = 0; i < drawCount && player.deck.length > 0; i++) {
        const drawnCard = player.deck.shift(); // デッキの上から
        player.hand.push(drawnCard);
        drawnCards.push(drawnCard);
      }

      // UI更新
      battleEngine.updateDisplay();

      return {
        success: true,
        message: `${drawCount}枚ドローしました`,
        cardsDrawn: drawnCards
      };

    } catch (error) {
      return { success: false, reason: 'エラーが発生しました', error };
    }
  }

  /**
   * LIMITED サポートパターンテンプレート
   * 基本的なLIMITEDサポートカードの処理
   */
  async executeLimitedSupport(card, context, battleEngine) {
    // LIMITED制限チェック（統一管理関数を使用）
    if (card.card_type?.includes('LIMITED')) {
      if (battleEngine.cardInteractionManager) {
        const canUse = battleEngine.cardInteractionManager.canUseLimitedEffect(card, 'hand');
        if (!canUse) {
          return { success: false, reason: 'LIMITED制限により使用できません' };
        }
      } else {
        // フォールバック（旧来の方式）
        if (!this.checkLimitedRestriction(card, battleEngine)) {
          return { success: false, reason: 'LIMITED制限により使用できません' };
        }
      }
    }

    // 個別効果は別途実装されている場合はそちらを優先
    if (this.hasCustomImplementation(card)) {
      return await this.executeCustomEffect(card, context, battleEngine);
    }

    // 基本的なLIMITED効果（効果なし、アーカイブのみ）
    return {
      success: true,
      message: `${card.name}を使用しました`,
      effect: 'basic_limited'
    };
  }

  /**
   * 検索条件の解析
   */
  parseSearchConditions(card) {
    if (!card.skills || card.skills.length === 0) return null;
    
    const skillText = card.skills[0].name || '';
    
    // 一般的なパターンを解析
    const patterns = [
      // "ホロメン1枚と[ツールかマスコットかファン]1枚を公開し"
      {
        regex: /ホロメン(\d+)枚と\[([^\]]+)\](\d+)枚/,
        parse: (match) => ({
          count: parseInt(match[1]) + parseInt(match[3]),
          types: ['ホロメン', ...match[2].split('か')],
          description: `ホロメン${match[1]}枚と${match[2]}${match[3]}枚を選択`
        })
      },
      // "1stホロメン1枚ずつ"
      {
        regex: /(\w+)ホロメン(\d+)枚/,
        parse: (match) => ({
          count: parseInt(match[2]),
          types: ['ホロメン'],
          bloomLevel: match[1],
          description: `${match[1]}ホロメン${match[2]}枚を選択`
        })
      }
    ];

    for (const pattern of patterns) {
      const match = skillText.match(pattern.regex);
      if (match) {
        return pattern.parse(match);
      }
    }

    return null;
  }

  /**
   * ドロー枚数の解析
   */
  parseDrawCount(card) {
    if (!card.skills || card.skills.length === 0) return 0;
    
    const skillText = card.skills[0].name || '';
    
    // "〇枚ドロー" パターンを検索
    const drawMatch = skillText.match(/(\d+)枚.*ドロー/);
    if (drawMatch) {
      return parseInt(drawMatch[1]);
    }

    // デフォルト
    return 0;
  }

  /**
   * 検索条件マッチング
   */
  matchesSearchCondition(deckCard, conditions) {
    // カードタイプチェック
    if (conditions.types && conditions.types.length > 0) {
      const cardType = deckCard.card_type || '';
      const matches = conditions.types.some(type => cardType.includes(type));
      if (!matches) return false;
    }

    // ブルームレベルチェック
    if (conditions.bloomLevel) {
      if (deckCard.bloom_level !== conditions.bloomLevel) return false;
    }

    // Buzz除外チェック
    if (deckCard.card_type?.includes('Buzz')) return false;

    return true;
  }

  /**
   * LIMITED制限チェック
   */
  checkLimitedRestriction(card, battleEngine) {
    // TODO: ターン中の使用回数制限を実装
    // 現在はとりあえずtrue
    return true;
  }

  /**
   * カスタム実装の存在チェック
   */
  hasCustomImplementation(card) {
    return window.cardEffects && window.cardEffects[card.id];
  }

  /**
   * カスタム効果の実行
   */
  async executeCustomEffect(card, context, battleEngine) {
    const customEffect = window.cardEffects[card.id];
    if (customEffect && customEffect.execute) {
      return await customEffect.execute(card, context, battleEngine);
    }
    return { success: false, reason: 'カスタム効果が見つかりません' };
  }

  /**
   * デッキからカード選択UI (仮実装)
   */
  async selectCardsFromDeck(cards, count, description) {
    // TODO: 実際のUI実装
    // 現在は先頭から指定枚数を自動選択
    return cards.slice(0, count);
  }
}

// グローバルエクスポート
if (typeof window !== 'undefined') {
  window.EffectPatternTemplates = EffectPatternTemplates;
}
