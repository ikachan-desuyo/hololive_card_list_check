/**
 * 手札管理マネージャー
 * 手札の表示・更新・ドラッグ&ドロップ処理・カードプレイ処理・カード位置交換を管理する
 */

class HandManager {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
    this.handArea = null;
  }

  // 手札エリアの初期化
  setupHandArea() {
    // CSSで定義されている.hand-areaクラスを使用
    let handArea = document.querySelector('.hand-area');
    
    if (!handArea) {
      // 手札エリアが存在しない場合は動的作成
      handArea = document.createElement('div');
      handArea.className = 'hand-area';
      
      // プレイヤーエリアの下に配置
      const playerArea = document.querySelector('.battle-player');
      if (playerArea) {
        playerArea.appendChild(handArea);
      } else {
        document.body.appendChild(handArea);
      }
    }
    
    this.handArea = handArea;
    console.log('手札エリア初期化完了');
  }

  // 手札表示の更新
  updateHandDisplay() {
    // .hand-areaクラスの要素を取得
    let handArea = document.querySelector('.hand-area');
    
    if (!handArea) {
      console.error('手札エリアが見つかりません');
      this.setupHandArea(); // 手札エリアを作成
      handArea = this.handArea;
    }
    
    const player = this.battleEngine.players[1]; // プレイヤーの手札のみ表示
    
    // 既存の手札を完全にクリア
    handArea.innerHTML = '';
    
    // 手札が存在する場合のみ表示
    if (player.hand && Array.isArray(player.hand)) {
      player.hand.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'hand-card';
        
        // 画像URLの確認とフォールバック
        const imageUrl = card.image_url || 'images/placeholder.png';
        cardElement.style.backgroundImage = `url(${imageUrl})`;
        cardElement.style.backgroundSize = 'cover';
        cardElement.style.backgroundPosition = 'center';
        cardElement.style.backgroundRepeat = 'no-repeat';
        
        cardElement.title = card.name || 'カード';
        cardElement.setAttribute('data-card-id', card.id || index);
        cardElement.setAttribute('data-card-index', index);
        
        // 情報パネル用のdata属性を設定
        cardElement.setAttribute('data-card-name', card.name || '不明なカード');
        cardElement.setAttribute('data-card-type', card.card_type || '不明');
        cardElement.setAttribute('data-card-description', card.description || '');
        
        if (card.color && Array.isArray(card.color)) {
          cardElement.setAttribute('data-card-color', card.color.join('・'));
        } else if (card.color) {
          cardElement.setAttribute('data-card-color', card.color);
        }
        
        if (card.level !== undefined) {
          cardElement.setAttribute('data-card-level', card.level);
        }
        
        if (card.hp !== undefined) {
          cardElement.setAttribute('data-card-hp', card.hp);
        }
        
        if (card.attack !== undefined) {
          cardElement.setAttribute('data-card-attack', card.attack);
        }
        
        // ドラッグ機能を追加
        cardElement.draggable = true;
        cardElement.addEventListener('dragstart', (e) => this.handleHandCardDragStart(e, card, index));
        cardElement.addEventListener('dragend', (e) => this.handleHandCardDragEnd(e));
        
        // クリックイベント
        cardElement.addEventListener('click', () => this.handleHandCardClick(card, index));
        
        handArea.appendChild(cardElement);
      });
      
      console.log(`手札表示更新完了: ${player.hand.length}枚`);
    } else {
      console.log('手札が空です');
    }
  }

  // 手札カードのクリック処理
  handleHandCardClick(card, index) {
    console.log('手札のカードがクリックされました:', card.name);
    
    // メインステップでのみカードをプレイ可能
    if (this.battleEngine.gameState.currentPhase === 3) {
      this.battleEngine.playCard(card, index);
    } else {
      console.log('メインステップでのみカードをプレイできます');
    }
  }

  // 手札からのドラッグ開始処理
  handleHandCardDragStart(e, card, index) {
    console.log('手札からドラッグ開始:', card.name);
    
    // ドラッグ中のカードデータを保存
    this.battleEngine.draggedCard = {
      card: card,
      index: index,
      source: 'hand'
    };
    
    // ドラッグエフェクトを追加
    e.target.classList.add('dragging');
    
    // サポートカードの場合は専用エリアを表示
    if (this.battleEngine.isSupportCard(card)) {
      console.log('サポートカード判定: true - showSupportDropZone()を呼び出します');
      this.battleEngine.showSupportDropZone();
    } else {
      console.log('サポートカード判定: false - 通常のドロップゾーンのみ');
    }
    
    // 有効なドロップゾーンをハイライト
    this.battleEngine.highlightValidDropZones(card);
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      cardId: card.id,
      cardIndex: index,
      source: 'hand'
    }));
  }

  // 手札からのドラッグ終了処理
  handleHandCardDragEnd(e) {
    console.log('ドラッグ終了');
    
    // ドラッグエフェクトを削除
    e.target.classList.remove('dragging');
    
    // サポートエリアを非表示
    this.battleEngine.hideSupportDropZone();
    
    // ハイライトを削除
    this.battleEngine.clearDropZoneHighlights();
    
    // ドラッグ状態をクリア
    this.battleEngine.draggedCard = null;
  }

  // カードプレイ処理
  playCard(card, handIndex) {
    const player = this.battleEngine.players[this.battleEngine.gameState.currentPlayer];
    
    // カードプレイのログ
    if (window.logCardEvent) {
      const playerType = this.battleEngine.gameState.currentPlayer === 1 ? 'player' : 'opponent';
      const cardName = card.name || '不明なカード';
      window.logCardEvent(playerType, 'プレイ', cardName);
    }
    
    if (card.card_type === 'ホロメン') {
      this.playHolomenCard(card, handIndex);
    } else if (card.card_type.includes('サポート')) {
      this.playSupportCard(card, handIndex);
    }
  }

  // ホロメンカード配置処理
  playHolomenCard(card, handIndex) {
    const currentPhase = this.battleEngine.gameState.currentPhase;
    
    // メインステップでのカード配置（制限なし）
    if (currentPhase === 3) {
      return this.placeHolomenCardMainStep(card, handIndex);
    }
    
    // Debut配置フェーズでの配置
    if (this.battleEngine.gameState.debutPlacementPhase) {
      return this.placeHolomenCardDebut(card, handIndex);
    }
    
    console.log('現在のフェーズではホロメンカードを配置できません');
  }

  // メインステップでのホロメンカード配置（制限削除）
  placeHolomenCardMainStep(card, handIndex) {
    const player = this.battleEngine.players[this.battleEngine.gameState.currentPlayer];
    const cardCopy = this.createCardCopy(card);
    
    // 空きスロットを順番に探す（優先順位：コラボ > センター > バック）
    const availableSlots = this.findAvailableSlots(player);
    
    if (availableSlots.length === 0) {
      console.log('配置可能なスロットがありません');
      return;
    }

    // 最初に見つかった空きスロットに配置
    const targetSlot = availableSlots[0];
    
    // ステートマネージャーを使用して配置と履歴管理
    if (this.battleEngine.stateManager) {
      // 配置の妥当性チェック
      const validation = this.battleEngine.stateManager.checkDropValidity(
        cardCopy, 
        targetSlot, 
        this.battleEngine.gameState.currentPlayer
      );
      
      if (!validation.valid) {
        console.log(`配置不可: ${validation.reason}`);
        return;
      }
      
      // ブルーム追跡機能付きで配置
      this.battleEngine.stateManager.placeCardWithBloomTracking(
        this.battleEngine.gameState.currentPlayer,
        cardCopy,
        targetSlot
      );
    } else {
      // フォールバック：直接配置
      player[targetSlot] = cardCopy;
    }
    
    // 手札から除去
    player.hand.splice(handIndex, 1);
    console.log(`${cardCopy.name}を${targetSlot}に配置しました`);
    
    this.battleEngine.updateUI();
  }

  // Debut配置フェーズでの配置
  placeHolomenCardDebut(card, handIndex) {
    const player = this.battleEngine.players[this.battleEngine.gameState.currentPlayer];
    
    // カードのディープコピーを作成
    const cardCopy = this.createCardCopy(card);
    
    // 空いているステージポジションを探す
    if (!player.collab) {
      player.collab = cardCopy;
      player.hand.splice(handIndex, 1);
      console.log(`${cardCopy.name}をセンター①に配置しました`);
    } else if (!player.center) {
      player.center = cardCopy;
      player.hand.splice(handIndex, 1);
      console.log(`${cardCopy.name}をセンター②に配置しました`);
    } else if (!player.back1) {
      player.back1 = cardCopy;
      player.hand.splice(handIndex, 1);
      console.log(`${cardCopy.name}をバック①に配置しました`);
    } else if (!player.back2) {
      player.back2 = cardCopy;
      player.hand.splice(handIndex, 1);
      console.log(`${cardCopy.name}をバック②に配置しました`);
    } else if (!player.back3) {
      player.back3 = cardCopy;
      player.hand.splice(handIndex, 1);
      console.log(`${cardCopy.name}をバック③に配置しました`);
    } else {
      console.log('ステージが満員です');
      return;
    }
    
    this.battleEngine.updateUI();
  }

  // 利用可能なスロットを見つける
  findAvailableSlots(player) {
    const slots = [];
    
    // コラボスロット
    if (!player.collab) {
      // コラボ配置の条件チェック
      const hasRestingBackCard = this.hasNonRestingBackCard(player);
      if (hasRestingBackCard) {
        slots.push('collab');
      }
    }
    
    // センタースロット
    if (!player.center) {
      slots.push('center');
    }
    
    // バックスロット
    for (let i = 1; i <= 5; i++) {
      const slotName = `back${i}`;
      if (!player[slotName]) {
        slots.push(slotName);
      }
    }
    
    return slots;
  }

  // お休みしていないバックカードがあるかチェック
  hasNonRestingBackCard(player) {
    for (let i = 1; i <= 5; i++) {
      const backCard = player[`back${i}`];
      if (backCard && !backCard.resting) {
        return true;
      }
    }
    return false;
  }

  // サポートカード使用処理
  playSupportCard(card, handIndex) {
    const player = this.battleEngine.players[this.battleEngine.gameState.currentPlayer];
    
    // LIMITED制限チェック（これのみ残す）
    if (card.card_type.includes('LIMITED')) {
      if (player.usedLimitedThisTurn.length > 0) {
        console.log('このターンには既にLIMITEDカードを使用しています');
        return;
      }
      player.usedLimitedThisTurn.push(card.id);
    }
    
    // サポート効果の実行（簡易版）
    console.log(`${card.name}を使用しました`);
    
    // 手札から除去してアーカイブへ
    player.hand.splice(handIndex, 1);
    player.archive.push(card);
    
    this.battleEngine.updateUI();
  }

  // カードオブジェクトのディープコピーを作成
  createCardCopy(card) {
    if (!card) return null;
    
    // カードオブジェクトのディープコピーを作成
    const cardCopy = JSON.parse(JSON.stringify(card));
    
    // エールカードリストを独立したオブジェクトとして初期化
    cardCopy.yellCards = [];
    
    // 回転状態などの状態情報を保持
    if (card.isResting) {
      cardCopy.isResting = card.isResting;
    }
    
    console.log(`カードコピー作成: ${cardCopy.name} (元のエール数: ${card.yellCards ? card.yellCards.length : 0})`);
    
    return cardCopy;
  }

  // サポートカード判定
  isSupportCard(card) {
    const isSupport = card.card_type && card.card_type.includes('サポート');
    console.log(`isSupportCard判定: ${card.name} = ${isSupport} (${card.card_type})`);
    return isSupport;
  }

  // サポートカード効果使用
  useSupportCard(card, handIndex) {
    const useCard = confirm(`「${card.name}」の効果を使用しますか？`);
    
    if (useCard) {
      console.log(`${card.name}の効果を使用`);
      
      // 手札から削除
      this.battleEngine.players[1].hand.splice(handIndex, 1);
      
      // アーカイブに移動（実際のゲームルールに応じて）
      this.battleEngine.players[1].archive.push(card);
      
      // TODO: 実際のカード効果処理を実装
      alert(`${card.name}の効果を発動しました！`);
      
      // UI更新
      this.updateHandDisplay();
      this.battleEngine.updateUI();
    }
  }

  /**
   * カード位置交換の処理
   * @param {Object} sourceCard - 移動元のカード
   * @param {string} sourcePosition - 移動元のポジション
   * @param {Object} targetCard - 移動先のカード（null可）
   * @param {string} targetPosition - 移動先のポジション
   * @param {number} playerId - プレイヤーID
   */
  swapCards(sourceCard, sourcePosition, targetCard, targetPosition, playerId = 1) {
    // console.log('=== HAND MANAGER: カード交換処理開始 ===');
    // 引数チェック（デバッグ用）
    // console.log('引数 sourceCard:', sourceCard);
    // console.log('引数 sourcePosition:', sourcePosition);
    // console.log('引数 targetCard:', targetCard);
    // console.log('引数 targetPosition:', targetPosition);
    // console.log('引数 playerId:', playerId);
    
    // 引数の検証
    if (!sourceCard) {
      console.error('HAND MANAGER: sourceCard が null/undefined です');
      alert('⚠️ エラー: 移動元カードが見つかりません');
      return false;
    }
    
    if (!sourceCard.name) {
      console.error('HAND MANAGER: sourceCard にname プロパティがありません:', sourceCard);
      alert('⚠️ エラー: 移動元カードの名前が見つかりません');
      return false;
    }
    
    if (!sourcePosition) {
      console.error('HAND MANAGER: sourcePosition が null/undefined です');
      alert('⚠️ エラー: 移動元位置が見つかりません');
      return false;
    }
    
    if (!targetPosition) {
      console.error('HAND MANAGER: targetPosition が null/undefined です');
      alert('⚠️ エラー: 移動先位置が見つかりません');
      return false;
    }
    
    console.log(`移動元: ${sourcePosition} - ${sourceCard.name}`);
    console.log(`移動先: ${targetPosition} - ${targetCard ? targetCard.name : '空'}`);
    
    // Placement Controllerで新しいルールをチェック
    const placementCheck = this.battleEngine.placementController.canSwapCards(
      sourceCard, sourcePosition, targetCard, targetPosition, playerId
    );
    
    if (!placementCheck.valid) {
      console.log(`配置ルール拒否: ${placementCheck.reason}`);
      alert(`⚠️ カード交換不可\n\n${placementCheck.reason}`);
      return false;
    }

    // State Managerで交換可能性をチェック
    const swapCheck = this.battleEngine.stateManager.checkSwapValidity(
      sourceCard, sourcePosition, targetCard, targetPosition, playerId
    );
    
    if (!swapCheck.valid) {
      console.log(`交換拒否: ${swapCheck.reason}`);
      alert(`⚠️ カード交換不可\n\n${swapCheck.reason}`);
      return false;
    }
    
    console.log(`交換許可: ${swapCheck.reason}`);
    
    // 特別なケースの処理
    const isBloom = targetCard && this.battleEngine.placementController.isBloomMove(sourceCard, targetCard);
    const isCollabMove = targetPosition === 'collab' && sourcePosition.startsWith('back');
    
    // 実際の交換処理
    const player = this.battleEngine.players[playerId];
    
    console.log(`カード交換: ${sourcePosition} → ${targetPosition}`);
    
    // State Managerで一括交換（プロキシシステムを使用せずに状態管理を統一）
    this.battleEngine.stateManager.updateState('SWAP_CARDS', {
      player: playerId,
      sourcePosition: sourcePosition,
      targetPosition: targetPosition
    });

    // 特別な処理の実行
    if (isBloom) {
      // ブルーム実行の記録（カード状態ベース）
      const updatedSourceCard = this.battleEngine.stateManager.recordBloom(sourceCard, targetCard, playerId);
      // 更新されたカードで状態を再設定
      player[targetPosition] = updatedSourceCard;
      console.log(`ブルーム実行: ${sourceCard.name} → ${targetCard.name}`);
    }

    if (isCollabMove) {
      // コラボ移動の記録とホロパワー配置（カード状態ベース）
      const updatedSourceCard = this.battleEngine.stateManager.recordCollabMove(sourceCard, playerId);
      // 更新されたカードで状態を再設定
      player[targetPosition] = updatedSourceCard;
      console.log(`コラボ移動実行: ${sourceCard.name}`);
      
      // ホロパワーカード配置を強制実行
      this.placeHoloPowerFromDeck(playerId);
    }

    // Debutカード配置の記録（カード状態ベース）
    if (sourceCard.bloom_level === 'Debut' && !targetCard) {
      const updatedSourceCard = this.battleEngine.stateManager.recordJustPlayedDebut(sourceCard, playerId);
      // 更新されたカードで状態を再設定
      player[targetPosition] = updatedSourceCard;
    }
    
    // UI更新（交換したエリアのみ更新）
    setTimeout(() => {
      // 手札表示を更新
      this.updateHandDisplay();
      // バックスロットのみ更新（全エリア更新は避ける）
      this.battleEngine.cardDisplayManager.updateBackSlots(playerId === 1 ? 'player' : 'cpu');
      // フェーズハイライトのみ更新
      this.battleEngine.updatePhaseHighlight(playerId, this.battleEngine.stateManager.getState().turn.currentPhase);
    }, 50);
    
    console.log(`✅ カード交換完了: ${sourceCard.name} → ${targetPosition}`);
    
    return true;
  }

  /**
   * デッキからホロパワーカードを1枚配置（コラボ移動時の強制処理）
   * @param {number} playerId - プレイヤーID
   */
  placeHoloPowerFromDeck(playerId) {
    const player = this.battleEngine.players[playerId];
    
    // デッキからホロパワーカードを取得
    if (player.deck && player.deck.length > 0) {
      const holoPowerCard = player.deck.shift(); // デッキの先頭から取得
      
      // ホロパワーエリアに配置
      if (!player.holoPower) {
        player.holoPower = [];
      }
      player.holoPower.push(holoPowerCard);
      
      console.log(`ホロパワーカード配置: ${holoPowerCard.name}`);
      
      // UI更新
      this.battleEngine.updateUI();
      
      // アニメーション効果（オプション）
      this.showHoloPowerPlacementEffect(holoPowerCard);
    } else {
      console.warn('デッキにカードがありません');
    }
  }

  /**
   * ホロパワー配置エフェクトの表示
   * @param {Object} card - 配置されたカード
   */
  showHoloPowerPlacementEffect(card) {
    // 簡単な通知を表示
    const message = `ホロパワーカード配置: ${card.name}`;
    
    // 一時的な通知を表示
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      animation: fadeInOut 3s ease-in-out;
    `;
    
    // CSS アニメーションを追加
    if (!document.querySelector('#holopower-animation-style')) {
      const style = document.createElement('style');
      style.id = 'holopower-animation-style';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(100%); }
          15% { opacity: 1; transform: translateX(0); }
          85% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(100%); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // 3秒後に削除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * ドラッグ&ドロップでの配置処理（交換対応版）
   * @param {Object} card - 配置するカード
   * @param {number} handIndex - 手札のインデックス
   * @param {Object} dropZone - ドロップ先情報
   */
  placeCardFromHandWithSwap(card, handIndex, dropZone) {
    const player = this.battleEngine.players[1];
    
    console.log(`手札からの配置試行: ${card.name}, dropZone:`, dropZone);
    
    if (dropZone.type === 'support') {
      this.useSupportCard(card, handIndex);
      return;
    }
    
    // 移動先の現在のカード状況を確認
    let targetCard = null;
    let targetPosition = '';
    
    switch (dropZone.type) {
      case 'center':
        targetCard = player.center;
        targetPosition = 'center';
        break;
      case 'back':
        const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
        targetPosition = backPositions[dropZone.index];
        targetCard = player[targetPosition];
        break;
      default:
        console.log('未対応のドロップ先です');
        return;
    }
    
    // ドロップ先にカードがある場合は交換処理
    if (targetCard) {
      console.log(`位置交換モード: ${card.name} → ${targetPosition} (${targetCard.name}と交換)`);
      
      // State Managerで交換可能性をチェック
      const swapCheck = this.battleEngine.stateManager.checkSwapValidity(
        card, 'hand', targetCard, targetPosition, 1
      );
      
      if (!swapCheck.valid) {
        console.log(`交換拒否: ${swapCheck.reason}`);
        alert(`⚠️ カード交換不可\n\n${swapCheck.reason}`);
        return;
      }
      
      // 交換実行: 手札のカードをステージに、ステージのカードを手札に
      const cardCopy = this.createCardCopy(card);
      player[targetPosition] = cardCopy;
      player.hand[handIndex] = targetCard;
      
      console.log(`✅ 手札↔ステージ交換完了: ${card.name} ⇔ ${targetCard.name}`);
      
    } else {
      // 通常の配置処理（空の場所に配置）
      console.log(`通常配置モード: ${card.name} → ${targetPosition}`);
      
      const cardCopy = this.createCardCopy(card);
      player[targetPosition] = cardCopy;
      player.hand.splice(handIndex, 1);
      
      console.log(`✅ 通常配置完了: ${card.name} → ${targetPosition}`);
    }
    
    // UI更新
    this.updateHandDisplay();
    this.battleEngine.updateUI();
  }
}

// グローバルアクセス用
window.HandManager = HandManager;
