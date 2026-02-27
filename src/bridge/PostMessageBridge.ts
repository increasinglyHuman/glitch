import type {
  GlitchSpawnPayload,
  ScripterCommandMessage,
  ScripterResetMessage,
  ScripterCreatePrimMessage,
  ScripterLoadMessage,
} from '../types/index.js';

type SpawnCallback = (payload: GlitchSpawnPayload) => void;

// === Scripter callback types ===
type ScripterCommandCallback = (msg: ScripterCommandMessage) => void;
type ScripterResetCallback = (msg: ScripterResetMessage) => void;
type ScripterCreatePrimCallback = (msg: ScripterCreatePrimMessage) => void;
type ScripterLoadCallback = (msg: ScripterLoadMessage) => void;

/**
 * PostMessage bridge for parent tool ↔ Glitch communication.
 *
 * Incoming (core):     { type: 'glitch_spawn', payload: GlitchSpawnPayload }
 * Incoming (scripter): { type: 'scripter_command' | 'scripter_reset' |
 *                               'scripter_create_prim' | 'scripter_load' }
 * Outgoing (core):     glitch_ready, glitch_close, glitch_error
 * Outgoing (scripter): scripter_event, scripter_console
 */
export class PostMessageBridge {
  private allowedOrigin: string | null;
  private spawnCallback: SpawnCallback | null = null;
  private messageHandler: (event: MessageEvent) => void;

  // Scripter callbacks
  private scripterCommandCallback: ScripterCommandCallback | null = null;
  private scripterResetCallback: ScripterResetCallback | null = null;
  private scripterCreatePrimCallback: ScripterCreatePrimCallback | null = null;
  private scripterLoadCallback: ScripterLoadCallback | null = null;

  constructor(allowedOrigin?: string) {
    this.allowedOrigin = allowedOrigin ?? null;

    this.messageHandler = (event: MessageEvent): void => {
      // Origin validation
      if (this.allowedOrigin && event.origin !== this.allowedOrigin) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object' || typeof data.type !== 'string') {
        return;
      }

      switch (data.type) {
        case 'glitch_spawn':
          if (this.spawnCallback && data.payload) {
            this.spawnCallback(data.payload as GlitchSpawnPayload);
          }
          break;

        case 'scripter_command':
          this.scripterCommandCallback?.(data as ScripterCommandMessage);
          break;

        case 'scripter_reset':
          this.scripterResetCallback?.(data as ScripterResetMessage);
          break;

        case 'scripter_create_prim':
          this.scripterCreatePrimCallback?.(data as ScripterCreatePrimMessage);
          break;

        case 'scripter_load':
          this.scripterLoadCallback?.(data as ScripterLoadMessage);
          break;
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  // === Core callbacks ===

  onSpawn(callback: SpawnCallback): void {
    this.spawnCallback = callback;
  }

  // === Scripter callbacks ===

  onScripterCommand(callback: ScripterCommandCallback): void {
    this.scripterCommandCallback = callback;
  }

  onScripterReset(callback: ScripterResetCallback): void {
    this.scripterResetCallback = callback;
  }

  onScripterCreatePrim(callback: ScripterCreatePrimCallback): void {
    this.scripterCreatePrimCallback = callback;
  }

  onScripterLoad(callback: ScripterLoadCallback): void {
    this.scripterLoadCallback = callback;
  }

  // === Outgoing: core ===

  sendReady(): void {
    window.parent.postMessage({ type: 'glitch_ready', source: 'glitch' }, '*');
  }

  sendClose(): void {
    window.parent.postMessage({ type: 'glitch_close', source: 'glitch' }, '*');
  }

  sendError(error: string): void {
    window.parent.postMessage({ type: 'glitch_error', source: 'glitch', error }, '*');
  }

  // === Outgoing: scripter events ===

  sendScripterEvent(envelope: {
    objectId: string;
    event: { type: string; [key: string]: unknown };
  }): void {
    window.parent.postMessage({
      type: 'scripter_event',
      source: 'glitch',
      envelope,
    }, '*');
  }

  sendScripterConsole(data: {
    channel: number;
    message: string;
    senderName: string;
    objectId: string;
    verb: string;
  }): void {
    window.parent.postMessage({
      type: 'scripter_console',
      source: 'glitch',
      ...data,
    }, '*');
  }

  dispose(): void {
    window.removeEventListener('message', this.messageHandler);
    this.spawnCallback = null;
    this.scripterCommandCallback = null;
    this.scripterResetCallback = null;
    this.scripterCreatePrimCallback = null;
    this.scripterLoadCallback = null;
  }
}
