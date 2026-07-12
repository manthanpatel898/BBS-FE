export function getDaySidebarOrders<T>(
  dateKey: string,
  ordersByDate: ReadonlyMap<string, T[]>,
) {
  return ordersByDate.get(dateKey) ?? [];
}
