/**
 * 動的カード効果読み込みのテストスクリプト
 * 開発者ツールのコンソールで動作確認用
 */

window.testDynamicCardLoading = {
  /**
   * カード効果の動的読み込みをテスト
   */
  async testCardLoading() {
    console.log('🧪 [Test] カード効果動的読み込みテスト開始');
    
    if (!window.cardEffectLoader) {
      console.error('❌ CardEffectLoader が利用できません');
      return false;
    }
    
    // テスト用カードID（実際に存在するファイルを指定）
    const testCardIds = [
      'hBP04-048',
      'hBP04-048_RR',  // レアリティ付き
      'hBP04-106',
      'hY04-001',
      'nonexistent-card'  // 存在しないカード
    ];
    
    console.log(`🧪 [Test] ${testCardIds.length}枚のカードをテスト`);
    
    const results = await window.cardEffectLoader.loadCards(testCardIds);
    
    // 結果を表示
    testCardIds.forEach((cardId, index) => {
      const result = results[index];
      const normalizedId = window.cardEffectLoader.normalizeCardId(cardId);
      const status = result ? '✅ 成功' : '❌ 失敗';
      console.log(`🧪 [Test] ${cardId} (正規化: ${normalizedId}) - ${status}`);
    });
    
    // 読み込み済みカード一覧
    const loadedCards = window.cardEffectLoader.getLoadedCards();
    console.log(`🧪 [Test] 読み込み済みカード数: ${loadedCards.length}`);
    console.log(`🧪 [Test] 読み込み済みカード: `, loadedCards);
    
    return true;
  },
  
  /**
   * デッキからのカード効果読み込みをテスト
   */
  async testDeckLoading() {
    console.log('🧪 [Test] デッキカード効果読み込みテスト開始');
    
    if (!window.battleEngine || !window.battleEngine.players) {
      console.error('❌ BattleEngine が利用できません');
      return false;
    }
    
    // プレイヤー1のデッキをテスト
    const player1 = window.battleEngine.players[1];
    if (!player1 || (!player1.deck && !player1.yellDeck)) {
      console.warn('⚠️ プレイヤー1のデッキが設定されていません');
      return false;
    }
    
    // 全カードIDを収集
    const cardIds = [];
    
    if (player1.deck) {
      player1.deck.forEach(card => {
        if (card && (card.id || card.number)) {
          cardIds.push(card.id || card.number);
        }
      });
    }
    
    if (player1.yellDeck) {
      player1.yellDeck.forEach(card => {
        if (card && (card.id || card.number)) {
          cardIds.push(card.id || card.number);
        }
      });
    }
    
    if (player1.oshi && (player1.oshi.id || player1.oshi.number)) {
      cardIds.push(player1.oshi.id || player1.oshi.number);
    }
    
    const uniqueCardIds = [...new Set(cardIds)];
    console.log(`🧪 [Test] デッキ内のユニークカード数: ${uniqueCardIds.length}`);
    
    if (uniqueCardIds.length === 0) {
      console.warn('⚠️ デッキにカードが見つかりませんでした');
      return false;
    }
    
    // カード効果を読み込み
    const results = await window.cardEffectLoader.loadCards(uniqueCardIds);
    const successCount = results.filter(result => result).length;
    
    console.log(`🧪 [Test] デッキカード効果読み込み完了: ${successCount}/${uniqueCardIds.length} 成功`);
    
    return true;
  },
  
  /**
   * カードID正規化のテスト
   */
  testCardIdNormalization() {
    console.log('🧪 [Test] カードID正規化テスト開始');
    
    if (!window.cardEffectLoader) {
      console.error('❌ CardEffectLoader が利用できません');
      return false;
    }
    
    const testCases = [
      { input: 'hBP04-048', expected: 'hBP04-048' },
      { input: 'hBP04-048_RR', expected: 'hBP04-048' },
      { input: 'hBP04-048_SR', expected: 'hBP04-048' },
      { input: 'hY04-001_C', expected: 'hY04-001' },
      { input: 'hBP02-084_02_U', expected: 'hBP02-084' },  // 複雑なパターン
      { input: 'hSD01-017_02_C', expected: 'hSD01-017' },  // 複雑なパターン
      { input: 'hBP02-076_03', expected: 'hBP02-076' },    // 連番のみ
      { input: '', expected: '' },
      { input: null, expected: '' },
      { input: undefined, expected: '' }
    ];
    
    let allPassed = true;
    
    testCases.forEach(testCase => {
      const result = window.cardEffectLoader.normalizeCardId(testCase.input);
      const passed = result === testCase.expected;
      
      if (!passed) allPassed = false;
      
      const status = passed ? '✅' : '❌';
      console.log(`🧪 [Test] ${status} '${testCase.input}' -> '${result}' (期待値: '${testCase.expected}')`);
    });
    
    console.log(`🧪 [Test] 正規化テスト結果: ${allPassed ? '✅ 全て成功' : '❌ 一部失敗'}`);
    
    return allPassed;
  }
};

// コンソールでテスト実行可能にするためのヘルパー
console.log('🧪 [Test] カード効果動的読み込みテストが利用可能です:');
console.log('   testDynamicCardLoading.testCardLoading()     - 基本的な読み込みテスト');
console.log('   testDynamicCardLoading.testDeckLoading()     - デッキからの読み込みテスト');
console.log('   testDynamicCardLoading.testCardIdNormalization() - ID正規化テスト');
