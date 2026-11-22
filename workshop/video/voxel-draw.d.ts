// Types for voxel-draw.js (plain JS so the studio page can load it too).
type VoxelArtLike = {kind: 'voxel'; fps: number; size: number[]; palette: (string | null)[]; frames: number[][][]};
export const VIEWS: Record<string, number>;
export const VIEW_NAMES: Record<string, string>;
export function voxelBounds(art: VoxelArtLike, view?: string | number): {x: number; y: number; w: number; h: number};
export function drawVoxels(ctx: CanvasRenderingContext2D, art: VoxelArtLike, i: number, box: {x: number; y: number; w: number; h: number}, view?: string | number): number;
export const LOOK_MARK: {hair: string; eyes: string; skin: string; chasuble: string};
export function withLook<T extends VoxelArtLike>(art: T, look?: {hair?: string; eyes?: string; skin?: string; chasuble?: string}): T;
