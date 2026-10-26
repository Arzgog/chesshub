import { ChessBoard } from './chess-board';
import { Color, Coords, FENChar } from './models';
import { evaluateBoard } from './evaluation';

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

  // Sort captures descending by MVV-LVA score
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

export function computeBestAIMove(chessBoard: ChessBoard, searchDepth: number = 3): AIMove | null {
  const sandboxBoard = chessBoard.clone();
  const isWhiteTurn = sandboxBoard.playerColor === Color.White;

  const result = minimax(sandboxBoard, searchDepth, -Infinity, Infinity, isWhiteTurn);
  return result.bestMove || null;
}