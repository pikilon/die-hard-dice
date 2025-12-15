import * as THREE from "three";
import { calcTextureSize } from "../dice/common.js";

/**
 * Creates a texture with text rendered on a colored background.
 * Used for dice face labels.
 * @param {string} text - The text to render on the texture.
 * @param {string} color - The text color (e.g., '#aaaaaa').
 * @param {string} back_color - The background color (e.g., '#202020').
 * @param {number} size - Base size for texture calculations.
 * @param {number} margin - Margin around the text.
 * @returns {THREE.Texture} The generated texture.
 */
export function createTextTexture(text, color, back_color, size, margin) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const trimmedText = text.trim();
  const textLength = trimmedText.length;
  const textureSize = calcTextureSize(size + size * 2 * margin) * 2;
  const fontSize = textureSize / (1 + 2 * margin + textLength * 0.5);
  const firstChar = trimmedText[0];
  const shouldAddDot = firstChar == "6" || firstChar == "9";
  const finalText = shouldAddDot ? trimmedText + "." : trimmedText;

  canvas.width = canvas.height = textureSize;
  context.font =
    fontSize +
    "pt 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', Arial, sans-serif";
  context.fillStyle = back_color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  if (trimmedText) {
    context.fillText(finalText, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}
