import { Color, Coords, FENChar } from '../models';
import { Piece } from './piece';

export class King extends Piece {
  protected _FENChar: FENChar;
  protected _directions: Coords[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 }
  ];

  constructor(color: Color) {
    super(color);
    this._FENChar = color === Color.White ? FENChar.WhiteKing : FENChar.BlackKing;
  }
}