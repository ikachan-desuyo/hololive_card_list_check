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
    }
  }

  // 手札カードのクリック処理
  handleHandCardClick(card, index) {
    // メインステップでのみカードをプレイ可能
    if (this.battleEngine.gameState.currentPhase === 3) {
      this.battleEngine.playCard(card, index);
    } else {
      console.log('メインステップでのみカードをプレイできます');
    }
  }

  // 手札からのドラッグ開始処理
  handleHandCardDragStart(e, card, index) {
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
      this.battleEngine.showSupportDropZone();
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
    } else if (!player.center) {
      player.center = cardCopy;
      player.hand.splice(handIndex, 1);
    } else if (!player.back1) {
      player.back1 = cardCopy;
      player.hand.splice(handIndex, 1);
    } else if (!player.back2) {
      player.back2 = cardCopy;
      player.hand.splice(handIndex, 1);
    } else if (!player.back3) {
      player.back3 = cardCopy;
      player.hand.splice(handIndex, 1);
    } else {
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
    
    // エールカードリストを保持（既存のものがあれば維持、なければ初期化）
    if (!cardCopy.yellCards) {
      cardCopy.yellCards = [];
    }
    
    // 回転状態などの状態情報を保持
    if (card.isResting) {
      cardCopy.isResting = card.isResting;
    }
    
    return cardCopy;
  }

  // サポートカード判定
  isSupportCard(card) {
    return card.card_type && card.card_type.includes('サポート');
  }

  // サポートカード効果使用
  useSupportCard(card, handIndex) {
    const useCard = confirm(`「${card.name}」の効果を使用しますか？`);
    
    if (useCard) {
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
    // 引数の検証
    if (!sourceCard || !sourceCard.name || !sourcePosition || !targetPosition) {
      console.error('HAND MANAGER: カード交換に必要な引数が不足しています');
      alert('⚠️ エラー: カード交換に必要な情報が不足しています');
      return false;
    }
    
    // Placement Controllerで新しいルールをチェック
    const placementCheck = this.battleEngine.placementController.canSwapCards(
      sourceCard, sourcePosition, targetCard, targetPosition, playerId
    );
    
    if (!placementCheck.valid) {
      alert(`⚠️ カード交換不可\n\n${placementCheck.reason}`);
      return false;
    }
    
    // 特別なケースの判定
    const isBloom = targetCard && this.battleEngine.placementController.isBloomMove(sourceCard, targetCard);
    const isCollabMove = targetPosition === 'collab' && sourcePosition.startsWith('back');
    
    // 実際の交換処理
    const player = this.battleEngine.players[playerId];
    
    // コラボ移動の場合は専用処理を先に実行
    if (isCollabMove) {
      // State Managerでの移動可能性事前チェック
      if (this.battleEngine.stateManager) {
        const collabCheck = this.battleEngine.stateManager.canMoveToCollab(sourceCard, playerId);
        
        if (!collabCheck.valid) {
          console.warn(`⚠️ コラボ移動拒否: ${collabCheck.reason}`);
          alert(`コラボ移動不可:\n${collabCheck.reason}`);
          return false;
        }
      }
      
      // 【公式ルール準拠】コラボ手順：
      // 1. 先にホロパワーカード配置を実行
      const holoPowerPlaced = this.placeHoloPowerFromDeck(playerId);
      
      if (!holoPowerPlaced) {
        // ホロパワー配置に失敗した場合、コラボ移動を中止
        console.error('ホロパワー配置失敗のためコラボ移動を中止');
        return false;
      }
      
      // 2. 移動元カードのエール情報を保持（Battle Engineのplayerオブジェクトを使用）
      const battleEnginePlayer = this.battleEngine.players[playerId];
      let originalCard = battleEnginePlayer[sourcePosition];
      
      // カードが見つからない場合、sourceCardを代替として使用
      if (!originalCard && sourceCard) {
        console.warn(`⚠️ Battle Engineでカードが見つからないため、sourceCardを使用: ${sourceCard.name}`);
        originalCard = sourceCard;
      }
      
      if (!originalCard) {
        console.error(`❌ コラボ移動エラー: ${sourcePosition}にカードがありません`);
        return false;
      }
      
      console.log(`🔄 コラボ移動: ${originalCard?.name} (エール: ${originalCard?.yellCards?.length || 0}枚)`);
      
      // 3. コラボ移動の記録（カード状態ベース）
      const updatedSourceCard = this.battleEngine.stateManager.recordCollabMove(sourceCard, playerId);
      
      // 4. エール情報を新しいカードに確実に引き継ぎ
      if (originalCard?.yellCards && Array.isArray(originalCard.yellCards)) {
        updatedSourceCard.yellCards = [...originalCard.yellCards];
        console.log(`✅ コラボ移動: エール引継ぎ ${originalCard.yellCards.length}枚`);
      }
      
      // 5. コラボ移動実行（SWAP_CARDSで実際の移動を行う）
      console.log(`🔄 コラボ移動実行: ${sourcePosition} → ${targetPosition}`);
      this.battleEngine.stateManager.updateState('SWAP_CARDS', {
        player: playerId,
        sourcePosition: sourcePosition,
        targetPosition: targetPosition
      });
      
      // 6. エール情報が確実に反映されるよう再度設定（SWAP_CARDS実行後）
      setTimeout(() => {
        const collabCard = battleEnginePlayer[targetPosition];
        if (collabCard && originalCard?.yellCards?.length > 0) {
          // エール情報を確実に設定
          collabCard.yellCards = [...originalCard.yellCards];
          console.log(`🔧 コラボ移動後エール再設定: ${collabCard.name} (エール: ${collabCard.yellCards.length}枚)`);
          
          // State Managerにも反映
          if (this.battleEngine.stateManager.state.players[playerId].cards[targetPosition]) {
            this.battleEngine.stateManager.state.players[playerId].cards[targetPosition].yellCards = [...originalCard.yellCards];
            console.log(`🔧 State Manager同期: ${targetPosition}にエール情報設定完了`);
          }
          
          this.battleEngine.updateUI();
        }
      }, 50); // 少し長めの遅延で確実に実行
      
      return true; // コラボ移動完了、以降の処理はスキップ
    }
    
    // State Managerで交換可能性をチェック（コラボ移動以外）
    if (!isCollabMove) {
      const swapCheck = this.battleEngine.stateManager.checkSwapValidity(
        sourceCard, sourcePosition, targetCard, targetPosition, playerId
      );
      
      if (!swapCheck.valid) {
        alert(`⚠️ カード交換不可\n\n${swapCheck.reason}`);
        return false;
      }
    }
    
    // ブルームの場合は重ね置き処理を実行
    if (isBloom) {
      // 手札からカードを削除（手札からのブルームの場合のみ）
      if (sourcePosition === 'hand') {
        // より精密な検索：IDと名前の両方を確認し、完全一致するものを探す
        let handIndex = -1;
        for (let i = 0; i < player.hand.length; i++) {
          const handCard = player.hand[i];
          // IDが一致する場合を優先、IDがない場合は名前とbloom_levelで判定
          if (sourceCard.id && handCard.id === sourceCard.id) {
            handIndex = i;
            break;
          } else if (!sourceCard.id && handCard.name === sourceCard.name && 
                     handCard.bloom_level === sourceCard.bloom_level) {
            handIndex = i;
            break;
          }
        }
        
        if (handIndex !== -1) {
          const removedCard = player.hand.splice(handIndex, 1)[0];
          console.log(`swapCards: 手札から削除: ${removedCard.name} (${removedCard.bloom_level}) インデックス: ${handIndex}`);
        } else {
          console.warn(`swapCards: 手札で対象カードが見つかりません:`, sourceCard);
        }
      }
      
      // PLACE_CARDで重ね置き実行
      const placeResult = this.battleEngine.stateManager.updateState('PLACE_CARD', {
        player: playerId,
        card: sourceCard,
        position: targetPosition
      });

      // ブルーム履歴の記録のみ（重ね置きはPLACE_CARDで実行済み）
      this.battleEngine.stateManager.addBloomHistory(playerId, targetPosition);
    } else {
      // 通常の交換処理（コラボ移動以外）- エール情報保持強化
      console.log(`🔄 通常交換: ${sourcePosition} ↔ ${targetPosition}`);
      console.log(`📋 移動元: ${sourceCard?.name} (エール: ${sourceCard?.yellCards?.length || 0}枚)`);
      console.log(`📋 移動先: ${targetCard?.name || 'null'} (エール: ${targetCard?.yellCards?.length || 0}枚)`);
      
      this.battleEngine.stateManager.updateState('SWAP_CARDS', {
        player: playerId,
        sourcePosition: sourcePosition,
        targetPosition: targetPosition
      });
      
      // エール情報保持の追加確認（通常交換でも適用）
      setTimeout(() => {
        const battleEnginePlayer = this.battleEngine.players[playerId];
        
        // 移動元のエール情報を移動先に確実に反映
        if (sourceCard?.yellCards?.length > 0) {
          const movedCard = battleEnginePlayer[targetPosition];
          if (movedCard && movedCard.name === sourceCard.name) {
            movedCard.yellCards = [...sourceCard.yellCards];
            console.log(`🔧 通常交換後エール保持: ${movedCard.name} → ${targetPosition} (エール: ${movedCard.yellCards.length}枚)`);
          }
        }
        
        // 移動先のエール情報を移動元に確実に反映
        if (targetCard?.yellCards?.length > 0) {
          const movedCard = battleEnginePlayer[sourcePosition];
          if (movedCard && movedCard.name === targetCard.name) {
            movedCard.yellCards = [...targetCard.yellCards];
            console.log(`🔧 通常交換後エール保持: ${movedCard.name} → ${sourcePosition} (エール: ${movedCard.yellCards.length}枚)`);
          }
        }
        
        this.battleEngine.updateUI();
      }, 30);
    }

    // Debutカード配置の記録（カード状態ベース）
    if (sourceCard.bloom_level === 'Debut' && !targetCard) {
      const updatedSourceCard = this.battleEngine.stateManager.recordJustPlayedDebut(sourceCard, playerId);
      // 更新されたカードで状態を再設定
      player[targetPosition] = updatedSourceCard;
    }
    
    // UI更新（State Managerとの同期を確実にする）
    this.battleEngine.updateUI();
    
    // 追加の遅延更新でState Manager状態を確実に反映
    setTimeout(() => {
      this.battleEngine.updateUI();
    }, 50);
    
    return true;
  }

  /**
   * デッキからホロパワーカードを1枚配置（コラボ移動時の強制処理）
   * @param {number} playerId - プレイヤーID
   * @returns {boolean} 配置成功/失敗
   */
  placeHoloPowerFromDeck(playerId) {
    const player = this.battleEngine.players[playerId];
    
    console.log(`🔍 [ホロパワー配置前] プレイヤー${playerId}状態:`);
    console.log(`  - center: ${player.center?.name || 'null'}`);
    console.log(`  - collab: ${player.collab?.name || 'null'}`);
    console.log(`  - holoPower: ${player.holoPower?.length || 0}枚`);
    console.log(`  - deck: ${player.deck?.length || 0}枚`);
    
    // デッキからホロパワーカードを取得
    if (player.deck && player.deck.length > 0) {
      const holoPowerCard = player.deck.shift(); // デッキの先頭から取得
      
      console.log(`🔍 取得したホロパワーカード: ${holoPowerCard.name}`, holoPowerCard);
      
      // ホロパワーエリアに配置
      if (!player.holoPower) {
        player.holoPower = [];
      }
      player.holoPower.push(holoPowerCard);
      
      console.log(`ホロパワーカード配置: ${holoPowerCard.name}`);
      
      console.log(`🔍 [ホロパワー配置後] プレイヤー${playerId}状態:`);
      console.log(`  - center: ${player.center?.name || 'null'}`);
      console.log(`  - collab: ${player.collab?.name || 'null'}`);
      console.log(`  - holoPower: ${player.holoPower?.length || 0}枚`);
      console.log(`  - ホロパワー最新: ${player.holoPower[player.holoPower.length-1]?.name || 'null'}`);
      
      // UI更新
      this.battleEngine.updateUI();
      
      // アニメーション効果（オプション）
      this.showHoloPowerPlacementEffect(holoPowerCard);
      
      return true; // 配置成功
    } else {
      console.error(`プレイヤー${playerId}のデッキが空です - ホロパワー配置失敗`);
      return false; // 配置失敗
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
        return;
    }
    
    // ドロップ先にカードがある場合は交換処理またはブルーム処理
    if (targetCard) {
      // ブルーム判定: 同名カードかつレベル進化の場合
      const isBloom = this.battleEngine.stateManager.isBloom(card, targetCard);
      
      if (isBloom) {
        // ブルーム可能性をチェック
        const bloomCheck = this.battleEngine.stateManager.canBloom(card, targetCard, 1);
        
        if (!bloomCheck.valid) {
          alert(`⚠️ ブルーム不可\n\n${bloomCheck.reason}`);
          return;
        }
        
        // ブルーム確認画面
        const confirmBloom = confirm(
          `🌸 ブルーム確認\n\n` +
          `${targetCard.name} (${targetCard.bloom_level})\n` +
          `↓ ブルーム ↓\n` +
          `${card.name} (${card.bloom_level})\n\n` +
          `ブルームを実行しますか？`
        );
        
        if (!confirmBloom) {
          return;
        }
        
        // ブルーム実行: PLACE_CARDアクションでスタック
        const cardCopy = JSON.parse(JSON.stringify(card));
        cardCopy.yells = cardCopy.yells || [];
        
        // 既存カードのエール情報を新しいカードに引き継ぎ
        if (targetCard && targetCard.yellCards && Array.isArray(targetCard.yellCards)) {
          cardCopy.yellCards = [...targetCard.yellCards];
          console.log(`エール引継ぎ: ${targetCard.yellCards.length}枚のエールを新しいカードに引き継ぎました`);
        }
        
        // その他の重要な状態情報も引き継ぎ
        if (targetCard && targetCard.cardState) {
          // 既存の状態情報を基に新しい状態を作成
          cardCopy.cardState = {
            ...targetCard.cardState,
            bloomedThisTurn: true,  // ブルームフラグを設定
            playedTurn: targetCard.cardState.playedTurn || 1  // 元の配置ターンを保持
          };
        }
        
        // ブルーム後のカード情報をログ出力
        console.log(`ブルーム実行: ${targetCard.name} (${targetCard.bloom_level}) → ${cardCopy.name} (${cardCopy.bloom_level})`);
        console.log(`新しいカード画像URL: ${cardCopy.image_url}`);
        console.log(`カードコピー詳細:`, cardCopy);
        
        // State Managerでブルーム実行（カード重ね）
        const result = this.battleEngine.stateManager.updateState('PLACE_CARD', {
          card: cardCopy,
          source: 'hand',
          position: targetPosition,
          player: 1,
          action: 'bloom'
        });
        
        // Battle Engineとの同期を確実にする
        if (result && result.success) {
          // 手札からカードを削除（正確なインデックスを使用）
          if (handIndex !== undefined && handIndex >= 0 && handIndex < player.hand.length) {
            // 元の手札インデックスを使用して正確に削除
            const removedCard = player.hand.splice(handIndex, 1)[0];
            console.log(`手札から削除: ${removedCard.name} (インデックス: ${handIndex})`);
          } else {
            console.warn(`手札インデックスが無効: ${handIndex}`);
          }
          
          console.log(`ブルーム成功: ${card.name} → ${targetPosition}`);
          
          // State Managerの状態更新が完了してからUI更新を実行
          const waitForBloomCompletion = () => {
            if (this.battleEngine.stateManager.bloomCompleted) {
              this.battleEngine.stateManager.bloomCompleted = false; // フラグをリセット
              this.updateHandDisplay();
              this.battleEngine.updateUI();
              console.log(`ブルーム後のUI更新完了: ${card.name}`);
            } else {
              // ブルーム完了を待つ
              setTimeout(waitForBloomCompletion, 10);
            }
          };
          
          setTimeout(waitForBloomCompletion, 30);
          
          return;
          
        } else {
          console.error('ブルーム処理が失敗しました:', result);
          alert('⚠️ ブルーム処理でエラーが発生しました');
          return;
        }
        
      } else if (targetCard) {
        // ホロライブTCGでは基本的にブルーム以外の自由な交換は許可されない
        alert(`⚠️ カード交換不可\n\nブルーム以外での交換はできません。\n\n- 同名カードでレベルが進化する場合のみブルーム可能\n- 空いている位置への配置は可能`);
        return;
      }
    } else {
      // 通常の配置処理（空の場所に配置）
      const cardCopy = this.createCardCopy(card);
      
      // カードに状態情報を追加
      const cardWithState = this.battleEngine.stateManager.addCardState(cardCopy, {
        playedTurn: this.battleEngine.gameState.turnCount || 1,
        playedByPlayer: 1,
        bloomedThisTurn: false,
        resting: false,
        damage: 0,
        yellCards: cardCopy.yellCards || []  // 既存のエール情報を保持
      });
      
      player[targetPosition] = cardWithState;
      player.hand.splice(handIndex, 1);
      
      console.log(`通常配置: ${card.name} → ${targetPosition}`);
    }
    
    // UI更新（ブルーム処理が成功した場合は遅延更新が既に実行されるためスキップ）
    if (!targetCard || !this.battleEngine.stateManager.isBloom(card, targetCard)) {
      this.updateHandDisplay();
      this.battleEngine.updateUI();
    }
  }
}

// グローバルアクセス用
window.HandManager = HandManager;
