/**
 * ホロライブTCG CPU対戦ロジック
 * CPUの思考と行動を管理する
 */

class HololiveCPULogic {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
    this.difficulty = 'normal'; // easy, normal, hard
    this.thinkingTime = 1000; // CPUの思考時間（ミリ秒）
  }

  // CPUのターン実行
  async executeCPUTurn() {
    if (this.battleEngine.gameState.currentPlayer !== 2) return;
    
    
    // CPU用の処理は各ステップの中で自動実行される
    // ここでは手動でフェーズを進める必要はない
    // battle_engine.jsの各executeXXXStep関数が既に自動進行を管理している
  }

  async processCPUPhase() {
    const phase = this.battleEngine.gameState.currentPhase;
    const cpu = this.battleEngine.players[2];
    
    switch (phase) {
      case 0: // リセットステップ
        break;
        
      case 1: // 手札ステップ
        break;
        
      case 2: // エールステップ
        await this.cpuSendYell();
        break;
        
      case 3: // メインステップ
        await this.cpuMainPhase();
        break;
        
      case 4: // パフォーマンスステップ
        await this.cpuPerformancePhase();
        break;
        
      case 5: // エンドステップ
        break;
    }
  }

  async cpuSendYell() {
    const cpu = this.battleEngine.players[2];
    
    if (cpu.yellDeck.length === 0) return;
    
    // エール送付先の優先順位決定
    const targets = this.getYellTargets();
    
    if (targets.length > 0) {
      const target = targets[0]; // 最優先のターゲット
      
      // エール送付の実行
      const yellCard = cpu.yellDeck.pop();
      this.attachYellToHolomem(target.card, yellCard);
    }
  }

  getYellTargets() {
    const cpu = this.battleEngine.players[2];
    const targets = [];
    
    // センターホロメンを最優先
    if (cpu.collab) {
      targets.push({ position: 'collab', card: cpu.collab, priority: 10 });
    }
    
    if (cpu.center) {
      targets.push({ position: 'center', card: cpu.center, priority: 8 });
    }
    
    // バックホロメンは低優先度
    if (cpu.back1) {
      targets.push({ position: 'back1', card: cpu.back1, priority: 3 });
    }
    
    if (cpu.back2) {
      targets.push({ position: 'back2', card: cpu.back2, priority: 3 });
    }
    
    if (cpu.back3) {
      targets.push({ position: 'back3', card: cpu.back3, priority: 3 });
    }
    
    // 優先度順にソート
    return targets.sort((a, b) => b.priority - a.priority);
  }

  attachYellToHolomem(holomem, yellCard) {
    // ホロメンにエールを付ける処理
    if (!holomem.yellCards) {
      holomem.yellCards = [];
    }
    holomem.yellCards.push(yellCard);
    
    
    // UI更新
    this.battleEngine.updateUI();
    this.battleEngine.updateCardAreas();
  }

  async cpuMainPhase() {
    const cpu = this.battleEngine.players[2];
    
    // メインフェーズでの行動決定
    const actions = this.planMainPhaseActions();
    
    // 計画された行動を実行
    for (const action of actions) {
      await this.executeAction(action);
      await this.delay(this.thinkingTime / 2);
    }
  }

  planMainPhaseActions() {
    const cpu = this.battleEngine.players[2];
    const actions = [];
    
    // 1. ホロメンの配置を優先
    const holomenInHand = cpu.hand.filter(card => card.card_type === 'ホロメン');
    
    holomenInHand.forEach(card => {
      const position = this.findBestPositionForHolomem(card);
      if (position) {
        actions.push({
          type: 'play_holomem',
          card: card,
          position: position,
          priority: this.getHolomenPlayPriority(card, position)
        });
      }
    });
    
    // 2. サポートカードの使用を検討
    const supportInHand = cpu.hand.filter(card => card.card_type.includes('サポート'));
    
    supportInHand.forEach(card => {
      if (this.shouldPlaySupportCard(card)) {
        actions.push({
          type: 'play_support',
          card: card,
          priority: this.getSupportPlayPriority(card)
        });
      }
    });
    
    // 優先度順にソート
    return actions.sort((a, b) => b.priority - a.priority);
  }

  findBestPositionForHolomem(card) {
    const cpu = this.battleEngine.players[2];
    
    // センターポジションを優先
    if (!cpu.collab) return 'collab';
    if (!cpu.center) return 'center';
    
    // バックポジション
    if (!cpu.back1) return 'back1';
    if (!cpu.back2) return 'back2';
    if (!cpu.back3) return 'back3';
    
    return null; // 満員
  }

  getHolomenPlayPriority(card, position) {
    let priority = 5;
    
    // センターポジションは高優先度
    if (position === 'collab') priority += 5;
    if (position === 'center') priority += 3;
    
    // カードの強さに応じて優先度調整
    if (card.hp && parseInt(card.hp) > 100) priority += 2;
    
    return priority;
  }

  shouldPlaySupportCard(card) {
    const cpu = this.battleEngine.players[2];
    
    // LIMITED制限チェック（統一管理関数を使用）
    if (card.card_type?.includes('LIMITED')) {
      // CardInteractionManagerの統一関数を使用
      if (this.battleEngine.cardInteractionManager) {
        const canUse = this.battleEngine.cardInteractionManager.canUseLimitedEffect(card, 'hand');
        if (!canUse) {
          return false;
        }
      } else {
        // フォールバック（旧来の方式） + 先行1ターン目制限
        const stateManager = this.battleEngine.stateManager;
        if (stateManager && typeof stateManager.canUseLimitedNow === 'function') {
          const check = stateManager.canUseLimitedNow(2); // CPUはプレイヤーID 2
          if (!check.canUse) {
            return false; // 理由は不要（ログ簡略）
          }
        } else {
          // 最低限のガード
            if (cpu.isFirstPlayer && (cpu.playerTurnCount || 0) <= 1) {
              return false;
            }
            if (cpu.usedLimitedThisTurn) {
              return false;
            }
        }
      }
    }
    
    // カード特有の使用条件は簡略化
    return Math.random() < 0.3; // 30%の確率で使用
  }

  getSupportPlayPriority(card) {
    let priority = 3;
    
    // LIMITEDカードは高優先度
    if (card.card_type.includes('LIMITED')) priority += 2;
    
    // ドロー効果があるカードは優先
    if (card.skills && card.skills.some(skill => 
      skill.name && skill.name.includes('引く'))) {
      priority += 3;
    }
    
    return priority;
  }

  async executeAction(action) {
    const cpu = this.battleEngine.players[2];
    
    switch (action.type) {
      case 'play_holomem':
        await this.cpuPlayHolomem(action.card, action.position);
        break;
        
      case 'play_support':
        await this.cpuPlaySupport(action.card);
        break;
    }
  }

  async cpuPlayHolomem(card, position) {
    const cpu = this.battleEngine.players[2];
    const handIndex = cpu.hand.indexOf(card);
    
    if (handIndex === -1) return;
    
    // ホロメンを配置
    cpu[position] = card;
    cpu.hand.splice(handIndex, 1);
    
    this.battleEngine.updateUI();
  }

  async cpuPlaySupport(card) {
    const cpu = this.battleEngine.players[2];
    const handIndex = cpu.hand.indexOf(card);
    
    if (handIndex === -1) return;
    
    // サポートカード使用
    cpu.hand.splice(handIndex, 1);
    cpu.archive.push(card);
    
    if (card.card_type.includes('LIMITED')) {
      cpu.usedLimitedThisTurn = true;
      if (cpu.gameState) {
        cpu.gameState.usedLimitedThisTurn = true;
      }
    }
    
    
    // 簡易的な効果処理
    await this.processSupportEffect(card);
    
    this.battleEngine.updateUI();
  }

  async processSupportEffect(card) {
    const cpu = this.battleEngine.players[2];
    
    // 非常に簡略化された効果処理
    if (card.skills && card.skills.length > 0) {
      const effect = card.skills[0].name;
      
      if (effect && effect.includes('引く')) {
        // ドロー効果
        const drawCount = this.extractDrawCount(effect);
        for (let i = 0; i < drawCount; i++) {
          this.battleEngine.drawCard(2);
        }
      }
    }
  }

  extractDrawCount(effectText) {
    // テキストからドロー枚数を抽出（簡易版）
    const match = effectText.match(/(\d+)枚/);
    return match ? parseInt(match[1]) : 1;
  }

  async cpuPerformancePhase() {
    const cpu = this.battleEngine.players[2];
    const player = this.battleEngine.players[1];
    
    // アーツ使用の判定
    const attackTargets = this.getAttackTargets();

    if (cpu.collab && this.canUseArts(cpu.collab)) {
      const target = this.selectAttackTarget(attackTargets);
      if (target) {
        await this.cpuUseArts(cpu.collab, target);
      }
    }
    
    if (cpu.center && this.canUseArts(cpu.center)) {
      const target = this.selectAttackTarget(attackTargets);
      if (target) {
        await this.cpuUseArts(cpu.center, target);
      }
    }
  }

  getAttackTargets() {
    const player = this.battleEngine.players[1];
    const targets = [];
    
    // プレイヤーのホロメンを攻撃対象として取得
    if (player.collab) targets.push({ type: 'holomem', card: player.collab, position: 'collab' });
    if (player.center) targets.push({ type: 'holomem', card: player.center, position: 'center' });
    if (player.back1) targets.push({ type: 'holomem', card: player.back1, position: 'back1' });
    if (player.back2) targets.push({ type: 'holomem', card: player.back2, position: 'back2' });
    if (player.back3) targets.push({ type: 'holomem', card: player.back3, position: 'back3' });
    
    // ライフへの攻撃も可能
    if (player.life.length > 0) {
      targets.push({ type: 'life', position: 'life' });
    }
    
    return targets;
  }

  canUseArts(holomem) {
    // アーツ使用可能かチェック（簡易版）
    if (!holomem.skills || holomem.skills.length === 0) return false;
    
    // お休み状態でないかチェック
    const cpu = this.battleEngine.players[2];
    const isResting = cpu.restHolomem.some(pos => cpu[pos] === holomem);
    
    return !isResting;
  }

  selectAttackTarget(targets) {
    if (targets.length === 0) return null;
    
    // 攻撃対象の優先順位
    const priorityOrder = ['collab', 'center', 'life', 'back1', 'back2', 'back3'];

    for (const priority of priorityOrder) {
      const target = targets.find(t => t.position === priority);
      if (target) return target;
    }
    
    return targets[0];
  }

  async cpuUseArts(attacker, target) {
    
    // ダメージ計算（簡易版）
    const damage = this.calculateDamage(attacker, target);
    
    if (target.type === 'holomem') {
      await this.dealDamageToHolomem(target.card, damage);
    } else if (target.type === 'life') {
      await this.dealDamageToLife(damage);
    }
    
    // 攻撃後、アーツを使用したホロメンはお休み状態に
    const cpu = this.battleEngine.players[2];
    const position = this.findHolomenPosition(attacker);
    if (position) {
      cpu.restHolomem.push(position);
    }
    
    await this.delay(this.thinkingTime);
  }

  calculateDamage(attacker, target) {
    // 基本ダメージ（簡易版）
    let damage = 50;
    
    if (attacker.skills && attacker.skills.length > 0) {
      const artsSkill = attacker.skills.find(skill => skill.type === 'アーツ');
      if (artsSkill && artsSkill.dmg) {
        damage = parseInt(artsSkill.dmg) || 50;
      }
    }
    
    return damage;
  }

  async dealDamageToHolomem(holomem, damage) {
    const hp = parseInt(holomem.hp) || 100;
    
    if (damage >= hp) {
      // ホロメンダウン
      await this.downHolomem(holomem);
    } else {
    }
  }

  async dealDamageToLife(damage) {
    const player = this.battleEngine.players[1];
    
    if (player.life.length > 0) {
      const lostLife = player.life.pop();
      player.archive.push(lostLife);
      
      this.battleEngine.updateUI();
      this.battleEngine.checkVictoryConditions();
    }
  }

  async downHolomem(holomem) {
    const player = this.battleEngine.players[1];
    
    // ホロメンをステージから除去してアーカイブへ
    ['collab', 'center', 'back1', 'back2', 'back3'].forEach(pos => {
      if (player[pos] === holomem) {
        player[pos] = null;
        player.archive.push(holomem);
      }
    });
    
    this.battleEngine.updateUI();
    this.battleEngine.checkVictoryConditions();
  }

  findHolomenPosition(holomem) {
    const cpu = this.battleEngine.players[2];
    
    const positions = ['collab', 'center', 'back1', 'back2', 'back3'];
    return positions.find(pos => cpu[pos] === holomem);
  }

  // CPUの思考レベル設定
  setDifficulty(level) {
    this.difficulty = level;
    
    switch (level) {
      case 'easy':
        this.thinkingTime = 500;
        break;
      case 'normal':
        this.thinkingTime = 1000;
        break;
      case 'hard':
        this.thinkingTime = 1500;
        break;
    }
  }

  // 非同期待機ユーティリティ
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// グローバルインスタンス
let cpuLogic = null;

// バトルエンジンの初期化完了後にCPUロジックを初期化
document.addEventListener('DOMContentLoaded', () => {
  // バトルエンジンの初期化を待つ
  const initCPU = () => {
    if (window.battleEngine) {
      cpuLogic = new HololiveCPULogic(window.battleEngine);
    } else {
      setTimeout(initCPU, 100);
    }
  };
  
  initCPU();
});
