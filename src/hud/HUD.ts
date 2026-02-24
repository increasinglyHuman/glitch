import type { CameraMode } from '../types/index.js';

const HUD_STYLES = `
  #glitch-hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 10;
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }
  #glitch-hud .hud-element {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
    padding: 4px 8px;
    position: absolute;
  }
  #glitch-hud .hud-close {
    top: 12px;
    right: 12px;
    pointer-events: auto;
    cursor: pointer;
    font-size: 16px;
    border: none;
    background: rgba(0, 0, 0, 0.5);
    color: rgba(255, 255, 255, 0.5);
    border-radius: 4px;
    padding: 4px 10px;
    font-family: inherit;
    transition: color 0.15s;
  }
  #glitch-hud .hud-close:hover {
    color: #fff;
  }
  #glitch-hud .hud-coords {
    bottom: 12px;
    left: 12px;
  }
  #glitch-hud .hud-fps {
    bottom: 12px;
    right: 12px;
    font-size: 11px;
    opacity: 0.6;
  }
`;

/**
 * Minimal HTML/CSS overlay HUD.
 * No Babylon GUI dependency — plain DOM elements.
 */
export class HUD {
  private container: HTMLElement;
  private root: HTMLDivElement;
  private closeBtn: HTMLButtonElement;
  private coordsEl: HTMLDivElement;
  private fpsEl: HTMLDivElement;
  private styleEl: HTMLStyleElement;
  private closeCallback: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // Inject styles
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = HUD_STYLES;
    document.head.appendChild(this.styleEl);

    // Root
    this.root = document.createElement('div');
    this.root.id = 'glitch-hud';

    // Close button (just X, no text)
    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'hud-close';
    this.closeBtn.textContent = '\u2715';
    this.closeBtn.addEventListener('click', () => this.closeCallback?.());
    this.root.appendChild(this.closeBtn);

    // Coordinates
    this.coordsEl = document.createElement('div');
    this.coordsEl.className = 'hud-element hud-coords';
    this.coordsEl.textContent = 'X: 0.0  Y: 0.0  Z: 0.0';
    this.coordsEl.style.display = 'none';
    this.root.appendChild(this.coordsEl);

    // FPS
    this.fpsEl = document.createElement('div');
    this.fpsEl.className = 'hud-element hud-fps';
    this.fpsEl.textContent = '-- FPS';
    this.root.appendChild(this.fpsEl);

    this.container.appendChild(this.root);
  }

  setLabel(_text: string): void {
    // Label removed for minimalism — no-op for API compatibility
  }

  setCameraMode(_mode: CameraMode): void {
    // Camera mode indicator removed — no-op for API compatibility
  }

  setCoordinates(x: number, y: number, z: number): void {
    this.coordsEl.textContent = `X: ${x.toFixed(1)}  Y: ${y.toFixed(1)}  Z: ${z.toFixed(1)}`;
  }

  setFPS(fps: number): void {
    this.fpsEl.textContent = `${Math.round(fps)} FPS`;
  }

  showCoordinates(visible: boolean): void {
    this.coordsEl.style.display = visible ? 'block' : 'none';
  }

  onClose(callback: () => void): void {
    this.closeCallback = callback;
  }

  dispose(): void {
    this.styleEl.remove();
    this.root.remove();
    this.closeCallback = null;
  }
}
