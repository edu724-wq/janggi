/**
 * Janggi AI Engine with Minimax and Heuristic Evaluation
 */
import {
  Side,
  Piece,
  Position,
  Move,
  PIECE_SCORES,
  getLegalMovesForPiece,
  isKingInCheck,
  getPieceAt,
  hasAnyLegalMoves,
} from './janggi.ts';

export type AIDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'MASTER';

interface ScoredMove {
  from: Position;
  to: Position;
  piece: Piece;
  score: number;
}

/**
 * Positional value bonus for pieces
 */
function evaluatePosition(piece: Piece): number {
  let bonus = 0;
  const { type, side, x, y } = piece;

  // Center control bonus
  const distFromCenterX = Math.abs(x - 4);
  bonus += (4 - distFromCenterX) * 0.2;

  if (type === 'ZOL') {
    // Advancing pawns are more valuable
    const advancement = side === 'CHO' ? 6 - y : y - 3;
    bonus += Math.max(0, advancement) * 0.4;
  } else if (type === 'MA') {
    // Horses in center active squares
    if (x >= 2 && x <= 6 && y >= 3 && y <= 6) {
      bonus += 0.8;
    }
  } else if (type === 'CHA') {
    // Chariots have immense mobility
    bonus += 1.0;
  } else if (type === 'PO') {
    // Cannons prefer rank 2 / 7 or central ranks with bridges
    if (y === 2 || y === 7 || y === 4 || y === 5) {
      bonus += 0.5;
    }
  } else if (type === 'KING' || type === 'SA') {
    // Keep King and Guards deep in the palace
    if (side === 'CHO' && y >= 8) bonus += 0.5;
    if (side === 'HAN' && y <= 1) bonus += 0.5;
  }

  return bonus;
}

/**
 * Static Board Evaluation for Minimax
 */
function evaluateBoard(pieces: Piece[], maximizingSide: Side): number {
  let score = 0;
  const minimizingSide: Side = maximizingSide === 'CHO' ? 'HAN' : 'CHO';

  for (const p of pieces) {
    const val = PIECE_SCORES[p.type] + evaluatePosition(p);
    if (p.side === maximizingSide) {
      score += val;
    } else {
      score -= val;
    }
  }

  // Check state
  if (isKingInCheck(pieces, minimizingSide)) {
    score += 4.0;
  }
  if (isKingInCheck(pieces, maximizingSide)) {
    score -= 4.0;
  }

  return score;
}

/**
 * Get best move for the AI
 */
export function getAIMove(
  pieces: Piece[],
  aiSide: Side,
  difficulty: AIDifficulty = 'INTERMEDIATE'
): { from: Position; to: Position; piece: Piece } | null {
  const allMoves: { from: Position; to: Position; piece: Piece; score: number }[] = [];
  const myPieces = pieces.filter((p) => p.side === aiSide);

  // Collect all legal moves
  for (const piece of myPieces) {
    const legalTargets = getLegalMovesForPiece(piece, pieces);
    for (const to of legalTargets) {
      // Basic capture heuristic
      const targetPiece = getPieceAt(pieces, to.x, to.y);
      let immediateScore = 0;
      if (targetPiece) {
        immediateScore = PIECE_SCORES[targetPiece.type] * 2 - PIECE_SCORES[piece.type] * 0.2;
      }

      allMoves.push({
        from: { x: piece.x, y: piece.y },
        to,
        piece,
        score: immediateScore + (Math.random() * 0.5),
      });
    }
  }

  if (allMoves.length === 0) {
    return null; // pass or checkmate
  }

  // Beginner mode: slightly random, occasionally picks captures
  if (difficulty === 'BEGINNER') {
    // Sort with high randomness
    allMoves.sort((a, b) => b.score - a.score + (Math.random() * 6 - 3));
    return allMoves[0];
  }

  const depth = difficulty === 'MASTER' ? 2 : 1;

  let bestMove = allMoves[0];
  let bestValue = -Infinity;

  // Minimax search
  for (const move of allMoves) {
    // Apply move
    const simulated = pieces
      .filter((p) => !(p.x === move.to.x && p.y === move.to.y))
      .map((p) => (p.id === move.piece.id ? { ...p, x: move.to.x, y: move.to.y } : p));

    const val = minimax(
      simulated,
      depth - 1,
      -Infinity,
      Infinity,
      false,
      aiSide
    );

    const jitter = difficulty === 'INTERMEDIATE' ? (Math.random() * 0.4 - 0.2) : 0;
    const finalVal = val + jitter;

    if (finalVal > bestValue) {
      bestValue = finalVal;
      bestMove = move;
    }
  }

  return bestMove;
}

function minimax(
  pieces: Piece[],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  maximizingSide: Side
): number {
  const currentSide: Side = isMaximizing
    ? maximizingSide
    : maximizingSide === 'CHO'
    ? 'HAN'
    : 'CHO';

  if (depth <= 0) {
    return evaluateBoard(pieces, maximizingSide);
  }

  const currentPieces = pieces.filter((p) => p.side === currentSide);
  let movesFound = 0;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const piece of currentPieces) {
      const legal = getLegalMovesForPiece(piece, pieces);
      for (const to of legal) {
        movesFound++;
        const simulated = pieces
          .filter((p) => !(p.x === to.x && p.y === to.y))
          .map((p) => (p.id === piece.id ? { ...p, x: to.x, y: to.y } : p));

        const evalScore = minimax(simulated, depth - 1, alpha, beta, false, maximizingSide);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      if (beta <= alpha) break;
    }
    return movesFound === 0 ? -999 : maxEval;
  } else {
    let minEval = Infinity;
    for (const piece of currentPieces) {
      const legal = getLegalMovesForPiece(piece, pieces);
      for (const to of legal) {
        movesFound++;
        const simulated = pieces
          .filter((p) => !(p.x === to.x && p.y === to.y))
          .map((p) => (p.id === piece.id ? { ...p, x: to.x, y: to.y } : p));

        const evalScore = minimax(simulated, depth - 1, alpha, beta, true, maximizingSide);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      if (beta <= alpha) break;
    }
    return movesFound === 0 ? 999 : minEval;
  }
}
