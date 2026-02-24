import { describe, it, expect } from 'vitest';
import { AnimationManager } from './AnimationManager.js';

describe('AnimationManager', () => {
  const DT = 1 / 60;

  it('starts in idle state', () => {
    const mgr = new AnimationManager();
    expect(mgr.getCurrentState()).toBe('idle');
  });

  it('transitions idle → walk on walking input', () => {
    const mgr = new AnimationManager();
    mgr.update('walking', DT);
    expect(mgr.getCurrentState()).toBe('walk');
  });

  it('transitions idle → run on running input', () => {
    const mgr = new AnimationManager();
    mgr.update('running', DT);
    expect(mgr.getCurrentState()).toBe('run');
  });

  it('transitions walk → idle when stopped', () => {
    const mgr = new AnimationManager();
    mgr.update('walking', DT);
    expect(mgr.getCurrentState()).toBe('walk');
    mgr.update('idle', DT);
    expect(mgr.getCurrentState()).toBe('idle');
  });

  it('transitions walk → run on shift', () => {
    const mgr = new AnimationManager();
    mgr.update('walking', DT);
    mgr.update('running', DT);
    expect(mgr.getCurrentState()).toBe('run');
  });

  it('transitions run → walk on shift release', () => {
    const mgr = new AnimationManager();
    mgr.update('running', DT);
    mgr.update('walking', DT);
    expect(mgr.getCurrentState()).toBe('walk');
  });

  it('transitions idle → jump on jumping', () => {
    const mgr = new AnimationManager();
    mgr.update('jumping', DT);
    expect(mgr.getCurrentState()).toBe('jump');
  });

  it('jump stays in jump when falling (self-contained animation)', () => {
    const mgr = new AnimationManager();
    mgr.update('jumping', DT);
    expect(mgr.getCurrentState()).toBe('jump');
    mgr.update('falling', DT); // downward arc — still playing Jump anim
    expect(mgr.getCurrentState()).toBe('jump');
  });

  it('jump goes directly to idle on ground contact', () => {
    const mgr = new AnimationManager();
    mgr.update('jumping', DT);
    mgr.update('falling', DT); // downward arc
    mgr.update('idle', DT); // grounded
    expect(mgr.getCurrentState()).toBe('idle');
  });

  it('jump goes directly to walk if moving on landing', () => {
    const mgr = new AnimationManager();
    mgr.update('jumping', DT);
    mgr.update('falling', DT);
    mgr.update('walking', DT); // landed while moving
    expect(mgr.getCurrentState()).toBe('walk');
  });

  it('fall (ledge) goes directly to idle on ground contact', () => {
    const mgr = new AnimationManager();
    mgr.update('walking', DT);
    mgr.update('falling', DT); // walked off ledge
    expect(mgr.getCurrentState()).toBe('fall');
    mgr.update('idle', DT); // grounded
    expect(mgr.getCurrentState()).toBe('idle');
  });

  it('transitions walk → fall when not grounded', () => {
    const mgr = new AnimationManager();
    mgr.update('walking', DT);
    mgr.update('falling', DT);
    expect(mgr.getCurrentState()).toBe('fall');
  });

  it('stays in jump when still ascending', () => {
    const mgr = new AnimationManager();
    mgr.update('jumping', DT);
    mgr.update('jumping', DT); // still going up
    expect(mgr.getCurrentState()).toBe('jump');
  });
});
