import { state } from '../core/state.js';

// FLAME CANVAS SYSTEM (Performance Optimization)

let _flameCanvas = null;
let _flameCtx = null;
let _flameCanvasInitialized = false;

export function initFlameCanvas() {
  if (_flameCanvasInitialized) return;
  _flameCanvas = document.createElement('canvas');
  _flameCtx = _flameCanvas.getContext('2d');
  _flameCanvas.width = state.canvas.width;
  _flameCanvas.height = state.canvas.height;
  _flameCanvasInitialized = true;
}

export function resizeFlameCanvas() {
  if (!_flameCanvasInitialized) initFlameCanvas();
  if (_flameCanvas.width !== state.canvas.width || _flameCanvas.height !== state.canvas.height) {
    _flameCanvas.width = state.canvas.width;
    _flameCanvas.height = state.canvas.height;
  }
}

export function getFlameCanvas() {
  if (!_flameCanvasInitialized) initFlameCanvas();
  return { canvas: _flameCanvas, ctx: _flameCtx };
}

export function clearFlameCanvas() {
  if (!_flameCanvasInitialized) return;
  _flameCtx.clearRect(0, 0, _flameCanvas.width, _flameCanvas.height);
}

export function drawFlamesToCanvas(flames) {
  if (!_flameCanvasInitialized) initFlameCanvas();
  _flameCtx.clearRect(0, 0, _flameCanvas.width, _flameCanvas.height);
  return;
}

export function compositeFlameCanvas() {
  if (!_flameCanvasInitialized || !_flameCanvas) return;
  state.ctx.drawImage(_flameCanvas, 0, 0);
}
