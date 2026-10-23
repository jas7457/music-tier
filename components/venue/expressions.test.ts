import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  express,
  getExpression,
  MAX_SAY_LENGTH,
  receiveExpression,
  setExpressionBroadcaster,
} from './expressions';

afterEach(() => {
  setExpressionBroadcaster(null);
});

describe('express', () => {
  it('shows your emote and sends it to everyone else', () => {
    const sent = vi.fn();
    setExpressionBroadcaster(sent);
    express('me', { kind: 'emote', emote: 'wave' });
    expect(getExpression('me')).toMatchObject({ kind: 'emote', emote: 'wave' });
    expect(sent).toHaveBeenCalledWith({ kind: 'emote', emote: 'wave' });
  });

  it('trims and caps what you say, and sends nothing for an empty message', () => {
    const sent = vi.fn();
    setExpressionBroadcaster(sent);
    express('me', { kind: 'say', text: `  ${'a'.repeat(200)}  ` });
    expect(sent).toHaveBeenCalledWith({ kind: 'say', text: 'a'.repeat(MAX_SAY_LENGTH) });
    sent.mockClear();
    express('me', { kind: 'say', text: '   ' });
    expect(sent).not.toHaveBeenCalled();
  });
});

describe('receiveExpression', () => {
  it("shows someone else's emote without sending it back out", () => {
    const sent = vi.fn();
    setExpressionBroadcaster(sent);
    receiveExpression('friend', { kind: 'emote', emote: 'party' });
    expect(getExpression('friend')).toMatchObject({ kind: 'emote', emote: 'party' });
    expect(sent).not.toHaveBeenCalled();
  });

  it('ignores anything malformed', () => {
    receiveExpression('stranger', { kind: 'emote', emote: 'not-an-emote' });
    receiveExpression('stranger', { kind: 'say', text: 42 });
    receiveExpression('stranger', 'nonsense');
    receiveExpression('stranger', null);
    expect(getExpression('stranger')).toBeUndefined();
  });
});
