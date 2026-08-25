import { describe, expect, it } from 'vitest';
import { shelfReducer, type ShelfState } from './shelf-state';

const initial: ShelfState = { phase: 'idle', activeIndex: null, intentId: 0 };

describe('shelfReducer', () => {
  it('moves focus and clamps the active card through the event payload', () => {
    const focused = shelfReducer(initial, { type: 'FOCUS_CARD', index: 2 });
    expect(focused).toMatchObject({ phase: 'focused', activeIndex: 2, intentId: 0 });
  });

  it('creates a new intent when opening begins', () => {
    const opening = shelfReducer(initial, { type: 'POINTER_DOWN', index: 1 });
    expect(opening).toMatchObject({ phase: 'opening', activeIndex: 1, intentId: 1 });
  });

  it('accepts OPEN_SUCCESS only for the active opening intent', () => {
    const opening = shelfReducer(initial, { type: 'POINTER_DOWN', index: 1 });
    expect(shelfReducer(opening, { type: 'OPEN_SUCCESS', index: 1 }).phase).toBe('open');
    expect(shelfReducer(opening, { type: 'OPEN_SUCCESS', index: 0 })).toEqual(opening);
    expect(shelfReducer(initial, { type: 'OPEN_SUCCESS', index: 1 })).toEqual(initial);
  });

  it('cancels opening safely during a drag or pointer cancel', () => {
    const opening = shelfReducer(initial, { type: 'POINTER_DOWN', index: 1 });
    expect(shelfReducer(opening, { type: 'OPEN_CANCEL' })).toMatchObject({ phase: 'focused', activeIndex: 1 });
    expect(shelfReducer(initial, { type: 'OPEN_CANCEL' })).toEqual(initial);
  });

  it('enters reading and supports close recovery', () => {
    const reading = shelfReducer({ ...initial, phase: 'open', activeIndex: 2 }, { type: 'READ_START', index: 2 });
    expect(reading.phase).toBe('reading');
    expect(shelfReducer(reading, { type: 'CLOSE_REQUEST' }).phase).toBe('closing');
    expect(shelfReducer({ ...reading, phase: 'closing' }, { type: 'CLOSE_SUCCESS' })).toMatchObject({ phase: 'focused', activeIndex: 2 });
  });

  it('resets without losing the selected card for focus restoration', () => {
    const active = { phase: 'focused' as const, activeIndex: 3, intentId: 4 };
    expect(shelfReducer(active, { type: 'RESET' })).toEqual({ phase: 'idle', activeIndex: 3, intentId: 4 });
  });
});
