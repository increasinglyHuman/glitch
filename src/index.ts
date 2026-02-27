import { isEmbedded } from './bridge/EmbedDetection.js';
import { PostMessageBridge } from './bridge/PostMessageBridge.js';
import { parseSpawnPayload } from './core/GlitchPayloadParser.js';
import { GlitchLifecycle } from './core/GlitchLifecycle.js';
import { BASE_DEFAULTS } from './types/index.js';
import type { GlitchConfig } from './types/index.js';

/**
 * poqpoq Glitch — Entry Point
 *
 * Embedded (iframe): waits for glitch_spawn postMessage from parent.
 * Standalone (dev): boots immediately with default generic config.
 */
async function boot(): Promise<void> {
  const container = document.getElementById('glitch-container');
  const canvas = document.getElementById('glitch-canvas') as HTMLCanvasElement;

  if (!container || !canvas) {
    throw new Error('Missing #glitch-container or #glitch-canvas elements');
  }

  const bridge = new PostMessageBridge();
  const lifecycle = new GlitchLifecycle(container, canvas);
  lifecycle.setPostMessageBridge(bridge);

  const launchGlitch = async (config: GlitchConfig): Promise<void> => {
    try {
      await lifecycle.spawn(config);

      // Wire close handler (close button only — no ESC kill)
      lifecycle.getHUD()?.onClose(() => {
        lifecycle.dispose();
        bridge.sendClose();
      });

      bridge.sendReady();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Glitch] Fatal:', msg);
      bridge.sendError(msg);
    }
  };

  if (isEmbedded()) {
    // Wait for parent tool to send spawn payload
    bridge.onSpawn(async (payload) => {
      try {
        const config = parseSpawnPayload(payload);
        await launchGlitch(config);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[Glitch] Payload error:', msg);
        bridge.sendError(msg);
      }
    });
    console.log('[Glitch] Embedded mode — waiting for spawn payload...');
  } else {
    // Standalone dev mode — boot immediately with defaults
    console.log('[Glitch] Standalone mode — booting with defaults');
    const config: GlitchConfig = {
      ...BASE_DEFAULTS,
      label: 'Glitch Dev',
    };
    await launchGlitch(config);
  }
}

// Global error handler
window.onerror = (_msg, _src, _line, _col, error): void => {
  console.error('[Glitch] Unhandled error:', error);
};

boot().catch((error) => {
  console.error('[Glitch] Boot failed:', error);
});
