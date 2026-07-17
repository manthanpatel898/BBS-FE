export type DecorationOverlayOrigin = 'EVENTS' | 'FOLLOWUPS' | 'DASHBOARD';
export type DecorationChildOverlay =
  | 'ADD'
  | 'EDIT'
  | 'ADVANCE'
  | 'FOLLOWUP'
  | 'SELECTION'
  | 'PRINT';

export type DecorationOverlayState = {
  date: string | null;
  bookingId: string | null;
  child: DecorationChildOverlay | null;
  origin: DecorationOverlayOrigin;
};

export type DecorationOverlayAction =
  | { type: 'OPEN_DAY'; date: string; origin: DecorationOverlayOrigin }
  | { type: 'OPEN_DETAIL'; bookingId: string }
  | { type: 'OPEN_CHILD'; child: DecorationChildOverlay }
  | { type: 'CLOSE_TOP' }
  | { type: 'RESET'; origin?: DecorationOverlayOrigin };

export const initialDecorationOverlayState: DecorationOverlayState = {
  date: null,
  bookingId: null,
  child: null,
  origin: 'EVENTS',
};

export function getDecorationOverlayLayer(state: DecorationOverlayState): 'CALENDAR' | 'DAY' | 'DETAIL' | 'DETAIL_CHILD' {
  if (state.child) return state.bookingId ? 'DETAIL_CHILD' : 'DAY';
  if (state.bookingId) return 'DETAIL';
  return state.date ? 'DAY' : 'CALENDAR';
}

export function decorationOverlayReducer(
  state: DecorationOverlayState,
  action: DecorationOverlayAction,
): DecorationOverlayState {
  switch (action.type) {
    case 'OPEN_DAY':
      return {
        date: action.date,
        bookingId: null,
        child: null,
        origin: action.origin,
      };
    case 'OPEN_DETAIL':
      if (!action.bookingId.trim()) {
        throw new Error('A booking ID is required to open Event Detail');
      }
      return { ...state, bookingId: action.bookingId, child: null };
    case 'OPEN_CHILD':
      if (action.child !== 'ADD' && !state.bookingId) {
        throw new Error('A selected booking is required to open this workflow');
      }
      return { ...state, child: action.child };
    case 'CLOSE_TOP':
      if (state.child) return { ...state, child: null };
      if (state.bookingId) return { ...state, bookingId: null };
      if (state.date) return { ...state, date: null };
      return state;
    case 'RESET':
      return {
        ...initialDecorationOverlayState,
        origin: action.origin ?? state.origin,
      };
  }
}
