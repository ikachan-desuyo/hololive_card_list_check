const fs = require('fs');
const path = require('path');

/**
 * CSV形式でカード効果データを管理するツール
 */

// CSV読み込み用の簡単なパーサー
function parseCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        return obj;
    });
}

// CSVデータから効果実装状況を出力
function exportImplementationStatusToCSV() {
    console.log('📤 実装状況をCSV形式でエクスポート中...\n');
    
    const cardsDir = './cards';
    if (!fs.existsSync(cardsDir)) {
        console.error('❌ cards/ ディレクトリが見つかりません');
        return;
    }
    
    const cardFiles = fs.readdirSync(cardsDir)
        .filter(file => file.startsWith('h') && file.endsWith('.js'))
        .sort();
    
    const csvData = [];
    const headers = ['card_id', 'card_name', 'effect_type', 'effect_name', 'implemented', 'has_condition', 'has_effect', 'status'];
    
    csvData.push(headers.join(','));
    
    cardFiles.forEach(file => {
        const filePath = path.join(cardsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const cardId = file.replace('.js', '');
        
        // カード名を抽出
        const nameMatch = content.match(/cardName\s*:\s*['"`]([^'"`]+)['"`]/);
        const cardName = nameMatch ? nameMatch[1] : cardId;
        
        // 各効果を検出
        const effectPatterns = [
            { type: 'bloom', pattern: /bloomEffect\s*:/ },
            { type: 'collab', pattern: /collabEffect\s*:/ },
            { type: 'art1', pattern: /art1\s*:/ },
            { type: 'art2', pattern: /art2\s*:/ },
            { type: 'support', pattern: /supportEffect\s*:/ },
            { type: 'oshi', pattern: /oshiSkill\s*:/ },
            { type: 'sp_oshi', pattern: /spOshiSkill\s*:/ },
            { type: 'yell', pattern: /yellEffect\s*:/ }
        ];
        
        let hasAnyEffect = false;
        
        effectPatterns.forEach(({ type, pattern }) => {
            if (pattern.test(content)) {
                hasAnyEffect = true;
                
                // 効果名を抽出
                const namePattern = new RegExp(`${type}.*?name\\s*:\\s*['"\`]([^'"\`]+)['"\`]`, 'i');
                const effectNameMatch = content.match(namePattern);
                const effectName = effectNameMatch ? effectNameMatch[1] : `${type} effect`;
                
                // condition/effect関数の存在確認
                const sectionPattern = new RegExp(`${type}\\s*:\\s*\\{[\\s\\S]*?\\}`, 'i');
                const sectionMatch = content.match(sectionPattern);
                
                let hasCondition = false;
                let hasEffect = false;
                let status = 'not_implemented';
                
                if (sectionMatch) {
                    const section = sectionMatch[0];
                    hasCondition = /condition\s*:\s*/.test(section);
                    hasEffect = /effect\s*:\s*/.test(section);
                    
                    if (hasCondition && hasEffect) {
                        status = 'implemented';
                    } else if (hasCondition || hasEffect) {
                        status = 'partial';
                    }
                }
                
                csvData.push([
                    cardId,
                    cardName,
                    type,
                    effectName,
                    status === 'implemented' ? 'YES' : 'NO',
                    hasCondition ? 'YES' : 'NO',
                    hasEffect ? 'YES' : 'NO',
                    status
                ].join(','));
            }
        });
        
        // 効果がないカードも記録
        if (!hasAnyEffect) {
            csvData.push([
                cardId,
                cardName,
                'none',
                'No effects',
                'N/A',
                'N/A',
                'N/A',
                'no_effects'
            ].join(','));
        }
    });
    
    const csvContent = csvData.join('\n');
    const outputFile = 'card-effects-status.csv';
    fs.writeFileSync(outputFile, csvContent);
    
    console.log(`✅ CSV出力完了: ${outputFile}`);
    console.log(`📊 総エントリー数: ${csvData.length - 1}`);
    
    return outputFile;
}

// CSVから一括実装用のテンプレートを生成
function generateEffectTemplatesFromCSV(csvFile) {
    console.log(`📥 ${csvFile} からテンプレート生成中...`);
    
    if (!fs.existsSync(csvFile)) {
        console.error(`❌ CSVファイルが見つかりません: ${csvFile}`);
        return;
    }
    
    const csvContent = fs.readFileSync(csvFile, 'utf8');
    const cards = parseCSV(csvContent);
    
    console.log(`📋 ${cards.length}件のカードデータを読み込み`);
    
    // 未実装カードをフィルター
    const unimplementedCards = cards.filter(card => 
        card.implemented === 'NO' && card.effect_type !== 'none'
    );
    
    console.log(`🔧 未実装効果: ${unimplementedCards.length}件`);
    
    // 効果タイプ別にグループ化
    const groupedByType = {};
    unimplementedCards.forEach(card => {
        if (!groupedByType[card.effect_type]) {
            groupedByType[card.effect_type] = [];
        }
        groupedByType[card.effect_type].push(card);
    });
    
    console.log('\n📊 効果タイプ別統計:');
    Object.keys(groupedByType).forEach(type => {
        console.log(`   ${type}: ${groupedByType[type].length}件`);
    });
    
    return groupedByType;
}

// 使用例とメイン実行
if (require.main === module) {
    const command = process.argv[2];
    
    switch (command) {
        case 'export':
            exportImplementationStatusToCSV();
            break;
            
        case 'import':
            const csvFile = process.argv[3] || 'card-effects-status.csv';
            generateEffectTemplatesFromCSV(csvFile);
            break;
            
        case 'help':
        default:
            console.log('📋 CSV効果管理ツール');
            console.log('');
            console.log('使用方法:');
            console.log('  node csv-effect-manager.js export    - 現在の実装状況をCSVで出力');
            console.log('  node csv-effect-manager.js import    - CSVから未実装効果を分析');
            console.log('');
            console.log('出力ファイル: card-effects-status.csv');
            break;
    }
}

module.exports = {
    parseCSV,
    exportImplementationStatusToCSV,
    generateEffectTemplatesFromCSV
};
