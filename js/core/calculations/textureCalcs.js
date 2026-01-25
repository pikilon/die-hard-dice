/**
 * @fileoverview Pure utility functions for calculating texture parameters.
 * These functions are pure and return data structures describing how textures
 * should be rendered. They have no side effects and can be tested independently.
 * 
 * All functions are deterministic: same input produces same output every time.
 */

/**
 * Calculates the nearest power of 2 greater than or equal to the given value.
 * Used to ensure texture sizes are compatible with GPU memory constraints.
 * 
 * @param {number} approx - Approximate desired size
 * @returns {number} The nearest power of 2 (512, 1024, 2048, etc.)
 * 
 * @example
 * calcNearestPowerOf2(1024) // Returns: 1024
 * calcNearestPowerOf2(1025) // Returns: 2048
 * calcNearestPowerOf2(500)  // Returns: 512
 */
export function calcNearestPowerOf2(approx) {
  let size = 256;
  while (size < approx) size *= 2;
  return size;
}

/**
 * Calculates rendering parameters for a text texture.
 * Determines canvas size, font size, and text positioning based on desired output.
 * 
 * @param {string} text - The text to render on the texture
 * @param {number} baseSize - Base size for texture calculations
 * @param {number} margin - Margin around text as a multiple of base size (e.g., 0.5 = 50% margin)
 * @returns {Object} Texture parameters
 * @returns {number} returns.textureSize - Canvas width/height in pixels
 * @returns {number} returns.fontSize - Font size in pixels
 * @returns {string} returns.trimmedText - Text with whitespace trimmed
 * @returns {boolean} returns.shouldAddDot - Whether to add dot to 6 or 9 (visual enhancement)
 * @returns {number} returns.textWidth - Estimated width of text in pixels
 * 
 * @example
 * const params = calculateTextureParams("20", 100, 0.5);
 * // Returns: {
 * //   textureSize: 512,
 * //   fontSize: 341.33,
 * //   trimmedText: "20",
 * //   shouldAddDot: false,
 * //   textWidth: 256
 * // }
 */
export function calculateTextureParams(text, baseSize, margin) {
  const trimmedText = text.trim();
  const textLength = trimmedText.length;
  
  // Calculate texture size based on margin
  const totalSize = baseSize + baseSize * 2 * margin;
  const textureSize = calcNearestPowerOf2(totalSize) * 2;
  
  // Calculate font size based on texture dimensions and text length
  // Formula: textureSize / (margin factor + text length coefficient)
  const fontSize = textureSize / (1 + 2 * margin + textLength * 0.5);
  
  // Estimate text width in pixels (rough approximation)
  const textWidth = fontSize * textLength * 0.6;
  
  // Add visual enhancement dot to 6 and 9 for clarity
  const shouldAddDot = /^[69]$/.test(trimmedText[0]);
  
  return {
    textureSize,
    fontSize,
    trimmedText,
    shouldAddDot,
    textWidth
  };
}

/**
 * Builds a rendering instruction object describing how to draw on a canvas.
 * Pure function that returns renderable instructions without performing actual rendering.
 * 
 * @param {string} text - Text to render
 * @param {string} textColor - Text color in hex format (e.g., "#ffffff")
 * @param {string} backgroundColor - Background color in hex format (e.g., "#000000")
 * @param {number} baseSize - Base size for texture calculations
 * @param {number} margin - Margin around text
 * @returns {Object} Canvas rendering instructions
 * @returns {number} returns.width - Canvas width
 * @returns {number} returns.height - Canvas height
 * @returns {string} returns.backgroundColor - Background fill color
 * @returns {Object} returns.textRender - Text rendering details
 * @returns {string} returns.textRender.text - Final text to render (with optional dot)
 * @returns {number} returns.textRender.x - X position (center of canvas)
 * @returns {number} returns.textRender.y - Y position (center of canvas)
 * @returns {string} returns.textRender.font - Font specification (e.g., "256pt Arial")
 * @returns {string} returns.textRender.color - Text color
 * 
 * @example
 * const instructions = buildTextureRenderInstructions(
 *   "6", "#aaaaaa", "#202020", 100, 0.5
 * );
 * // Returns: {
 * //   width: 512,
 * //   height: 512,
 * //   backgroundColor: "#202020",
 * //   textRender: {
 * //     text: "6.",
 * //     x: 256,
 * //     y: 256,
 * //     font: "256pt Arial",
 * //     color: "#aaaaaa"
 * //   }
 * // }
 */
export function buildTextureRenderInstructions(
  text,
  textColor,
  backgroundColor,
  baseSize,
  margin
) {
  const params = calculateTextureParams(text, baseSize, margin);
  
  const finalText = params.shouldAddDot 
    ? params.trimmedText + "."
    : params.trimmedText;
  
  return {
    width: params.textureSize,
    height: params.textureSize,
    backgroundColor,
    textRender: {
      text: finalText,
      x: params.textureSize / 2,
      y: params.textureSize / 2,
      font: `${Math.floor(params.fontSize)}pt Arial`,
      color: textColor
    }
  };
}

/**
 * Validates and clamps texture size to acceptable range.
 * Prevents memory issues from extremely large or small textures.
 * 
 * @param {number} size - Desired texture size
 * @param {number} [min=256] - Minimum allowed size
 * @param {number} [max=4096] - Maximum allowed size
 * @returns {number} Clamped texture size (power of 2)
 * 
 * @example
 * validateTextureSize(512)  // Returns: 512
 * validateTextureSize(100)  // Returns: 256 (below min)
 * validateTextureSize(8000) // Returns: 4096 (exceeds max)
 */
export function validateTextureSize(size, min = 256, max = 4096) {
  let clamped = Math.max(min, Math.min(max, size));
  return calcNearestPowerOf2(clamped);
}
