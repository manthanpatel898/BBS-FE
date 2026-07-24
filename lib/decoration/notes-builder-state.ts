import type {
  DecorationItem,
  DecorationSelectionDraft,
  DecorationSnapshotLine,
} from '@/lib/auth/types';

export type DecorationNoteBlock = {
  clientId: string;
  position: number;
  kind: 'CATALOG' | 'CUSTOM';
  itemId?: string;
  categoryId?: string;
  imageId?: string;
  title: string;
  quantity: number;
  description: string;
  image: { key: string; url: string };
};

export type DecorationNotesState = {
  revision: number;
  blocks: DecorationNoteBlock[];
  generalNotes: string;
  finalPackagePrice: string;
};

const reindex = (blocks: DecorationNoteBlock[]) =>
  blocks.map((block, position) => ({ ...block, position }));

export function hydrateDecorationNotes(
  snapshot: Partial<DecorationSnapshotLine>[],
  draft: DecorationSelectionDraft | null,
): DecorationNotesState {
  if (draft) {
    return {
      revision: draft.revision,
      blocks: reindex(
        [...draft.blocks]
          .sort((left, right) => left.position - right.position)
          .map((block) => ({
            ...block,
            description: block.description ?? '',
            image: { ...block.image },
          })),
      ),
      generalNotes: draft.generalNotes ?? '',
      finalPackagePrice: draft.finalPackagePrice,
    };
  }
  return {
    revision: 0,
    blocks: snapshot.map((line, position) => ({
      clientId: `snapshot-${position}`,
      position,
      kind: line.itemId ? 'CATALOG' : 'CUSTOM',
      ...(line.itemId ? { itemId: line.itemId } : {}),
      ...(line.categoryId ? { categoryId: line.categoryId } : {}),
      title: line.itemName ?? '',
      quantity: line.quantity ?? 1,
      description: line.description ?? '',
      image: {
        key: line.image?.key ?? '',
        url: line.image?.url ?? '',
      },
    })),
    generalNotes: '',
    finalPackagePrice: '',
  };
}

export function addCustomNoteBlock(
  state: DecorationNotesState,
  image: { key: string; url: string },
  clientId = crypto.randomUUID(),
) {
  return {
    ...state,
    blocks: [
      ...state.blocks,
      {
        clientId,
        position: state.blocks.length,
        kind: 'CUSTOM' as const,
        title: '',
        quantity: 1,
        description: '',
        image: { ...image },
      },
    ],
  };
}

export function updateDecorationNoteBlock(
  state: DecorationNotesState,
  clientId: string,
  patch: Partial<Omit<DecorationNoteBlock, 'clientId' | 'position'>>,
) {
  return {
    ...state,
    blocks: state.blocks.map((block) =>
      block.clientId === clientId ? { ...block, ...patch } : block,
    ),
  };
}

export function removeDecorationNoteBlock(
  state: DecorationNotesState,
  clientId: string,
) {
  return {
    ...state,
    blocks: reindex(
      state.blocks.filter((block) => block.clientId !== clientId),
    ),
  };
}

export function moveDecorationNoteBlock(
  state: DecorationNotesState,
  clientId: string,
  direction: -1 | 1,
) {
  const from = state.blocks.findIndex((block) => block.clientId === clientId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= state.blocks.length) return state;
  const blocks = [...state.blocks];
  [blocks[from], blocks[to]] = [blocks[to], blocks[from]];
  return { ...state, blocks: reindex(blocks) };
}

export function linkCatalogItem(
  state: DecorationNotesState,
  clientId: string,
  item: Pick<DecorationItem, 'id' | 'categoryId' | 'name' | 'images'> | null,
) {
  return {
    ...state,
    blocks: state.blocks.map((block) => {
      if (block.clientId !== clientId) return block;
      if (!item) {
        const { itemId: _itemId, categoryId: _categoryId, imageId: _imageId, ...rest } = block;
        return { ...rest, kind: 'CUSTOM' as const };
      }
      const selected =
        item.images.find((image) => image.isCover) ?? item.images[0];
      return {
        ...block,
        kind: 'CATALOG' as const,
        itemId: item.id,
        categoryId: item.categoryId,
        ...(selected?.id ? { imageId: selected.id } : {}),
        image: selected
          ? { key: selected.key ?? '', url: selected.url }
          : block.image,
      };
    }),
  };
}

export function validateDecorationNotesForFinalSave(
  state: DecorationNotesState,
) {
  const blocks: Record<string, string[]> = {};
  for (const block of state.blocks) {
    const errors: string[] = [];
    if (!block.title.trim()) errors.push('Title is required.');
    if (!Number.isInteger(block.quantity) || block.quantity < 1) {
      errors.push('Quantity must be at least 1.');
    }
    if (!block.image.key || !block.image.url) errors.push('Image is required.');
    if (block.kind === 'CATALOG' && !block.itemId) {
      errors.push('Catalog item is required.');
    }
    if (errors.length) blocks[block.clientId] = errors;
  }
  return {
    blocks,
    generalNotes:
      state.generalNotes.trim().length > 5000
        ? 'General Notes cannot exceed 5000 characters.'
        : null,
  };
}

export function buildDecorationDraftPayload(state: DecorationNotesState) {
  return {
    revision: state.revision + 1,
    blocks: reindex(state.blocks).map(({ imageId: _imageId, ...block }) => block),
    generalNotes: state.generalNotes.trim() || null,
    finalPackagePrice: state.finalPackagePrice.trim(),
  };
}

export function buildDecorationFinalPayload(state: DecorationNotesState) {
  return {
    items: state.blocks
      .filter((block) => block.kind === 'CATALOG')
      .map((block) => ({
        itemId: block.itemId!,
        quantity: block.quantity,
        position: block.position,
        ...(block.imageId ? { imageId: block.imageId } : {}),
        ...(block.description.trim()
          ? { description: block.description.trim() }
          : {}),
      })),
    customItems: state.blocks
      .filter((block) => block.kind === 'CUSTOM')
      .map((block) => ({
        name: block.title.trim(),
        quantity: block.quantity,
        position: block.position,
        ...(block.description.trim()
          ? { description: block.description.trim() }
          : {}),
        imageKey: block.image.key,
        imageUrl: block.image.url,
      })),
    generalNotes: state.generalNotes.trim() || undefined,
    finalPackagePrice: Number(state.finalPackagePrice || 0),
  };
}
