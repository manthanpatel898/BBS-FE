export type BookingOverlayParent<TDay, TOrder> =
  | { type: 'day-sidebar'; value: TDay }
  | { type: 'event-detail'; value: TOrder }
  | null;

export function consumeOverlayParent<TDay, TOrder>(
  parent: BookingOverlayParent<TDay, TOrder>,
) {
  return { restored: parent, nextParent: null } as const;
}
