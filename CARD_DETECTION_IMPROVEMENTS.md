# Card Detection Algorithm Improvements

This document describes the improvements made to the card frame detection algorithm in `card_scan_v2.html`.

## Problem Statement

The original implementation had issues with:
- Very small images being selected due to insufficient size filtering
- Inconsistent detection due to loose aspect ratio constraints (±10% tolerance)
- Suboptimal center alignment prioritization

## Solutions Implemented

### 1. Minimum Area Threshold
- **Added**: `MIN_AREA = 5000` constant
- **Purpose**: Filter out contours that are too small to be meaningful card frames
- **Benefit**: Prevents noise and very small objects from being detected as cards

### 2. Tighter Aspect Ratio Filtering
- **Changed**: Tolerance from ±10% to ±5%
- **Range**: 1.327 to 1.467 (for card ratio of 88/63 ≈ 1.397)
- **Benefit**: More precise detection of card-like rectangular objects

### 3. Improved Center Alignment Priority
- **Added**: Scoring system combining area and distance to center
- **Formula**: `score = area × (1 - normalizedDistance)`
- **Benefit**: Balances size preference with center proximity for better selection

## Code Changes

The changes were made in the `detectCardFrames()` function around lines 128-158:

```javascript
// Added constants
const MIN_AREA = 5000; // 最小面積閾値
let bestScore = -1;

// Enhanced filtering logic
if (area < MIN_AREA) {
  continue; // Reject small contours
}

if (!(0.95 * CARD_RATIO < aspectRatio && aspectRatio < 1.05 * CARD_RATIO)) {
  continue; // Tighter aspect ratio check
}

// Improved scoring
let normalizedDistance = distanceToCenter / Math.max(canvas.width, canvas.height);
let score = area * (1 - normalizedDistance);

if (score > bestScore) {
  bestRect = rect;
  bestScore = score;
}
```

## Testing

A comprehensive test suite is provided in `test_card_detection_logic.js` to validate the detection logic:

```bash
node test_card_detection_logic.js
```

### Test Cases Covered
- Small contours (correctly rejected)
- Wrong aspect ratios (correctly rejected) 
- Valid cards at different positions and sizes
- Scoring system validation

## Usage

The improved detection algorithm is automatically applied when using the "カード枠を検出" (Detect Card Frame) button in `card_scan_v2.html`. No additional configuration is required.

## Performance Impact

- **Minimal**: The changes add only basic arithmetic operations
- **Improved accuracy**: Fewer false positives from small objects
- **Better selection**: More consistent detection of the intended card frame