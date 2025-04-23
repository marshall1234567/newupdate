// Mock localStorage
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = value;
  }

  removeItem(key) {
    delete this.store[key];
  }
}

global.localStorage = new LocalStorageMock();

// Mock timer functions
global.setInterval = jest.fn();
global.clearInterval = jest.fn();

// Mock Chart.js
class Chart {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.type = config.type;
    this.data = config.data;
    this.options = config.options;
    this.destroyed = false;
  }

  destroy() {
    this.destroyed = true;
  }

  update(mode) {
    this._lastUpdateMode = mode;
  }

  resize() {
    this._resized = true;
  }
}

global.Chart = Chart;

// Mock DOM elements and functions
class MockCanvasContext {
  constructor() {
    // Add any canvas context methods you need to mock
  }
}

class MockElement {
  #innerText = '';

  constructor(type = 'div') {
    this.type = type;
    this.classList = {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn()
    };
    this.addEventListener = jest.fn();
    this.innerHTML = '';
    this.appendChild = jest.fn();
    this.disabled = false;
  }

  getContext() {
    if (this.type === 'canvas') {
      return new MockCanvasContext();
    }
    return null;
  }

  get innerText() {
    return this.#innerText;
  }

  set innerText(value) {
    this.#innerText = value;
  }
}

const elements = {};

document.getElementById = jest.fn((id) => {
  if (!elements[id]) {
    elements[id] = new MockElement(id === 'analyticsChart' ? 'canvas' : 'div');
  }
  return elements[id];
});

window.alert = jest.fn();
window.prompt = jest.fn();
