// Internal dependencies
import CanvasDatapoint from './datapoint';

/**
 * UI canvas for displaying machine learning results.
 *
 * Listeners:
 *  This class supports event listeners, meaning that the outside world can bind functions to events
 *  triggered explicitly by this class. Listeners can be added using `addListener` and removed by
 * `removeListener`. The `emit` method is not intended for use by the outside world, and is used by
 *  this class to emit an event to the listeners bound to it.
 */
export default class Canvas {
  /**
   * Contructor. Load DOM element and user options.
   *
   * @param {Object} el DOM Canvas element
   * @param {Object} [optionsUser] - User-defined options for the canvas
   * @param {boolean} [optionsUser.continuousClick = false] - Whether the "click" callback should
   *   be called any time the mouse is down (true) or only at the moment the mouse button is first
   *   pressed (false). If true, a click event is emitted every `continuousClickInterval`
   *   milliseconds when the left mouse button is down
   * @param {number} [optionsUser.continuousClickInterval = 50] - Number of milliseconds between
   *   emitting each click event when `continuousClick` is enabled
   * @param {number} [optionsUser.x1 = -2.5] - Left bound of coordinate system for canvas
   * @param {number} [optionsUser.y1 = -2.5] - Bottom bound of coordinate system for canvas
   * @param {number} [optionsUser.x2 = 2.5] - Right bound of coordinate system for canvas
   * @param {number} [optionsUser.y2 = 2.5] - Top bound of coordinate system for canvas
   */
  constructor(el, optionsUser) {
    // Options
    const optionsDefault = {
      continuousClick: false,
      continuousClickInterval: 50,
      x1: -2.5,
      y1: -2.5,
      x2: 2.5,
      y2: 2.5,
    };

    this.options = {
      ...optionsDefault,
      ...optionsUser,
    };

    // Settings for canvas
    this.canvas = {
      element: el,
      context: el.getContext('2d'),
    };

    // Handle canvas resize on window resize
    window.addEventListener('resize', () => this.resize());
    this.resize();

    // Event listeners bound to the canvas
    this.listeners = new Map();

    // Canvas elements to be drawn
    this.elements = [];

    // Class boundaries
    this.classesBoundaries = {};

    // Initialization
    this.handleMouseEvents();

    // Animation
    window.requestAnimationFrame(() => this.refresh());

    // Temporary properties
    this.tmp = {};
    this.tmp.predFeatures = [];
    this.tmp.predLabels = [];
  }

  /**
   * Add an event listener for events of some type emitted from this object.
   *
   * @param {string} label - Event identifier
   * @param {function} callback - Callback function for when the event is emitted
   */
  addListener(label, callback) {
    if (!this.listeners.has(label)) {
      this.listeners.set(label, []);
    }

    this.listeners.get(label).push(callback);
  }

  /**
   * Remove a previously added event listener for events of some type emitted from this object.
   *
   * @param {string} label - Event identifier
   * @param {function} callback - Callback function to remove from event
   */
  removeListener(label, callback) {
    const listeners = this.listeners.get(label);

    if (listeners) {
      this.listeners.set(label, listeners.filter(
        x => !(typeof x === 'function' && x === callback)
      ));
    }
  }

  /**
   * Emit an event, which triggers the listener callback functions bound to it.
   *
   * @param {string} label - Event identifier
   * @param {...mixed} args - Remaining arguments contain arguments that should be passed to the
   *   callback functions
   * @return {boolean} Whether any listener callback functions were executed
   */
  emit(label, ...args) {
    const listeners = this.listeners.get(label);

    if (listeners) {
      listeners.forEach((listener) => { listener(...args); });
      return true;
    }

    return false;
  }

  /**
   * Add a data point element to the canvas, using a dataset datapoint as its model.
   *
   * @param {jsmlt.Dataset.Datapoint} datapoint - Dataset datapoint (model)
   */
  addDatapoint(datapoint) {
    this.elements.push(new CanvasDatapoint(this, datapoint));
  }

  /**
   * Handle mouse events on the canvas, e.g. for adding data points.
   */
  handleMouseEvents() {
    if (this.options.continuousClick) {
      this.mouseStatus = 0;
      this.mouseX = 0;
      this.mouseY = 0;

      this.canvas.element.addEventListener('mousedown', () => {
        this.mouseStatus = 1;
        this.continuousClickIntervalId = setInterval(
          () => this.click(),
          this.options.continuousClickInterval
        );
      });

      document.addEventListener('mouseup', () => {
        this.mouseStatus = 0;
        clearInterval(this.continuousClickIntervalId);
      });

      document.addEventListener('mousemove', (e) => {
        [this.mouseX, this.mouseY] =
          this.transformAbsolutePositionToRelativePosition(e.clientX, e.clientY);
      });
    }

    this.canvas.element.addEventListener('mousedown', (e) => {
      this.click(...this.transformAbsolutePositionToRelativePosition(e.clientX, e.clientY));
    });
  }

  /**
   * Transform the absolute position of the mouse in the viewport to the mouse position relative
   * to the top-left point of the canvas.
   *
   * @param {number} x - Absolute mouse x-coordinate within viewport
   * @param {number} y - Absolute mouse y-coordinate within viewport
   * @return {Array.<number>} Two-dimensional array consisting of relative x- and y-coordinate
   */
  transformAbsolutePositionToRelativePosition(x, y) {
    // Handle screen resizing for obtaining correct coordinates
    this.resize();

    // Properties used for calculating mouse position
    const el = this.canvas.element;
    const rect = el.getBoundingClientRect();

    return [x - rect.left, y - rect.top];
  }

  /**
   * Trigger a click at some position in the canvas.
   *
   * @param {number} [x = -1] - X-coordinate of the click. Defaults to stored mouse position from
   *   mousemove event
   * @param {number} [y = -1] - Y-coordinate of the click. Defaults to stored mouse position from
   *   mousemove event
   */
  click(x = -1, y = -1) {
    // Get click coordinates
    let clickX = x;
    let clickY = y;

    if (x === -1) {
      clickX = this.mouseX;
      clickY = this.mouseY;
    }

    // Calculate normalized coordinates with origin in canvas center
    const [px, py] = this.convertCanvasCoordinatesToFeatures(clickX, clickY);

    this.emit('click', px, py);
  }

  /**
   * Clear the canvas.
   */
  clear() {
    this.canvas.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Handle the canvas size for different device pixel ratios and on window resizes.
   */
  resize() {
    this.canvas.element.style.width = '100%';
    this.canvas.element.style.height = '100%';
    this.canvas.element.width = this.canvas.element.offsetWidth * window.devicePixelRatio;
    this.canvas.element.height = this.canvas.element.offsetHeight * window.devicePixelRatio;
    this.canvas.width = this.canvas.element.offsetWidth;
    this.canvas.height = this.canvas.element.offsetHeight;
    this.canvas.context.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  /**
   * Redraw the canvas, clearing it and drawing all elements on it.
   */
  redraw() {
    // Clear canvas
    this.clear();

    // Basic canvas elements
    this.drawGrid();
    this.drawAxes();

    // Draw dynamic canvas elements
    this.elements.forEach((element) => {
      element.draw();
    });

    // Class boundaries
    this.drawClassBoundaries();

    // Refresh again
    window.requestAnimationFrame(() => this.refresh());
  }

  /**
   * Refresh (i.e. redraw) everything on the canvas.
   */
  refresh() {
    // Dynamic canvas elements
    this.elements.forEach((element) => {
      element.update();
    });

    this.redraw();
  }

  /**
   * Set the class boundaries used for drawing the decision regions on the canvas.
   *
   * @param {Object<string, Array.<Array.<Array.<number>>>>} classesBoundaries - Class boundaries
   *   per class label
   */
  setClassBoundaries(classesBoundaries) {
    this.classesBoundaries = classesBoundaries;
  }

  /**
   * Calculate normalized canvas coordinates, i.e. transform mouse coordinates (relative to the
   * canvas origin = top left) to feature space for both x and y. The feature subspace shape is
   * determined by the x1, y1, x2, and y2 parameters in the class options (see constructor).
   *
   * @param {number} x - x-coordinate in canvas
   * @param {number} y - y-coordinate in canvas
   * @return {Array.<number>} Corresponding point in feature space (first element corresponds to x,
   *   second element corresponds to y)
   */
  convertCanvasCoordinatesToFeatures(x, y) {
    // Mouse x- and y-position on [0,1] interval
    let f1 = x / this.canvas.width;
    let f2 = y / this.canvas.height;

    // Convert to [-1,1] interval
    f1 = this.options.x1 + f1 * (this.options.x2 - this.options.x1);
    f2 = this.options.y1 + (1 - f2) * (this.options.y2 - this.options.y1);

    return [f1, f2];
  }

  /**
   * Convert coordinates on a centered, double unit square (i.e., a square from (-1, -1) to (1, 1))
   * to feature space.
   *
   * @param {number} bx - Input x-coordinate in input space
   * @param {number} by - Input y-coordinate in input space
   * @return {Array.<number>} Corresponding point in feature space (first element corresponds to x,
   *   second element corresponds to y)
   */
  convertBoundaryCoordinatesToFeatures(bx, by) {
    const f1 = this.options.x1 + (bx + 1) / 2 * (this.options.x2 - this.options.x1);
    const f2 = this.options.y1 + (by + 1) / 2 * (this.options.y2 - this.options.y1);

    return [f1, f2];
  }

  /**
   * Calculate canvas coordinates (origin at (0,0)) for a 2-dimensional data point's features
   *
   * @param {number} f1 First feature
   * @param {number} f2 Second feature
   * @return {Array.<number>} Corresponding point in the canvas (first element corresponds to x,
   *   second element corresponds to y)
   */
  convertFeaturesToCanvasCoordinates(f1, f2) {
    const x = (f1 - this.options.x1) / (this.options.x2 - this.options.x1);
    const y = 1 - ((f2 - this.options.y1) / (this.options.y2 - this.options.y1));

    return [x * this.canvas.width, y * this.canvas.height];
  }

  /**
   * Draw a grid on the canvas
   */
  drawGrid() {
    const canvas = this.canvas;
    const context = canvas.context;

    // Loop over all line offsets
    for (let i = 1; i < 10; i += 1) {
      // Horizontal
      context.beginPath();
      context.moveTo(0, i / 10 * canvas.height);
      context.lineTo(canvas.width, i / 10 * canvas.height);
      context.lineWidth = 1;
      context.strokeStyle = '#EAEAEA';
      context.stroke();

      // Vertical
      context.beginPath();
      context.moveTo(i / 10 * canvas.width, 0);
      context.lineTo(i / 10 * canvas.width, canvas.height);
      context.lineWidth = 1;
      context.strokeStyle = '#EAEAEA';
      context.stroke();
    }
  }

  /**
   * Draw the axes on the canvas
   */
  drawAxes() {
    const canvas = this.canvas;
    const context = canvas.context;

    // Origin coordinates
    const [originX, originY] = this.convertFeaturesToCanvasCoordinates(0, 0);

    // Horizontal
    context.beginPath();
    context.moveTo(0, originY);
    context.lineTo(canvas.width, originY);
    context.lineWidth = 2;
    context.strokeStyle = '#CCC';
    context.stroke();

    // Vertical
    context.beginPath();
    context.moveTo(originX, 0);
    context.lineTo(originX, canvas.height);
    context.lineWidth = 2;
    context.strokeStyle = '#CCC';
    context.stroke();
  }

  /**
   * Draw class boundaries
   */
  drawClassBoundaries() {
    const context = this.canvas.context;

    Object.keys(this.classesBoundaries).forEach((classLabel) => {
      const classBoundaries = this.classesBoundaries[classLabel];

      // The path delineates the decision region for this class
      context.beginPath();

      classBoundaries.forEach((classBoundary) => {
        let firstpoint = true;

        classBoundary.forEach((boundaryPoint) => {
          const [xx, yy] = this.convertFeaturesToCanvasCoordinates(
            ...this.convertBoundaryCoordinatesToFeatures(boundaryPoint[0], boundaryPoint[1])
          );

          if (firstpoint) {
            firstpoint = false;
            context.moveTo(xx, yy);
          } else {
            context.lineTo(xx, yy);
          }

          if (Math.abs(boundaryPoint[0]) !== 1 && Math.abs(boundaryPoint[1]) !== 1) {
            context.fillStyle = this.getClassColor(classLabel);
            context.fillStyle = '#000';
            context.globalAlpha = 0.25;
            context.globalAlpha = 1;
          }
        });

        context.closePath();
      });

      context.fillStyle = '#5DA5DA';
      context.strokeStyle = '#5DA5DA';
      context.fillStyle = this.getClassColor(classLabel);
      context.strokeStyle = this.getClassColor(classLabel);
      context.globalAlpha = 0.5;
      context.fill();
      context.globalAlpha = 1;
    });
  }

  /**
   * Get drawing color for a class index.
   *
   * @param {number} classIndex - Class index
   * @return {string} Color in HEX with '#' prefix
   */
  getClassColor(classIndex) {
    const colors = this.getColors();
    return classIndex === null ? '#DDDDDD' : colors[Object.keys(colors)[parseInt(classIndex, 10)]];
  }

  /**
   * Get available drawing colors.
   *
   * @return <Array.{string}> Colors in HEX with '#' prefix; array keys are color names
   */
  getColors() {
    return {
      blue: '#5DA5DA',
      orange: '#FAA43A',
      green: '#60BD68',
      pink: '#F17CB0',
      brown: '#B2912F',
      purple: '#B276B2',
      yellow: '#DECF3F',
      red: '#F15854',
      gray: '#4D4D4D',
    };
  }
}
