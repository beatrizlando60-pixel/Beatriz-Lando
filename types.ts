export interface Point {
  x: number;
  y: number;
}

export interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  CROP = 'CROP',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  SUIT_EDITOR = 'SUIT_EDITOR',
}

export interface CropState {
  zoom: number;
  offset: Point;
}

export interface Suit {
  id: string;
  name: string;
  src: string;
}

export interface SuitState {
  selectedSuitId: string | null;
  scale: number;
  x: number;
  y: number;
}