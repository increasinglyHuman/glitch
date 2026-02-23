import type { GlitchSpawnPayload } from '../types/index.js';

type SpawnCallback = (payload: GlitchSpawnPayload) => void;

/**
 * PostMessage bridge for parent tool ↔ Glitch communication.
 *
 * Incoming: { type: 'glitch_spawn', payload: GlitchSpawnPayload }
 * Outgoing: glitch_ready, glitch_close, glitch_error
 */
export class PostMessageBridge {
  private allowedOrigin: string | null;
  private spawnCallback: SpawnCallback | null = null;
  private messageHandler: (event: MessageEvent) => void;

  constructor(allowedOrigin?: string) {
    this.allowedOrigin = allowedOrigin ?? null;

    this.messageHandler = (event: MessageEvent): void => {
      // Origin validation
      if (this.allowedOrigin && event.origin !== this.allowedOrigin) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object' || data.type !== 'glitch_spawn') {
        return;
      }

      if (this.spawnCallback && data.payload) {
        this.spawnCallback(data.payload as GlitchSpawnPayload);
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  onSpawn(callback: SpawnCallback): void {
    this.spawnCallback = callback;
  }

  sendReady(): void {
    window.parent.postMessage({ type: 'glitch_ready', source: 'glitch' }, '*');
  }

  sendClose(): void {
    window.parent.postMessage({ type: 'glitch_close', source: 'glitch' }, '*');
  }

  sendError(error: string): void {
    window.parent.postMessage({ type: 'glitch_error', source: 'glitch', error }, '*');
  }

  dispose(): void {
    window.removeEventListener('message', this.messageHandler);
    this.spawnCallback = null;
  }
}
