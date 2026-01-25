/**
 * @fileoverview Adapter for Canvas-based texture rendering operations.
 * Encapsulates DOM/Canvas operations with dependency injection for testability.
 * Separates pure texture calculation logic from side-effectful canvas rendering.
 */

/**
 * Creates a canvas adapter factory with injected document dependency.
 * Enables testing by allowing document mock injection.
 * 
 * @param {Object} deps - Dependency injection object
 * @param {Document} deps.document - DOM document object (window.document)
 * @returns {Object} Adapter with canvas rendering functions
 * 
 * @example
 * const adapter = createCanvasAdapter({ document: window.document });
 * const texture = adapter.createTexture("20", "#fff", "#000", 100, 0.5);
 */
export function createCanvasAdapter({ document }) {
  return {
    /**
     * Creates a canvas element with specified dimensions.
     * 
     * @param {number} width - Canvas width in pixels
     * @param {number} height - Canvas height in pixels
     * @returns {HTMLCanvasElement} New canvas element
     * 
     * @private
     */
    createCanvas(width, height) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      return canvas;
    },

    /**
     * Renders text on a canvas according to instructions.
     * Side effect: modifies canvas context state.
     * 
     * @param {HTMLCanvasElement} canvas - Canvas to render on
     * @param {Object} instructions - Render instruction object from textureCalcs
     * @param {number} instructions.width - Canvas width
     * @param {number} instructions.height - Canvas height
     * @param {string} instructions.backgroundColor - Fill color
     * @param {Object} instructions.textRender - Text rendering parameters
     * @returns {HTMLCanvasElement} Canvas after rendering
     * 
     * @private
     */
    renderTextOnCanvas(canvas, instructions) {
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error("Could not get 2D context from canvas");
      }
      
      // Clear canvas with background color
      ctx.fillStyle = instructions.backgroundColor;
      ctx.fillRect(0, 0, instructions.width, instructions.height);
      
      // Render text if present
      if (instructions.textRender.text) {
        ctx.font = instructions.textRender.font;
        ctx.fillStyle = instructions.textRender.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          instructions.textRender.text,
          instructions.textRender.x,
          instructions.textRender.y
        );
      }
      
      return canvas;
    },

    /**
     * Gets canvas as image data (for debugging/inspection).
     * 
     * @param {HTMLCanvasElement} canvas - Source canvas
     * @returns {ImageData} Pixel data from canvas
     * 
     * @private
     */
    getCanvasImageData(canvas) {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get 2D context from canvas");
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };
}

/**
 * Creates adapter for Three.js texture creation with injected THREE library.
 * Enables testing by allowing THREE mock injection.
 * 
 * @param {Object} deps - Dependency injection object
 * @param {THREE} deps.THREE - Three.js library
 * @returns {Object} Adapter with Three.js texture functions
 * 
 * @example
 * const adapter = createThreeTextureAdapter({ THREE: window.THREE });
 * const texture = adapter.createTextureFromCanvas(canvas);
 */
export function createThreeTextureAdapter({ THREE }) {
  return {
    /**
     * Creates Three.js texture from canvas.
     * 
     * @param {HTMLCanvasElement} canvas - Source canvas
     * @returns {THREE.Texture} Texture object ready for materials
     */
    createTextureFromCanvas(canvas) {
      if (!THREE || !THREE.Texture) {
        throw new Error("THREE library not available");
      }
      
      const texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      return texture;
    },

    /**
     * Creates THREE.MeshPhongMaterial with texture.
     * 
     * @param {THREE.Texture} texture - Texture to apply
     * @param {Object} [options={}] - Material options
     * @returns {THREE.MeshPhongMaterial} Material ready for mesh
     */
    createMaterialFromTexture(texture, options = {}) {
      if (!THREE || !THREE.MeshPhongMaterial) {
        throw new Error("THREE library not available");
      }
      
      return new THREE.MeshPhongMaterial({
        map: texture,
        ...options
      });
    }
  };
}

/**
 * Renders text directly to Three.js texture in one operation.
 * Combines canvas rendering with THREE.js texture creation.
 * 
 * @param {string} text - Text to render
 * @param {string} textColor - Text color hex
 * @param {string} backgroundColor - Background color hex
 * @param {Object} renderInstructions - Instructions from textureCalcs
 * @param {Object} deps - Injected dependencies {document, THREE}
 * @returns {THREE.Texture} Final texture ready for material
 * 
 * @example
 * const texture = renderTextToThreeTexture(
 *   "20",
 *   "#aaa",
 *   "#202020",
 *   instructions,
 *   { document: window.document, THREE: window.THREE }
 * );
 */
export function renderTextToThreeTexture(
  text,
  textColor,
  backgroundColor,
  renderInstructions,
  { document, THREE }
) {
  // Get adapters
  const canvasAdapter = createCanvasAdapter({ document });
  const threeAdapter = createThreeTextureAdapter({ THREE });
  
  // Create and render canvas
  const canvas = canvasAdapter.createCanvas(
    renderInstructions.width,
    renderInstructions.height
  );
  
  canvasAdapter.renderTextOnCanvas(canvas, {
    width: renderInstructions.width,
    height: renderInstructions.height,
    backgroundColor,
    textRender: renderInstructions.textRender
  });
  
  // Convert to Three.js texture
  return threeAdapter.createTextureFromCanvas(canvas);
}
