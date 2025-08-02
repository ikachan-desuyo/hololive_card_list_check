/**
 * 手札管理マネージャー
 * 手札の表示・更新・ドラッグ&ドロップ処理を管理する
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
}

// グローバルアクセス用
window.HandManager = HandManager;
