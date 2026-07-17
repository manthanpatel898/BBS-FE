import type { DecorationItem, DecorationSnapshotLine } from '@/lib/auth/types';

export type DecorationChoice = { quantity: number; description: string; imageId?: string; fallbackImageUrl?: string };
export type CustomDecorationChoice = { clientId: string; name: string; quantity: number; description: string; imageKey: string; imageUrl: string };
export type DecorationSelectionState = { choices: Record<string, DecorationChoice>; customItems: CustomDecorationChoice[] };

export function hydrateDecorationSelection(snapshot: Partial<DecorationSnapshotLine>[], items: Pick<DecorationItem, 'id' | 'images'>[]): DecorationSelectionState {
  const choices: Record<string, DecorationChoice> = {}, customItems: CustomDecorationChoice[] = [];
  snapshot.forEach((line, index) => {
    if (line.isCustom) { customItems.push({ clientId: `existing-${index}`, name: line.itemName ?? '', quantity: line.quantity ?? 1, description: line.description ?? '', imageKey: line.image?.key ?? '', imageUrl: line.image?.url ?? '' }); return; }
    if (!line.itemId) return; const item = items.find((entry) => entry.id === line.itemId);
    choices[line.itemId] = { quantity: line.quantity ?? 1, description: line.description ?? '', imageId: item?.images.find((image) => image.url === line.image?.url)?.id, fallbackImageUrl: line.image?.url };
  });
  return { choices, customItems };
}
export function toggleDecorationChoice(state: DecorationSelectionState, item: Pick<DecorationItem, 'id' | 'images'>): DecorationSelectionState {
  const choices = { ...state.choices }; if (choices[item.id]) delete choices[item.id]; else choices[item.id] = { quantity: 1, description: '', imageId: item.images.find((image) => image.isCover)?.id ?? item.images[0]?.id }; return { ...state, choices };
}
export function updateDecorationChoice(state: DecorationSelectionState, itemId: string, patch: Partial<DecorationChoice>): DecorationSelectionState { return { ...state, choices: { ...state.choices, [itemId]: { ...state.choices[itemId], ...patch } } }; }
export function selectionSummary(state: DecorationSelectionState) { const configured = Object.values(state.choices); return { lineCount: configured.length + state.customItems.length, totalQuantity: configured.reduce((sum, line) => sum + line.quantity, 0) + state.customItems.reduce((sum, line) => sum + line.quantity, 0) }; }
export function validateDecorationSelection(state: DecorationSelectionState, items: Pick<DecorationItem, 'id' | 'availableQuantity'>[]) {
  const choices: Record<string, string> = {}, custom: Record<string, string[]> = {};
  for (const [id, line] of Object.entries(state.choices)) { const available = items.find((item) => item.id === id)?.availableQuantity ?? 0; if (!Number.isInteger(line.quantity) || line.quantity < 1) choices[id] = 'Quantity must be at least 1.'; else if (line.quantity > available) choices[id] = `Only ${available} available.`; }
  for (const line of state.customItems) { const errors: string[] = []; if (!line.name.trim()) errors.push('Name is required.'); if (!Number.isInteger(line.quantity) || line.quantity < 1) errors.push('Quantity must be at least 1.'); if (!line.imageKey || !line.imageUrl) errors.push('Image is required.'); if (errors.length) custom[line.clientId] = errors; }
  return { choices, custom };
}
export function buildDecorationSelectionPayload(state: DecorationSelectionState) {
  return {
    items: Object.entries(state.choices).map(([itemId, line]) => ({ itemId, quantity: line.quantity, ...(line.imageId ? { imageId: line.imageId } : {}), ...(line.description.trim() ? { description: line.description.trim() } : {}) })),
    customItems: state.customItems.map((line) => ({ name: line.name.trim(), quantity: line.quantity, ...(line.description.trim() ? { description: line.description.trim() } : {}), imageKey: line.imageKey, imageUrl: line.imageUrl })),
  };
}
