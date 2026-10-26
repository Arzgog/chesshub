import { ChessBoard } from './chess-board';
import { Color, Coords, FENChar } from './models';

export interface AIMove {
  from: Coords;
  to: Coords;
  promotion?: FENChar;
}

interface ScoredMove {
  move: AIMove;
  score: number;
}

// Relative weights for MVV-LVA calculation
const PIECE_MVV_LVA: Record<string, number> = {
  [FENChar.WhitePawn]: 1, [FENChar.BlackPawn]: 1,
  [FENChar.WhiteKnight]: 2, [FENChar.BlackKnight]: 2,
  [FENChar.WhiteBishop]: 3, [FENChar.BlackBishop]: 3,
  [FENChar.WhiteRook]: 4, [FENChar.BlackRook]: 4,
  [FENChar.WhiteQueen]: 5, [FENChar.BlackQueen]: 5,
  [FENChar.WhiteKing]: 6, [FENChar.BlackKing]: 6,
};

function getMVVLVAScore(attackerPiece: FENChar, victimPiece: FENChar): number {
  const victimVal = PIECE_MVV_LVA[victimPiece] || 0;
  const attackerVal = PIECE_MVV_LVA[attackerPiece] || 0;
  return (victimVal * 10) - attackerVal;
}

// Material base values in centipawns
const PIECE_VALUES: Record<string, number> = {
  [FENChar.WhitePawn]: 100,
  [FENChar.WhiteKnight]: 320,
  [FENChar.WhiteBishop]: 330,
  [FENChar.WhiteRook]: 500,
  [FENChar.WhiteQueen]: 900,
  [FENChar.WhiteKing]: 20000,

  [FENChar.BlackPawn]: 100,
  [FENChar.BlackKnight]: 320,
  [FENChar.BlackBishop]: 330,
  [FENChar.BlackRook]: 500,
  [FENChar.BlackQueen]: 900,
  [FENChar.BlackKing]: 20000,
};

// --- PIECE-SQUARE TABLES ---
const PAWN_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [ 5,  5, 10, 27, 27, 10,  5,  5],
  [ 0,  0,  0, 22, 22,  0,  0,  0],
  [ 5, -5,-10,  0,  0,-10, -5,  5],
  [ 5, 10, 10,-25,-25, 10, 10,  5],
  [ 0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const ROOK_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
];

const QUEEN_TABLE = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

// UPDATED KING TABLE: Heavily penalizes center, rewards castling corners (g1/c1)
const KING_TABLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 30,  10,  0,  0, 10, 30, 20], 
  [ 20, 40,  30, 10,  0, 30, 40, 20]  
];

function getPieceSquareScore(piece: FENChar, row: number, col: number): number {
  const isWhite = piece === piece.toUpperCase();
  const r = isWhite ? row : 7 - row;

  switch (piece) {
    case FENChar.WhitePawn:
    case FENChar.BlackPawn: return PAWN_TABLE[r][col];
    case FENChar.WhiteKnight:
    case FENChar.BlackKnight: return KNIGHT_TABLE[r][col];
    case FENChar.WhiteBishop:
    case FENChar.BlackBishop: return BISHOP_TABLE[r][col];
    case FENChar.WhiteRook:
    case FENChar.BlackRook: return ROOK_TABLE[r][col];
    case FENChar.WhiteQueen:
    case FENChar.BlackQueen: return QUEEN_TABLE[r][col];
    case FENChar.WhiteKing:
    case FENChar.BlackKing: return KING_TABLE[r][col];
    default: return 0;
  }
}

export function evaluateBoard(boardView: (FENChar | null)[][]): number {
  let totalScore = 0;
  
  let whiteKingPos = null;
  let blackKingPos = null;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = boardView[r][c];
      if (!piece) continue;

      const pieceVal = PIECE_VALUES[piece] || 0;
      const positionalVal = getPieceSquareScore(piece, r, c);
      const combinedVal = pieceVal + positionalVal;

      if (piece === piece.toUpperCase()) {
        totalScore += combinedVal; // White wants positive score
        if (piece === FENChar.WhiteKing) whiteKingPos = {r, c};
      } else {
        totalScore -= combinedVal; // Black wants negative score
        if (piece === FENChar.BlackKing) blackKingPos = {r, c};
      }
    }
  }

  // EXPLICIT CASTLING & KING SAFETY BONUS
  if (whiteKingPos) {
    // Check if White King is castled (Kingside: g1 (7,6) or Queenside: c1 (7,2))
    if ((whiteKingPos.r === 7 && whiteKingPos.c === 6) || (whiteKingPos.r === 7 && whiteKingPos.c === 2)) {
      totalScore += 60; 
    }
  }
  if (blackKingPos) {
    // Check if Black King is castled (Kingside: g8 (0,6) or Queenside: c8 (0,2))
    if ((blackKingPos.r === 0 && blackKingPos.c === 6) || (blackKingPos.r === 0 && blackKingPos.c === 2)) {
      totalScore -= 60; // Negative because Black wants to lower the score
    }
  }

  return totalScore;
}

export function getAllLegalMoves(chessBoard: ChessBoard): AIMove[] {
  const scoredCaptures: ScoredMove[] = [];
  const quietMoves: AIMove[] = [];
  const safeSquares = chessBoard.safeSquares;

  safeSquares.forEach((targets, key) => {
    const [xStr, yStr] = key.split(',');
    const from: Coords = { x: parseInt(xStr, 10), y: parseInt(yStr, 10) };

    targets.forEach(to => {
      const piece = chessBoard.chessBoardView[from.x][from.y];
      const targetPiece = chessBoard.chessBoardView[to.x][to.y];
      if (!piece) return;

      const isPawn = piece === FENChar.WhitePawn || piece === FENChar.BlackPawn;
      const isPromotionRow = (piece === FENChar.WhitePawn && to.x === 7) || (piece === FENChar.BlackPawn && to.x === 0);

      let move: AIMove;
      if (isPawn && isPromotionRow) {
        const queenType = piece === FENChar.WhitePawn ? FENChar.WhiteQueen : FENChar.BlackQueen;
        move = { from, to, promotion: queenType };
      } else {
        move = { from, to };
      }

      if (targetPiece) {
        const score = getMVVLVAScore(piece, targetPiece);
        scoredCaptures.push({ move, score });
      } else {
        quietMoves.push(move);
      }
    });
  });

  scoredCaptures.sort((a, b) => b.score - a.score);
  const sortedCaptures = scoredCaptures.map(item => item.move);

  return [...sortedCaptures, ...quietMoves];
}

export function getCaptureMoves(chessBoard: ChessBoard): AIMove[] {
  const scoredCaptures: ScoredMove[] = [];
  const safeSquares = chessBoard.safeSquares;

  safeSquares.forEach((targets, key) => {
    const [xStr, yStr] = key.split(',');
    const from: Coords = { x: parseInt(xStr, 10), y: parseInt(yStr, 10) };

    targets.forEach(to => {
      const piece = chessBoard.chessBoardView[from.x][from.y];
      const targetPiece = chessBoard.chessBoardView[to.x][to.y];
      if (!piece || !targetPiece) return;

      const isPawn = piece === FENChar.WhitePawn || piece === FENChar.BlackPawn;
      const isPromotionRow = (piece === FENChar.WhitePawn && to.x === 7) || (piece === FENChar.BlackPawn && to.x === 0);

      let move: AIMove;
      if (isPawn && isPromotionRow) {
        const queenType = piece === FENChar.WhitePawn ? FENChar.WhiteQueen : FENChar.BlackQueen;
        move = { from, to, promotion: queenType };
      } else {
        move = { from, to };
      }

      const score = getMVVLVAScore(piece, targetPiece);
      scoredCaptures.push({ move, score });
    });
  });

  scoredCaptures.sort((a, b) => b.score - a.score);
  return scoredCaptures.map(item => item.move);
}

export function quiescenceSearch(
  chessBoard: ChessBoard,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  maxQDepth: number = 4
): number {
  const standPat = evaluateBoard(chessBoard.chessBoardView);

  if (maxQDepth === 0 || chessBoard.isGameOver) {
    return standPat;
  }

  if (isMaximizing) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;

    const captures = getCaptureMoves(chessBoard);
    for (const move of captures) {
      const boardCopy = chessBoard.clone();
      boardCopy.move(move.from.x, move.from.y, move.to.x, move.to.y, move.promotion || null);

      const score = quiescenceSearch(boardCopy, alpha, beta, false, maxQDepth - 1);

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;

    const captures = getCaptureMoves(chessBoard);
    for (const move of captures) {
      const boardCopy = chessBoard.clone();
      boardCopy.move(move.from.x, move.from.y, move.to.x, move.to.y, move.promotion || null);

      const score = quiescenceSearch(boardCopy, alpha, beta, true, maxQDepth - 1);

      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
    return beta;
  }
}

export function minimax(
  chessBoard: ChessBoard,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): { score: number; bestMove?: AIMove } {
  if (depth === 0 || chessBoard.isGameOver) {
    return { score: quiescenceSearch(chessBoard, alpha, beta, isMaximizing) };
  }

  const legalMoves = getAllLegalMoves(chessBoard);
  if (legalMoves.length === 0) {
    return { score: evaluateBoard(chessBoard.chessBoardView) };
  }

  let bestMove: AIMove | undefined = legalMoves[0];

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of legalMoves) {
      const boardCopy = chessBoard.clone();
      boardCopy.move(move.from.x, move.from.y, move.to.x, move.to.y, move.promotion || null);

      const evaluation = minimax(boardCopy, depth - 1, alpha, beta, false).score;

      if (evaluation > maxEval) {
        maxEval = evaluation;
        bestMove = move;
      }
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) {
        break;
      }
    }
    return { score: maxEval, bestMove };
  } else {
    let minEval = Infinity;
    for (const move of legalMoves) {
      const boardCopy = chessBoard.clone();
      boardCopy.move(move.from.x, move.from.y, move.to.x, move.to.y, move.promotion || null);

      const evaluation = minimax(boardCopy, depth - 1, alpha, beta, true).score;

      if (evaluation < minEval) {
        minEval = evaluation;
        bestMove = move;
      }
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) {
        break;
      }
    }
    return { score: minEval, bestMove };
  }
}

// MAIN FUNCTION WITH 5 STRENGTH LEVELS
export function computeBestAIMove(chessBoard: ChessBoard, strengthLevel: number = 3): AIMove | null {
  // Ensure strength level stays between 1 (easiest) and 5 (hardest/deepest search)
  const searchDepth = Math.max(1, Math.min(5, strengthLevel));
  
  const sandboxBoard = chessBoard.clone();
  const isWhiteTurn = sandboxBoard.playerColor === Color.White;

  const result = minimax(sandboxBoard, searchDepth, -Infinity, Infinity, isWhiteTurn);
  return result.bestMove || null;
}