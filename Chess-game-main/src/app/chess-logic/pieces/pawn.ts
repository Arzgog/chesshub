import { Color, Coords, FENChar } from '../models';
import { Piece } from './piece';

export class Pawn extends Piece {
  protected _FENChar: FENChar;

  constructor(color: Color, hasMoved: boolean = false) {
    super(color);
    this._FENChar = color === Color.White ? FENChar.WhitePawn : FENChar.BlackPawn;
    this.hasMoved = hasMoved;
  }

  public override get _directions(): Coords[] {
    const forwardDirection = this.color === Color.White ? 1 : -1;
    
    // Base directions: 1 step forward, and diagonal captures
    const directions: Coords[] = [
      { x: forwardDirection, y: 0 },
      { x: forwardDirection, y: 1 },
      { x: forwardDirection, y: -1 }
    ];

    // Allow 2-step move only if the pawn hasn't moved yet
    if (!this.hasMoved) {
      directions.push({ x: forwardDirection * 2, y: 0 });
    }

    return directions;
  }
}