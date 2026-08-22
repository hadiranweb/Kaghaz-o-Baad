export type ReaderPhase =
  | 'loading'
  | 'ready'
  | 'turning-next'
  | 'turning-prev'
  | 'settled'
  | 'empty'
  | 'error'
  | 'fallback';

export type ReaderState = {
  phase: ReaderPhase;
  index: number;
  count: number;
  dragProgress: number;
  error?: string;
};

export type ReaderEvent =
  | { type: 'DATA_LOADING' }
  | { type: 'DATA_READY'; count: number }
  | { type: 'DATA_EMPTY' }
  | { type: 'DATA_ERROR'; message?: string }
  | { type: 'NEXT_START' }
  | { type: 'PREVIOUS_START' }
  | { type: 'TURN_COMMIT'; index: number }
  | { type: 'TURN_CANCEL' }
  | { type: 'DRAG'; progress: number }
  | { type: 'FALLBACK' };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function createReaderState(): ReaderState {
  return { phase: 'loading', index: 0, count: 0, dragProgress: 0 };
}

export function readerReducer(state: ReaderState, event: ReaderEvent): ReaderState {
  switch (event.type) {
    case 'DATA_LOADING':
      return { ...state, phase: 'loading', error: undefined };
    case 'DATA_READY':
      return { ...state, phase: event.count > 0 ? 'ready' : 'empty', count: event.count, index: 0, dragProgress: 0, error: undefined };
    case 'DATA_EMPTY':
      return { ...state, phase: 'empty', count: 0, index: 0, dragProgress: 0 };
    case 'DATA_ERROR':
      return { ...state, phase: 'error', error: event.message, dragProgress: 0 };
    case 'NEXT_START':
      return state.index < state.count - 1 ? { ...state, phase: 'turning-next', dragProgress: 0 } : state;
    case 'PREVIOUS_START':
      return state.index > 0 ? { ...state, phase: 'turning-prev', dragProgress: 0 } : state;
    case 'TURN_COMMIT':
      return { ...state, phase: 'settled', index: clamp(event.index, 0, Math.max(state.count - 1, 0)), dragProgress: 0 };
    case 'TURN_CANCEL':
      return { ...state, phase: 'ready', dragProgress: 0 };
    case 'DRAG':
      return { ...state, dragProgress: clamp(event.progress, -1, 1) };
    case 'FALLBACK':
      return { ...state, phase: 'fallback', dragProgress: 0 };
    default:
      return state;
  }
}
