/**
 * カード効果スケルトンファイル自動生成ツール
 * 未実装カードに対してスケルトンJSファイルを生成します
 */

const fs = require('fs');
const path = require('path');

// 設定
const cardDataPath = path.join(__dirname, 'json_file', 'card_data.json');
const cardsDir = path.join(__dirname, 'battle_simulator', 'card-effects', 'cards');
const dryRun = process.argv.includes('--dry-run');
const limitCount = process.argv.find(arg => arg.startsWith('--limit='));
const maxCards = limitCount ? parseInt(limitCount.split('=')[1]) : null;

console.log('🚀 カード効果スケルトンファイル生成ツール');
console.log(`💿 カードデータ: ${cardDataPath}`);
console.log(`📁 出力ディレクトリ: ${cardsDir}`);
console.log(`🔍 動作モード: ${dryRun ? 'DRY RUN (ファイル生成なし)' : 'LIVE (ファイル生成あり)'}`);
if (maxCards) {
  console.log(`📊 生成制限: 最大 ${maxCards} ファイル`);
}
console.log('');

/**
 * カードIDから基本番号を取得（レアリティサフィックスを除去）
 */
function getBaseCardNumber(cardId) {
  return cardId.replace(/_[A-Z]+$/, '');
}

/**
 * ファイル名を生成
 */
function getFileName(baseNumber) {
  return `${baseNumber}.js`;
}

/**
 * 既存のカードファイルリストを取得
 */
function getExistingCardFiles() {
  if (!fs.existsSync(cardsDir)) {
    console.error(`❌ カードディレクトリが存在しません: ${cardsDir}`);
    process.exit(1);
  }
  
  return fs.readdirSync(cardsDir)
    .filter(file => file.endsWith('.js') && file !== 'README.md')
    .map(file => file.replace('.js', ''));
}

/**
 * カードデータを読み込み
 */
function loadCardData() {
  if (!fs.existsSync(cardDataPath)) {
    console.error(`❌ カードデータファイルが存在しません: ${cardDataPath}`);
    process.exit(1);
  }
  
  try {
    const data = fs.readFileSync(cardDataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ カードデータの読み込みに失敗:', error.message);
    process.exit(1);
  }
}

/**
 * 文字列をJavaScript文字列リテラル用にエスケープ
 */
function escapeJavaScriptString(str) {
  return str
    .replace(/\\/g, '\\\\')  // バックスラッシュをエスケープ
    .replace(/'/g, "\\'")    // シングルクォートをエスケープ
    .replace(/"/g, '\\"')    // ダブルクォートをエスケープ
    .replace(/\n/g, '\\n')   // 改行をエスケープ
    .replace(/\r/g, '\\r')   // キャリッジリターンをエスケープ
    .replace(/\t/g, '\\t');  // タブをエスケープ
}
/**
 * カラー文字列を正規化
 */
function normalizeColor(color) {
  const colorMap = {
    '赤': 'red',
    '青': 'blue', 
    '緑': 'green',
    '黄': 'yellow',
    '紫': 'purple',
    '白': 'white',
    '無色': 'colorless'
  };
  return colorMap[color] || color;
}

/**
 * アーツのコスト情報を解析
 */
function parseArtsCost(skill) {
  if (!skill.icons || !skill.icons.main) {
    return { any: 1 };
  }
  
  const cost = {};
  skill.icons.main.forEach(icon => {
    if (icon === 'any') {
      cost.any = (cost.any || 0) + 1;
    } else {
      const normalizedColor = normalizeColor(icon);
      cost[normalizedColor] = (cost[normalizedColor] || 0) + 1;
    }
  });
  
  return cost;
}

/**
 * 特攻情報を解析
 */
function parseTokkou(skill) {
  if (!skill.icons || !skill.icons.tokkou) {
    return null;
  }
  
  const tokkou = {};
  skill.icons.tokkou.forEach(icon => {
    const match = icon.match(/^(\w+)\+(\d+)$/);
    if (match) {
      const color = normalizeColor(match[1]);
      const damage = parseInt(match[2]);
      tokkou[color] = damage;
    }
  });
  
  return Object.keys(tokkou).length > 0 ? tokkou : null;
}

/**
 * スケルトンファイルの内容を生成
 */
function generateSkeletonContent(baseNumber, representative, variants) {
  const data = representative.data;
  const cardId = baseNumber;
  const varName = `cardEffect_${cardId.replace(/-/g, '_')}`;
  
  // 基本情報
  const cardName = data.name || 'Unknown Card';
  const cardType = data.card_type || 'Unknown';
  const color = data.color ? normalizeColor(data.color) : undefined;
  const hp = data.hp ? parseInt(data.hp) : undefined;
  const bloomLevel = data.bloom_level;
  const batonTouch = data.baton_touch ? normalizeColor(data.baton_touch) : undefined;
  const rarity = data.rarity;
  
  // スキル解析
  const skills = data.skills || [];
  const bloomEffect = skills.find(s => s.subtype === 'ブルームエフェクト');
  const collabEffect = skills.find(s => s.subtype === 'コラボエフェクト');
  const giftEffect = skills.find(s => s.subtype === 'ギフト');
  const artSkills = skills.filter(s => s.type === 'アーツ');
  const supportEffect = skills.find(s => s.type === 'サポート効果');
  
  let content = `/**
 * ${cardId} - カード効果定義
 * ${cardName}
 */

// カード効果の定義
const ${varName} = {
  // カード基本情報
  cardId: '${cardId}',
  cardName: '${cardName}',
  cardType: '${cardType}',`;

  if (color) {
    content += `\n  color: '${color}',`;
  }
  
  if (bloomLevel) {
    content += `\n  bloomLevel: '${bloomLevel}',`;
  }
  
  if (hp) {
    content += `\n  hp: ${hp},`;
  }
  
  if (batonTouch) {
    content += `\n  batonTouch: '${batonTouch}',`;
  }
  
  if (rarity) {
    content += `\n  rarity: '${rarity}',`;
  }
  
  content += '\n  \n  // 効果定義\n  effects: {';
  
  // ブルームエフェクト
  if (bloomEffect) {
    content += `
    // ブルームエフェクト: ${bloomEffect.name}
    bloomEffect: {
      type: 'bloom',
      name: '${bloomEffect.name}',
      description: '${escapeJavaScriptString(bloomEffect.description)}',
      timing: 'manual',
      auto_trigger: 'on_bloom',
      condition: (card, gameState, battleEngine) => {
        // TODO: 発動条件を実装
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(\`🌸 [ブルームエフェクト] \${card.name || '${cardId}'}の「${bloomEffect.name}」が発動！\`);
        
        // TODO: 効果処理を実装
        
        return {
          success: true,
          message: \`\${card.name || '${cardId}'}のブルームエフェクト「${bloomEffect.name}」が発動しました\`
        };
      }
    },`;
  }
  
  // コラボエフェクト
  if (collabEffect) {
    content += `
    // コラボエフェクト: ${collabEffect.name}
    collabEffect: {
      type: 'collab',
      name: '${collabEffect.name}',
      description: '${escapeJavaScriptString(collabEffect.description)}',
      timing: 'manual',
      auto_trigger: 'on_collab',
      condition: (card, gameState, battleEngine) => {
        // TODO: 発動条件を実装
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(\`🤝 [コラボエフェクト] \${card.name || '${cardId}'}の「${collabEffect.name}」が発動！\`);
        
        // TODO: 効果処理を実装
        
        return {
          success: true,
          message: \`\${card.name || '${cardId}'}のコラボエフェクト「${collabEffect.name}」が発動しました\`
        };
      }
    },`;
  }
  
  // ギフト効果
  if (giftEffect) {
    content += `
    // ギフト効果: ${giftEffect.name}
    giftEffect: {
      type: 'gift',
      name: '${giftEffect.name}',
      description: '${escapeJavaScriptString(giftEffect.description)}',
      timing: 'permanent',
      condition: (card, gameState, battleEngine) => {
        // TODO: 発動条件を実装
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(\`🎁 [ギフト効果] \${card.name || '${cardId}'}の「${giftEffect.name}」が発動！\`);
        
        // TODO: 効果処理を実装
        
        return {
          success: true,
          message: \`\${card.name || '${cardId}'}のギフト効果「${giftEffect.name}」が発動しました\`
        };
      }
    },`;
  }
  
  // サポート効果
  if (supportEffect) {
    content += `
    // サポート効果
    supportEffect: {
      type: 'support',
      timing: 'manual',
      name: 'サポート効果',
      description: '${escapeJavaScriptString(supportEffect.name)}',
      condition: (card, gameState, battleEngine) => {
        // TODO: 使用条件を実装
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(\`📋 [サポート効果] \${card.name || '${cardId}'}が発動！\`);
        
        // TODO: 効果処理を実装
        
        return {
          success: true,
          message: \`\${card.name || '${cardId}'}のサポート効果が発動しました\`
        };
      }
    },`;
  }
  
  // アーツ
  artSkills.forEach((skill, index) => {
    const artName = skill.name || `アーツ ${index + 1}`;
    const damage = skill.dmg ? parseInt(skill.dmg) : 0;
    const cost = parseArtsCost(skill);
    const tokkou = parseTokkou(skill);
    
    content += `
    // アーツ: ${artName}
    art${index + 1}: {
      type: 'art',
      name: '${artName}',
      description: '${escapeJavaScriptString(skill.description || '')}',
      cost: ${JSON.stringify(cost)},
      damage: ${damage},`;
    
    if (tokkou) {
      content += `\n      tokkou: ${JSON.stringify(tokkou)},`;
    }
    
    content += `
      timing: 'manual',
      auto_trigger: 'arts',
      condition: (card, gameState, battleEngine) => {
        // TODO: アーツ使用条件を実装（エールコストチェックなど）
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(\`🎨 [アーツ] \${card.name || '${cardId}'}の「${artName}」が発動！\`);
        
        // TODO: アーツ効果を実装
        
        return {
          success: true,
          message: \`\${card.name || '${cardId}'}の「${artName}」で${damage}ダメージ！\`,
          damage: ${damage},
          target: 'opponent'
        };
      }
    },`;
  });
  
  content += `
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['${cardId}'] = ${varName};
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: '${cardId}',
    effect: ${varName}
  });
}

// グローバルに公開
window.${varName} = ${varName};
`;

  return content;
}

/**
 * メイン処理
 */
function main() {
  // データ読み込み
  const cardData = loadCardData();
  const existingFiles = getExistingCardFiles();
  
  console.log(`📊 総カード数: ${Object.keys(cardData).length}`);
  console.log(`📂 既存ファイル数: ${existingFiles.length}`);
  console.log('');
  
  // カードを基本番号でグループ化
  const cardsByBaseNumber = {};
  
  Object.entries(cardData).forEach(([cardId, card]) => {
    const baseNumber = getBaseCardNumber(cardId);
    
    if (!cardsByBaseNumber[baseNumber]) {
      cardsByBaseNumber[baseNumber] = [];
    }
    
    cardsByBaseNumber[baseNumber].push({
      id: cardId,
      data: card
    });
  });
  
  console.log(`🔢 ユニークなカード番号: ${Object.keys(cardsByBaseNumber).length}`);
  
  // 未実装カードを特定
  const unimplementedCards = [];
  
  Object.entries(cardsByBaseNumber).forEach(([baseNumber, variants]) => {
    if (!existingFiles.includes(baseNumber)) {
      // このカードは未実装
      // 最も高いレアリティまたは最初の variant を代表として使用
      const representative = variants.reduce((best, current) => {
        const rarities = ['C', 'U', 'R', 'RR', 'SR', 'UR'];
        const bestRarity = best.data.rarity || 'C';
        const currentRarity = current.data.rarity || 'C';
        
        const bestIndex = rarities.indexOf(bestRarity);
        const currentIndex = rarities.indexOf(currentRarity);
        
        return currentIndex > bestIndex ? current : best;
      }, variants[0]);
      
      unimplementedCards.push({
        baseNumber,
        representative,
        variants
      });
    }
  });
  
  console.log(`🎯 未実装カード数: ${unimplementedCards.length}`);
  console.log('');
  
  if (unimplementedCards.length === 0) {
    console.log('✅ すべてのカードが実装済みです！');
    return;
  }
  
  // 未実装カード一覧表示
  console.log('📋 未実装カード一覧:');
  unimplementedCards.slice(0, 10).forEach(card => {
    const data = card.representative.data;
    console.log(`  📄 ${card.baseNumber}: ${data.name} (${data.card_type}) [${data.rarity || '-'}]`);
  });
  
  if (unimplementedCards.length > 10) {
    console.log(`  ... その他 ${unimplementedCards.length - 10} 件`);
  }
  
  console.log('');
  
  if (dryRun) {
    console.log('🔍 DRY RUN モードのため、ファイル生成はスキップします');
    console.log(`💡 実際に生成するには --dry-run オプションを外して実行してください`);
    
    // サンプル表示
    if (unimplementedCards.length > 0) {
      console.log('\n📖 サンプル生成内容:');
      const sample = unimplementedCards[0];
      console.log('ファイル名:', getFileName(sample.baseNumber));
      console.log('---');
      console.log(generateSkeletonContent(sample.baseNumber, sample.representative, sample.variants).substring(0, 500) + '...');
    }
  } else {
    console.log('🔨 スケルトンファイルを生成中...');
    
    let generatedCount = 0;
    let errorCount = 0;
    
    const cardsToGenerate = maxCards ? unimplementedCards.slice(0, maxCards) : unimplementedCards;
    console.log(`📋 生成対象: ${cardsToGenerate.length} ファイル`);
    console.log('');
    
    cardsToGenerate.forEach(card => {
      try {
        const fileName = getFileName(card.baseNumber);
        const filePath = path.join(cardsDir, fileName);
        const content = generateSkeletonContent(card.baseNumber, card.representative, card.variants);
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${fileName} - ${card.representative.data.name}`);
        generatedCount++;
      } catch (error) {
        console.error(`❌ ${card.baseNumber} の生成に失敗:`, error.message);
        errorCount++;
      }
    });
    
    console.log('');
    console.log(`🎉 完了: ${generatedCount}個のファイルを生成`);
    if (errorCount > 0) {
      console.log(`⚠️  エラー: ${errorCount}個のファイルで生成失敗`);
    }
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = {
  getBaseCardNumber,
  getFileName,
  getExistingCardFiles,
  loadCardData,
  escapeJavaScriptString,
  normalizeColor,
  parseArtsCost,
  parseTokkou,
  generateSkeletonContent
};