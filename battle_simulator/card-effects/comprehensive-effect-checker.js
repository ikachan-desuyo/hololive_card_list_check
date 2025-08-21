const fs = require('fs');
const path = require('path');

/**
 * カード効果実装の包括的分析ツール
 * 各効果タイプ（ブルーム、コラボ、アーツ、サポート等）の実装状況を詳細チェック
 */

function analyzeCardEffectImplementations() {
    console.log('🔍 カード効果実装の包括的分析を開始...\n');
    
    const cardsDir = './cards';
    if (!fs.existsSync(cardsDir)) {
        console.error('❌ cards/ ディレクトリが見つかりません');
        return [];
    }
    
    // 既存のCSVファイルから動作確認結果を読み込み
    const existingChecks = loadExistingCSV();
    
    const cardFiles = fs.readdirSync(cardsDir)
        .filter(file => file.startsWith('h') && file.endsWith('.js'))
        .sort();
    
    const results = [];
    let totalEffects = 0;
    let implementedEffects = 0;
    let missingEffects = 0;
    let testedEffects = 0;
    
    console.log('📋 各カードの効果実装状況:\n');
    
    cardFiles.forEach(file => {
        const filePath = path.join(cardsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const analysis = analyzeCardEffects(file, content);
        
        // 既存のチェック結果をマージ
        analysis.effectTypes.forEach(effect => {
            const key = `${file.replace('.js', '')}_${effect.name}`;
            if (existingChecks[key]) {
                effect.manualTestResult = existingChecks[key].manualTestResult;
                effect.testNotes = existingChecks[key].testNotes;
                if (effect.manualTestResult === '動作確認済み') {
                    testedEffects++;
                }
            } else {
                effect.manualTestResult = '未確認';
                effect.testNotes = '';
            }
        });
        
        results.push(analysis);
        
        totalEffects += analysis.totalEffects;
        implementedEffects += analysis.implementedEffects;
        missingEffects += analysis.missingEffects;
        
        console.log(`${analysis.hasAllEffects ? '✅' : '⚠️ '} ${file}:`);
        
        analysis.effectTypes.forEach(effect => {
            const status = effect.implemented ? '✅' : '❌';
            const testStatus = effect.manualTestResult === '動作確認済み' ? '🎯' : 
                              effect.manualTestResult === 'エラー' ? '❌' : '⚪';
            const detail = effect.hasFunction ? '(関数あり)' : effect.reason || '(関数なし)';
            console.log(`   ${status}${testStatus} ${effect.name}: ${effect.description} ${detail}`);
            if (effect.testNotes && effect.testNotes !== '未確認' && effect.testNotes !== effect.manualTestResult) {
                console.log(`      📝 テスト結果: ${effect.testNotes}`);
            }
            if (effect.manualTestResult && effect.manualTestResult !== '未確認') {
                console.log(`      🔍 動作確認: ${effect.manualTestResult}`);
            }
        });
        
        if (analysis.missingEffects > 0) {
            console.log(`   ⚠️  ${analysis.missingEffects}個の効果が未実装`);
        }
        console.log('');
    });
    
    console.log('📊 === 効果実装サマリー ===');
    console.log(`📁 総カード数: ${cardFiles.length}`);
    console.log(`🎯 総効果数: ${totalEffects}`);
    console.log(`✅ 実装済み: ${implementedEffects}/${totalEffects} (${Math.round(implementedEffects/totalEffects*100)}%)`);
    console.log(`🎯 動作確認済み: ${testedEffects}/${totalEffects} (${Math.round(testedEffects/totalEffects*100)}%)`);
    console.log(`❌ 未実装: ${missingEffects}/${totalEffects} (${Math.round(missingEffects/totalEffects*100)}%)`);
    
    // 未実装効果の詳細
    if (missingEffects > 0) {
        console.log('\n⚠️  === 未実装効果の詳細 ===');
        results.forEach(card => {
            const missing = card.effectTypes.filter(e => !e.implemented);
            if (missing.length > 0) {
                console.log(`🔸 ${card.filename}:`);
                missing.forEach(effect => {
                    console.log(`   ❌ ${effect.name}: ${effect.reason}`);
                });
            }
        });
    }
    
    // CSV出力
    generateCSVReport(results);
    
    return results;
}

function loadExistingCSV() {
    const csvFileName = 'card-effect-implementation-status.csv';
    const existingChecks = {};
    
    if (fs.existsSync(csvFileName)) {
        try {
            const csvContent = fs.readFileSync(csvFileName, 'utf8');
            const lines = csvContent.split('\n');
            
            // ヘッダー行をスキップ
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line) {
                    const columns = line.split(',');
                    if (columns.length >= 7) {
                        const cardId = columns[0];
                        const effectName = columns[1];
                        const key = `${cardId}_${effectName}`;
                        existingChecks[key] = {
                            manualTestResult: columns[6] || '未確認',
                            testNotes: columns[7] || ''
                        };
                    }
                }
            }
            console.log(`📄 既存のCSVファイルから ${Object.keys(existingChecks).length} 件のテスト結果を読み込みました\n`);
        } catch (error) {
            console.log('⚠️  既存のCSVファイルの読み込みに失敗しました:', error.message);
        }
    }
    
    return existingChecks;
}

function generateCSVReport(results) {
    console.log('\n📄 === CSV形式レポート生成中 ===');
    
    const csvLines = [];
    
    // ヘッダー行（動作確認とテスト結果メモを追加）
    csvLines.push('カードID,効果名,効果タイプ,実装状況,説明,理由,動作確認,テスト結果メモ');
    
    // データ行
    results.forEach(card => {
        if (card.effectTypes.length === 0) {
            // 効果なしのカード
            csvLines.push(`${card.filename.replace('.js', '')},なし,なし,実装済み,効果なし,,未確認,`);
        } else {
            card.effectTypes.forEach(effect => {
                const status = effect.implemented ? '実装済み' : '未実装';
                const reason = effect.reason || '';
                const testStatus = effect.manualTestResult || '未確認';
                const testNotes = (effect.testNotes || '').replace(/,/g, '，'); // カンマをエスケープ
                csvLines.push(`${card.filename.replace('.js', '')},${effect.name},${effect.name},${status},${effect.description},${reason},${testStatus},${testNotes}`);
            });
        }
    });
    
    const csvContent = csvLines.join('\n');
    
    // CSV ファイルに書き込み
    const csvFileName = 'card-effect-implementation-status.csv';
    fs.writeFileSync(csvFileName, csvContent, 'utf8');
    
    console.log(`✅ CSV レポートを ${csvFileName} に保存しました`);
    console.log(`📊 合計 ${csvLines.length - 1} 行のデータ`);
    console.log('📝 動作確認結果をCSVで編集できます:');
    console.log('   動作確認列: 未確認 / 動作確認済み / エラー');
    console.log('   テスト結果メモ列: 詳細なメモを記入可能');
    
    return csvFileName;
}

function analyzeCardEffects(filename, content) {
    const analysis = {
        filename,
        totalEffects: 0,
        implementedEffects: 0,
        missingEffects: 0,
        effectTypes: [],
        hasAllEffects: true
    };
    
    // 各効果タイプを検出・分析
    const effectPatterns = [
        {
            name: 'ブルームエフェクト',
            patterns: [/bloomEffect\s*:/i],
            functionPattern: /bloomEffect\s*:\s*{.*?(?:condition|effect)\s*:/is
        },
        {
            name: 'コラボエフェクト', 
            patterns: [/collabEffect\s*:/i],
            functionPattern: /collabEffect\s*:\s*{.*?(?:condition|effect)\s*:/is
        },
        {
            name: 'アーツ1',
            patterns: [/art1\s*:/i],
            functionPattern: /art1\s*:\s*{.*?(?:condition|effect)\s*:/is
        },
        {
            name: 'アーツ2',
            patterns: [/art2\s*:/i],
            functionPattern: /art2\s*:\s*{.*?(?:condition|effect)\s*:/is
        },
        {
            name: 'サポートエフェクト',
            patterns: [/supportEffect\s*:/i],
            functionPattern: /supportEffect\s*:\s*{.*?(?:condition|effect)\s*:/is
        },
        {
            name: '推しスキル',
            patterns: [/oshiSkill\s*:/i],
            functionPattern: /oshiSkill\s*:\s*{.*?(?:condition|effect)\s*:/is
        },
        {
            name: 'SP推しスキル',
            patterns: [/spOshiSkill\s*:/i],
            functionPattern: /spOshiSkill\s*:\s*{.*?(?:condition|effect)\s*:/is
        }
    ];
    
    effectPatterns.forEach(pattern => {
        const hasDeclaration = pattern.patterns.some(p => p.test(content));
        
        if (hasDeclaration) {
            analysis.totalEffects++;
            
            // 説明文を抽出
            let description = '効果説明なし';
            const descMatch = content.match(new RegExp(pattern.patterns[0].source.replace('\\s*:', '[^:]*description\\s*:\\s*[\'"`]([^\'"`]+)'), 'i'));
            if (descMatch) {
                description = descMatch[1].substring(0, 30) + (descMatch[1].length > 30 ? '...' : '');
            }
            
            // 実装関数の存在確認
            const hasFunction = pattern.functionPattern.test(content);
            
            // condition/effect関数の詳細チェック
            let hasCondition = false;
            let hasEffect = false;
            let reason = '';
            
            if (hasFunction) {
                // より詳細な関数内容チェック
                const effectSection = extractEffectSection(content, pattern.patterns[0]);
                if (effectSection) {
                    hasCondition = /condition\s*:\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|\([^)]*\)\s*=>\s*{)/i.test(effectSection);
                    hasEffect = /effect\s*:\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|\([^)]*\)\s*=>\s*{)/i.test(effectSection);
                    
                    if (!hasCondition && !hasEffect) {
                        reason = '関数宣言はあるが中身が空';
                    } else if (!hasCondition) {
                        reason = 'condition関数がない';
                    } else if (!hasEffect) {
                        reason = 'effect関数がない';
                    }
                } else {
                    // セクション抽出に失敗した場合はより簡単な検出
                    hasCondition = new RegExp(pattern.patterns[0].source.replace(':', '[^}]*condition'), 'i').test(content);
                    hasEffect = new RegExp(pattern.patterns[0].source.replace(':', '[^}]*effect'), 'i').test(content);
                    if (!hasCondition || !hasEffect) {
                        reason = 'セクション解析に失敗（可能性: ' + (hasCondition ? 'condition✓' : 'condition✗') + ', ' + (hasEffect ? 'effect✓' : 'effect✗') + ')';
                    }
                }
            } else {
                reason = '実装関数が見つからない';
            }
            
            const implemented = hasFunction && hasCondition && hasEffect;
            
            analysis.effectTypes.push({
                name: pattern.name,
                description,
                implemented,
                hasFunction,
                hasCondition,
                hasEffect,
                reason: implemented ? '' : reason
            });
            
            if (implemented) {
                analysis.implementedEffects++;
            } else {
                analysis.missingEffects++;
                analysis.hasAllEffects = false;
            }
        }
    });
    
    return analysis;
}

function extractEffectSection(content, pattern) {
    // 効果セクションを抽出（ネストした括弧を考慮）
    const regex = new RegExp(pattern.source.replace(/\s\*/g, '\\s*'), 'i');
    const match = content.match(regex);
    if (!match) return null;
    
    const startPos = content.indexOf('{', match.index);
    if (startPos === -1) return null;
    
    let braceCount = 1;
    let endPos = startPos + 1;
    
    while (endPos < content.length && braceCount > 0) {
        if (content[endPos] === '{') braceCount++;
        else if (content[endPos] === '}') braceCount--;
        endPos++;
    }
    
    return content.substring(startPos, endPos);
}

// 実行
if (require.main === module) {
    try {
        analyzeCardEffectImplementations();
    } catch (error) {
        console.error('エラーが発生しました:', error.message);
        process.exit(1);
    }
}

module.exports = { analyzeCardEffectImplementations };
