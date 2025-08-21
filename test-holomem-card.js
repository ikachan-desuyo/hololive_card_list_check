/**
 * Test generating a single Holomem card with bloom effect
 */

const fs = require('fs');
const path = require('path');
const { 
  getBaseCardNumber, 
  getFileName, 
  generateSkeletonContent,
  loadCardData
} = require('./generate-card-skeletons.js');

const cardData = loadCardData();
const testCardId = 'hBP01-012';

console.log(`🧪 Testing generation of ${testCardId}`);

// Find all variants of this card
const variants = Object.entries(cardData)
  .filter(([cardId, card]) => getBaseCardNumber(cardId) === testCardId)
  .map(([cardId, card]) => ({ id: cardId, data: card }));

if (variants.length === 0) {
  console.log('❌ Card not found');
  process.exit(1);
}

const representative = variants[0];
console.log(`📝 Card: ${representative.data.name} (${representative.data.card_type})`);
console.log(`   Color: ${representative.data.color}`);
console.log(`   HP: ${representative.data.hp}`);
console.log(`   Bloom Level: ${representative.data.bloom_level}`);

// Skills analysis
const skills = representative.data.skills || [];
skills.forEach((skill, i) => {
  console.log(`   Skill ${i+1}: ${skill.type}${skill.subtype ? ` - ${skill.subtype}` : ''}`);
  console.log(`             Name: ${skill.name}`);
});

// Generate skeleton
const content = generateSkeletonContent(testCardId, representative, variants);
const fileName = getFileName(testCardId);
const testPath = `/tmp/${fileName}`;

fs.writeFileSync(testPath, content, 'utf8');
console.log(`✅ Generated ${testPath}`);
console.log(`📊 File size: ${fs.statSync(testPath).size} bytes`);

// Test syntax
try {
  require(testPath);
  console.log('✅ File can be required successfully');
} catch (error) {
  console.log('❌ Syntax error:', error.message);
}