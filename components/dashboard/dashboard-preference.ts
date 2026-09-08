export type DashboardView = 'current' | 'new';
const keyFor = (userId: string, restaurantId: string) => `zb:dashboard-view:v1:${encodeURIComponent(restaurantId)}:${encodeURIComponent(userId)}`;

export function readDashboardView(storage: Pick<Storage, 'getItem'>, userId: string, restaurantId: string): DashboardView {
  try { return storage.getItem(keyFor(userId, restaurantId)) === 'new' ? 'new' : 'current'; }
  catch { return 'current'; }
}

export function saveDashboardView(storage: Pick<Storage, 'setItem'>, userId: string, restaurantId: string, view: DashboardView) {
  try { storage.setItem(keyFor(userId, restaurantId), view); } catch { /* Optional preference: blocked storage must not break the dashboard. */ }
}
