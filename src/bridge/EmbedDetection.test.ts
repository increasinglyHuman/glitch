import { describe, it, expect, vi, afterEach } from 'vitest';
import { isEmbedded, getParentOrigin } from './EmbedDetection.js';

describe('EmbedDetection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isEmbedded', () => {
    it('returns false when window.self === window.top', () => {
      // Default JSDOM/node: self === top (not in iframe)
      // In node test env, window may not exist, so we need to mock
      vi.stubGlobal('window', { self: {}, top: {} });
      // Make them the same reference
      (window as unknown as Record<string, unknown>).top = window.self;
      expect(isEmbedded()).toBe(false);
    });

    it('returns true when window.self !== window.top', () => {
      vi.stubGlobal('window', { self: {}, top: {} });
      expect(isEmbedded()).toBe(true);
    });

    it('returns true when accessing window.top throws (cross-origin)', () => {
      vi.stubGlobal('window', {
        self: {},
        get top(): never {
          throw new DOMException('cross-origin');
        },
      });
      expect(isEmbedded()).toBe(true);
    });
  });

  describe('getParentOrigin', () => {
    it('returns null when not embedded', () => {
      vi.stubGlobal('window', { self: {}, top: {} });
      (window as unknown as Record<string, unknown>).top = window.self;
      vi.stubGlobal('document', { referrer: 'https://poqpoq.com/terraformer/' });
      expect(getParentOrigin()).toBeNull();
    });

    it('returns origin from document.referrer when embedded', () => {
      vi.stubGlobal('window', { self: {}, top: {} });
      vi.stubGlobal('document', { referrer: 'https://poqpoq.com/terraformer/' });
      expect(getParentOrigin()).toBe('https://poqpoq.com');
    });

    it('returns null when referrer is empty', () => {
      vi.stubGlobal('window', { self: {}, top: {} });
      vi.stubGlobal('document', { referrer: '' });
      expect(getParentOrigin()).toBeNull();
    });
  });
});
