export type ShelfPhase = 'idle' | 'focused' | 'opening' | 'open' | 'reading' | 'closing';
export type ShelfEvent =
  | { type: 'FOCUS_CARD'; index: number }
  | { type: 'POINTER_DOWN'; index: number }
  | { type: 'OPEN_SUCCESS'; index: number }
  | { type: 'OPEN_CANCEL' }
  | { type: 'READ_START'; index: number }
  | { type: 'CLOSE_REQUEST' }
  | { type: 'CLOSE_SUCCESS' }
  | { type: 'RESET' };

export type ShelfState = { phase: ShelfPhase; activeIndex: number | null; intentId: number };

export function shelfReducer(state: ShelfState, event: ShelfEvent): ShelfState {
  switch (event.type) {
    case 'FOCUS_CARD': return { ...state, phase: 'focused', activeIndex: event.index };
    case 'POINTER_DOWN': return { ...state, phase: 'opening', activeIndex: event.index, intentId: state.intentId + 1 };
    case 'OPEN_SUCCESS': return state.phase === 'opening' && state.activeIndex === event.index ? { ...state, phase: 'open' } : state;
    case 'OPEN_CANCEL': return state.phase === 'opening' ? { ...state, phase: 'focused' } : state;
    case 'READ_START': return { ...state, phase: 'reading', activeIndex: event.index };
    case 'CLOSE_REQUEST': return { ...state, phase: 'closing' };
    case 'CLOSE_SUCCESS': return { ...state, phase: 'focused' };
    case 'RESET': return { ...state, phase: 'idle' };
    default: return state;
  }
}
