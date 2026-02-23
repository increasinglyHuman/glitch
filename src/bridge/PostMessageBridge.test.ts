import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PostMessageBridge } from './PostMessageBridge.js';

describe('PostMessageBridge', () => {
  let listeners: Map<string, ((event: MessageEvent) => void)[]>;
  let postMessageSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listeners = new Map();
    postMessageSpy = vi.fn();

    vi.stubGlobal('window', {
      addEventListener: (type: string, handler: (event: MessageEvent) => void) => {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type)!.push(handler);
      },
      removeEventListener: (type: string, handler: (event: MessageEvent) => void) => {
        const handlers = listeners.get(type);
        if (handlers) {
          const idx = handlers.indexOf(handler);
          if (idx >= 0) handlers.splice(idx, 1);
        }
      },
      parent: { postMessage: postMessageSpy },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function dispatchMessage(data: unknown, origin = 'https://poqpoq.com'): void {
    const handlers = listeners.get('message') || [];
    for (const handler of handlers) {
      handler({ data, origin } as MessageEvent);
    }
  }

  it('calls spawn callback on valid glitch_spawn message', () => {
    const bridge = new PostMessageBridge();
    const callback = vi.fn();
    bridge.onSpawn(callback);

    const payload = { glitchType: 'terraformer', label: 'Test' };
    dispatchMessage({ type: 'glitch_spawn', payload });

    expect(callback).toHaveBeenCalledWith(payload);
    bridge.dispose();
  });

  it('ignores messages without type glitch_spawn', () => {
    const bridge = new PostMessageBridge();
    const callback = vi.fn();
    bridge.onSpawn(callback);

    dispatchMessage({ type: 'other_message', payload: {} });
    dispatchMessage('not an object');
    dispatchMessage(null);
    dispatchMessage(42);

    expect(callback).not.toHaveBeenCalled();
    bridge.dispose();
  });

  it('rejects messages from wrong origin when allowedOrigin set', () => {
    const bridge = new PostMessageBridge('https://poqpoq.com');
    const callback = vi.fn();
    bridge.onSpawn(callback);

    const payload = { glitchType: 'generic' };
    dispatchMessage({ type: 'glitch_spawn', payload }, 'https://evil.com');

    expect(callback).not.toHaveBeenCalled();
    bridge.dispose();
  });

  it('accepts messages from correct origin when allowedOrigin set', () => {
    const bridge = new PostMessageBridge('https://poqpoq.com');
    const callback = vi.fn();
    bridge.onSpawn(callback);

    const payload = { glitchType: 'generic' };
    dispatchMessage({ type: 'glitch_spawn', payload }, 'https://poqpoq.com');

    expect(callback).toHaveBeenCalledWith(payload);
    bridge.dispose();
  });

  it('sends glitch_ready to parent', () => {
    const bridge = new PostMessageBridge();
    bridge.sendReady();
    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: 'glitch_ready', source: 'glitch' },
      '*',
    );
    bridge.dispose();
  });

  it('sends glitch_close to parent', () => {
    const bridge = new PostMessageBridge();
    bridge.sendClose();
    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: 'glitch_close', source: 'glitch' },
      '*',
    );
    bridge.dispose();
  });

  it('sends glitch_error to parent with error string', () => {
    const bridge = new PostMessageBridge();
    bridge.sendError('Something broke');
    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: 'glitch_error', source: 'glitch', error: 'Something broke' },
      '*',
    );
    bridge.dispose();
  });

  it('stops listening after dispose', () => {
    const bridge = new PostMessageBridge();
    const callback = vi.fn();
    bridge.onSpawn(callback);
    bridge.dispose();

    dispatchMessage({ type: 'glitch_spawn', payload: { glitchType: 'generic' } });
    expect(callback).not.toHaveBeenCalled();
  });
});
