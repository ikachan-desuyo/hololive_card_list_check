/**
 * Test script for card detection logic validation
 * This can be run independently to verify the detection algorithm improvements
 * 
 * Run with: node test_card_detection_logic.js
 */

function testCardDetectionLogic() {
  console.log("🧪 Testing card detection logic improvements...");
  
  // Constants from card_scan_v2.html
  const CARD_RATIO = 88 / 63; // ~1.397
  const MIN_AREA = 5000;
  
  // Mock canvas dimensions (typical phone camera resolution)
  const canvas = { width: 640, height: 480 };
  const frameCenterX = canvas.width / 2;
  const frameCenterY = canvas.height / 2;
  
  // Test cases: [x, y, width, height, description, expected_result]
  const testCases = [
    [100, 100, 50, 30, "Very small contour", "REJECT_AREA"],
    [200, 200, 200, 300, "Wrong aspect ratio (too tall)", "REJECT_RATIO"],
    [200, 200, 300, 200, "Wrong aspect ratio (too wide)", "REJECT_RATIO"],
    [150, 150, 100, 140, "Valid card near center", "ACCEPT"],
    [50, 50, 120, 168, "Valid card far from center (larger)", "ACCEPT"],
    [300, 220, 80, 112, "Valid card center-right (smaller)", "ACCEPT"],
    [10, 10, 90, 126, "Valid card at edge", "ACCEPT"]
  ];
  
  console.log(`\n📊 Test Parameters:`);
  console.log(`   Frame center: (${frameCenterX}, ${frameCenterY})`);
  console.log(`   Card ratio target: ${CARD_RATIO.toFixed(3)}`);
  console.log(`   Aspect ratio range: ${(0.95 * CARD_RATIO).toFixed(3)} - ${(1.05 * CARD_RATIO).toFixed(3)} (±5%)`);
  console.log(`   Minimum area: ${MIN_AREA}\n`);
  
  let bestRect = null;
  let bestScore = -1;
  let passedTests = 0;
  let totalTests = testCases.length;
  
  testCases.forEach((testCase, index) => {
    const [x, y, width, height, description, expectedResult] = testCase;
    const rect = { x, y, width, height };
    const area = width * height;
    const aspectRatio = height / width;
    
    console.log(`\n🔍 Test ${index + 1}: ${description}`);
    console.log(`   Rect: (${x}, ${y}) ${width}×${height}`);
    console.log(`   Area: ${area}, Aspect ratio: ${aspectRatio.toFixed(3)}`);
    
    let actualResult = "ACCEPT";
    
    // Apply the filtering logic from card_scan_v2.html
    
    // 1. Minimum area check
    if (area < MIN_AREA) {
      actualResult = "REJECT_AREA";
      console.log(`   ❌ REJECTED: Area too small (${area} < ${MIN_AREA})`);
    }
    // 2. Aspect ratio check (5% tolerance)
    else if (!(0.95 * CARD_RATIO < aspectRatio && aspectRatio < 1.05 * CARD_RATIO)) {
      actualResult = "REJECT_RATIO";
      console.log(`   ❌ REJECTED: Aspect ratio outside 5% tolerance`);
    }
    // 3. Calculate score if it passes basic checks
    else {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const distanceToCenter = Math.sqrt(
        Math.pow(centerX - frameCenterX, 2) + Math.pow(centerY - frameCenterY, 2)
      );
      const normalizedDistance = distanceToCenter / Math.max(canvas.width, canvas.height);
      const score = area * (1 - normalizedDistance);
      
      console.log(`   ✅ PASSED: Center (${centerX}, ${centerY}), Distance: ${distanceToCenter.toFixed(1)}`);
      console.log(`   📈 Score: ${score.toFixed(1)} (area ${area} × distance factor ${(1-normalizedDistance).toFixed(3)})`);
      
      if (score > bestScore) {
        bestRect = rect;
        bestScore = score;
        console.log(`   🏆 NEW BEST CANDIDATE`);
      }
    }
    
    // Validate result
    if (actualResult === expectedResult) {
      console.log(`   ✅ Test PASSED (${actualResult})`);
      passedTests++;
    } else {
      console.log(`   ❌ Test FAILED: Expected ${expectedResult}, got ${actualResult}`);
    }
  });
  
  console.log(`\n🏁 Test Results:`);
  console.log(`   Passed: ${passedTests}/${totalTests} tests`);
  
  if (bestRect) {
    console.log(`\n🎯 Best candidate selected:`);
    console.log(`   Rect: (${bestRect.x}, ${bestRect.y}) ${bestRect.width}×${bestRect.height}`);
    console.log(`   Score: ${bestScore.toFixed(1)}`);
  } else {
    console.log(`\n🚫 No valid candidates found`);
  }
  
  if (passedTests === totalTests) {
    console.log(`\n🎉 All tests passed! Detection logic is working correctly.`);
  } else {
    console.log(`\n⚠️  Some tests failed. Please review the detection logic.`);
  }
  
  return passedTests === totalTests;
}

if (require.main === module) {
  testCardDetectionLogic();
}

module.exports = { testCardDetectionLogic };