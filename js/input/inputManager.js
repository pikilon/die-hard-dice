/**
 * @fileoverview Input handling and user interaction management.
 * Manages mouse/touch drag-to-throw, button clicks, and raycasting for dice selection.
 */

/**
 * Creates a raycaster for mouse/touch interaction with dice.
 * Used to detect which die was clicked/touched.
 * 
 * @param {Object} config - Configuration
 * @param {THREE.Camera} config.camera - Camera for raycasting
 * @param {Array<THREE.Mesh>} config.meshes - Dice meshes to test against
 * @param {THREE.Vector2} config.mousePos - Current mouse/touch position (normalized -1 to 1)
 * @returns {Object|null} First intersected object or null
 * 
 * @example
 * const hit = raycastDice({
 *   camera,
 *   meshes: diceMeshes,
 *   mousePos: new THREE.Vector2(0.5, -0.5)
 * });
 */
export function raycastDice({ camera, meshes, mousePos }) {
  if (!camera || !meshes || !mousePos) {
    return null;
  }
  
  // Create raycaster if THREE available
  if (typeof THREE === 'undefined' || !THREE.Raycaster) {
    console.warn('THREE.Raycaster not available');
    return null;
  }
  
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mousePos, camera);
  
  const intersects = raycaster.intersectObjects(meshes);
  return intersects.length > 0 ? intersects[0].object : null;
}

/**
 * Normalizes screen coordinates to Three.js normalized device coordinates (-1 to 1).
 * 
 * @param {number} screenX - X position in pixels
 * @param {number} screenY - Y position in pixels
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @returns {Object} Normalized coordinates {x, y}
 * 
 * @example
 * const normalized = normalizeMouseCoords(150, 200, 800, 600);
 * // Returns: { x: -0.625, y: -0.333 }
 */
export function normalizeMouseCoords(screenX, screenY, canvasWidth, canvasHeight) {
  return {
    x: (screenX / canvasWidth) * 2 - 1,
    y: -(screenY / canvasHeight) * 2 + 1
  };
}

/**
 * Extracts position from mouse or touch event.
 * Handles both MouseEvent and TouchEvent types.
 * 
 * @param {MouseEvent|TouchEvent} event - DOM event
 * @returns {Object} Position {x, y} or null if invalid event
 * 
 * @example
 * const pos = getEventPosition(mouseEvent);
 * // Returns: { x: 150, y: 200 }
 */
export function getEventPosition(event) {
  if (!event) return null;
  
  // Touch event
  if (event.touches && event.touches.length > 0) {
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }
  
  // Mouse event
  if (event.clientX !== undefined && event.clientY !== undefined) {
    return {
      x: event.clientX,
      y: event.clientY
    };
  }
  
  return null;
}

/**
 * Creates drag input handler that tracks mouse/touch movement.
 * Calls callbacks on drag start, move, and end.
 * 
 * @param {Object} config - Configuration
 * @param {HTMLElement} config.element - Element to attach listeners to
 * @param {Function} config.onDragStart - Callback (position, event)
 * @param {Function} config.onDragMove - Callback (startPos, currentPos, event)
 * @param {Function} config.onDragEnd - Callback (startPos, endPos, event)
 * @returns {Object} Drag handler with start/stop/enabled state
 * 
 * @example
 * const dragHandler = createDragHandler({
 *   element: container,
 *   onDragStart: (pos) => console.log('started', pos),
 *   onDragMove: (start, current) => console.log('moving', start, current),
 *   onDragEnd: (start, end) => console.log('ended', start, end)
 * });
 * dragHandler.start();
 */
export function createDragHandler(config) {
  const {
    element,
    onDragStart = () => {},
    onDragMove = () => {},
    onDragEnd = () => {}
  } = config;
  
  let isDragging = false;
  let dragStartPos = null;
  
  const handleMouseDown = (event) => {
    if (!element) return;
    
    isDragging = true;
    dragStartPos = getEventPosition(event);
    
    if (dragStartPos) {
      onDragStart(dragStartPos, event);
    }
  };
  
  const handleMouseMove = (event) => {
    if (!isDragging || !dragStartPos) return;
    
    const currentPos = getEventPosition(event);
    if (currentPos) {
      onDragMove(dragStartPos, currentPos, event);
    }
  };
  
  const handleMouseUp = (event) => {
    if (!isDragging || !dragStartPos) return;
    
    isDragging = false;
    const endPos = getEventPosition(event);
    
    if (endPos) {
      onDragEnd(dragStartPos, endPos, event);
    }
    
    dragStartPos = null;
  };
  
  return {
    /**
     * Attach event listeners.
     */
    start() {
      if (!element) return;
      
      element.addEventListener('mousedown', handleMouseDown);
      element.addEventListener('touchstart', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleMouseUp);
    },
    
    /**
     * Remove event listeners.
     */
    stop() {
      if (!element) return;
      
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('touchstart', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    },
    
    /**
     * Check if currently dragging.
     * @returns {boolean}
     */
    isDragging() {
      return isDragging;
    },
    
    /**
     * Get current drag start position.
     * @returns {Object|null}
     */
    getDragStart() {
      return dragStartPos;
    }
  };
}

/**
 * Creates button click handler for throw triggering.
 * Calls callback with random throw parameters.
 * 
 * @param {Object} config - Configuration
 * @param {HTMLElement} config.button - Button element
 * @param {Function} config.onThrow - Callback with throw parameters
 * @returns {Object} Button handler with attach/detach methods
 * 
 * @example
 * const btnHandler = createButtonThrowHandler({
 *   button: throwBtn,
 *   onThrow: (params) => console.log('throwing', params)
 * });
 * btnHandler.attach();
 */
export function createButtonThrowHandler(config) {
  const {
    button,
    onThrow = () => {}
  } = config;
  
  const handleClick = () => {
    // Random direction and boost
    const angle = Math.random() * Math.PI * 2;
    const boost = 2 + Math.random() * 3;
    
    onThrow({
      direction: {
        x: Math.cos(angle),
        y: Math.sin(angle)
      },
      boost,
      distance: 100 + Math.random() * 200
    });
  };
  
  return {
    /**
     * Attach click listener to button.
     */
    attach() {
      if (button) {
        button.addEventListener('click', handleClick);
        button.addEventListener('touchstart', (e) => {
          e.preventDefault();
          handleClick();
        });
      }
    },
    
    /**
     * Remove click listener from button.
     */
    detach() {
      if (button) {
        button.removeEventListener('click', handleClick);
        button.removeEventListener('touchstart', handleClick);
      }
    }
  };
}

/**
 * Creates complete input manager combining drag and button handlers.
 * Orchestrates all user input interactions.
 * 
 * @param {Object} config - Configuration
 * @param {HTMLElement} config.container - Main container for drag events
 * @param {HTMLElement} [config.throwButton] - Optional throw button
 * @param {THREE.Camera} config.camera - Camera for raycasting
 * @param {Array<THREE.Mesh>} config.meshes - Dice meshes
 * @param {Function} [config.onThrow] - Throw callback
 * @param {Function} [config.onDiceSelect] - Dice selection callback
 * @returns {Object} Input manager with attach/detach methods
 * 
 * @example
 * const inputMgr = createInputManager({
 *   container,
 *   throwButton,
 *   camera,
 *   meshes: diceMeshes,
 *   onThrow: (params) => roll(params),
 *   onDiceSelect: (dice) => console.log('selected', dice)
 * });
 * inputMgr.attach();
 */
export function createInputManager(config) {
  const {
    container,
    throwButton,
    camera,
    meshes = [],
    onThrow = () => {},
    onDiceSelect = () => {}
  } = config;
  
  // Create drag handler
  const dragHandler = createDragHandler({
    element: container,
    onDragEnd: (startPos, endPos) => {
      const deltaX = endPos.x - startPos.x;
      const deltaY = endPos.y - startPos.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 20) {  // Minimum drag distance
        const direction = {
          x: deltaX / distance,
          y: deltaY / distance
        };
        
        const boost = Math.min(distance / 100, 5.0);
        
        onThrow({
          direction,
          boost,
          distance
        });
      }
    }
  });
  
  // Create button handler if button provided
  let btnHandler = null;
  if (throwButton) {
    btnHandler = createButtonThrowHandler({
      button: throwButton,
      onThrow
    });
  }
  
  return {
    /**
     * Attach all input listeners.
     */
    attach() {
      dragHandler.start();
      if (btnHandler) {
        btnHandler.attach();
      }
    },
    
    /**
     * Detach all input listeners.
     */
    detach() {
      dragHandler.stop();
      if (btnHandler) {
        btnHandler.detach();
      }
    },
    
    /**
     * Get dice at screen position.
     * @param {number} screenX
     * @param {number} screenY
     * @returns {THREE.Mesh|null}
     */
    getDiceAtPosition(screenX, screenY) {
      if (!container || !camera) return null;
      
      const rect = container.getBoundingClientRect();
      const normalized = normalizeMouseCoords(
        screenX - rect.left,
        screenY - rect.top,
        rect.width,
        rect.height
      );
      
      return raycastDice({
        camera,
        meshes,
        mousePos: typeof THREE !== 'undefined' && THREE.Vector2
          ? new THREE.Vector2(normalized.x, normalized.y)
          : null
      });
    }
  };
}
