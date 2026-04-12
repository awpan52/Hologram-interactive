export interface DiamondLayout {
  viewSize: number;
  positions: { x: number; y: number }[];
  screenWidth: number;
  screenHeight: number;
}

export interface ModelState {
  url: string | null;
  format: 'glb' | 'fbx' | 'obj' | null;
  animations: string[];
  activeAnimation: string | null;
}
