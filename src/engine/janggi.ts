/**
 * Korean Janggi (한국 장기) Game Engine & Rules Validation
 * Conforms to Korean Janggi Association (대한장기협회) standards.
 */

export type Side = 'CHO' | 'HAN';

export type PieceType = 'KING' | 'CHA' | 'PO' | 'MA' | 'SANG' | 'SA' | 'ZOL';

export type FormationType = 'GWIMA' | 'WONANGMA' | 'YANGGWIMA' | 'YANGGWISANG';

export interface Piece {
  id: string;
  side: Side;
  type: PieceType;
  x: number;
  y: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Move {
  from: Position | null; // null if pass (한수쉼)
  to: Position | null;
  piece?: Piece;
  captured?: Piece;
  isPass?: boolean;
  notation?: string;
  side: Side;
}

export const PIECE_SCORES: Record<PieceType, number> = {
  KING: 0,
  CHA: 13,
  PO: 7,
  MA: 5,
  SANG: 3,
  SA: 3,
  ZOL: 2,
};

export const HANJA_NAMES: Record<Side, Record<PieceType, string>> = {
  CHO: {
    KING: '楚',
    CHA: '車',
    PO: '包',
    MA: '馬',
    SANG: '象',
    SA: '士',
    ZOL: '卒',
  },
  HAN: {
    KING: '漢',
    CHA: '車',
    PO: '包',
    MA: '馬',
    SANG: '象',
    SA: '士',
    ZOL: '兵',
  },
};

export const HANGUL_NAMES: Record<Side, Record<PieceType, string>> = {
  CHO: {
    KING: '초',
    CHA: '차',
    PO: '포',
    MA: '마',
    SANG: '상',
    SA: '사',
    ZOL: '졸',
  },
  HAN: {
    KING: '한',
    CHA: '차',
    PO: '포',
    MA: '마',
    SANG: '상',
    SA: '사',
    ZOL: '병',
  },
};

export const FORMATION_INFO: Record<
  FormationType,
  { name: string; desc: string; arrangement: [PieceType, PieceType, PieceType, PieceType] }
> = {
  GWIMA: {
    name: '귀마 (마-상-상-마)',
    desc: '가장 대중적이고 공수 균형이 뛰어난 포진',
    arrangement: ['MA', 'SANG', 'SANG', 'MA'],
  },
  WONANGMA: {
    name: '원앙마 (상-마-마-상)',
    desc: '중앙 마를 연결하여 탄탄한 방어를 구사하는 포진',
    arrangement: ['SANG', 'MA', 'MA', 'SANG'],
  },
  YANGGWIMA: {
    name: '양귀마 (마-상-마-상)',
    desc: '양쪽 귀에 마를 배치하여 중앙 압박에 강한 포진',
    arrangement: ['MA', 'SANG', 'MA', 'SANG'],
  },
  YANGGWISANG: {
    name: '양귀상 (상-마-상-마)',
    desc: '양 귀에 상을 두어 기습적인 장거리 공격을 노리는 포진',
    arrangement: ['SANG', 'MA', 'SANG', 'MA'],
  },
};

export const BOARD_COLS = 9;
export const BOARD_ROWS = 10;

/**
 * Check if a coordinate is inside the palace (궁성)
 */
export function isInPalace(x: number, y: number, side?: Side): boolean {
  if (x < 3 || x > 5) return false;
  if (side === 'HAN') return y >= 0 && y <= 2;
  if (side === 'CHO') return y >= 7 && y <= 9;
  return (y >= 0 && y <= 2) || (y >= 7 && y <= 9);
}

/**
 * Returns palace center coordinates
 */
export function getPalaceCenter(y: number): Position {
  return y <= 2 ? { x: 4, y: 1 } : { x: 4, y: 8 };
}

/**
 * Palace diagonal check
 */
export function isPalaceDiagonalSegment(p1: Position, p2: Position): boolean {
  const isHan = p1.y <= 2 && p2.y <= 2;
  const isCho = p1.y >= 7 && p2.y >= 7;
  if (!isHan && !isCho) return false;

  const center = isHan ? { x: 4, y: 1 } : { x: 4, y: 8 };

  // Center to corner
  if (
    (p1.x === center.x && p1.y === center.y) ||
    (p2.x === center.x && p2.y === center.y)
  ) {
    const corner = (p1.x === center.x && p1.y === center.y) ? p2 : p1;
    return (corner.x === 3 || corner.x === 5) &&
      (corner.y === center.y - 1 || corner.y === center.y + 1);
  }

  // Corner across center to opposite corner
  if (
    ((p1.x === 3 && p1.y === center.y - 1 && p2.x === 5 && p2.y === center.y + 1) ||
     (p1.x === 5 && p1.y === center.y + 1 && p2.x === 3 && p2.y === center.y - 1) ||
     (p1.x === 5 && p1.y === center.y - 1 && p2.x === 3 && p2.y === center.y + 1) ||
     (p1.x === 3 && p1.y === center.y + 1 && p2.x === 5 && p2.y === center.y - 1))
  ) {
    return true;
  }

  return false;
}

/**
 * Create initial board setup based on selected formations
 */
export function createInitialBoard(
  choFormation: FormationType = 'GWIMA',
  hanFormation: FormationType = 'GWIMA'
): Piece[] {
  const pieces: Piece[] = [];
  let idCounter = 1;

  const hanPieces = FORMATION_INFO[hanFormation].arrangement;
  const choPieces = FORMATION_INFO[choFormation].arrangement;

  // --- HAN SETUP (Top, y=0..3) ---
  // Row 0
  pieces.push({ id: `han_cha_l`, side: 'HAN', type: 'CHA', x: 0, y: 0 });
  pieces.push({ id: `han_slot1`, side: 'HAN', type: hanPieces[0], x: 1, y: 0 });
  pieces.push({ id: `han_slot2`, side: 'HAN', type: hanPieces[1], x: 2, y: 0 });
  pieces.push({ id: `han_sa_l`, side: 'HAN', type: 'SA', x: 3, y: 0 });
  pieces.push({ id: `han_sa_r`, side: 'HAN', type: 'SA', x: 5, y: 0 });
  pieces.push({ id: `han_slot3`, side: 'HAN', type: hanPieces[2], x: 6, y: 0 });
  pieces.push({ id: `han_slot4`, side: 'HAN', type: hanPieces[3], x: 7, y: 0 });
  pieces.push({ id: `han_cha_r`, side: 'HAN', type: 'CHA', x: 8, y: 0 });

  // Row 1: Han King
  pieces.push({ id: `han_king`, side: 'HAN', type: 'KING', x: 4, y: 1 });

  // Row 2: Han Cannons (포)
  pieces.push({ id: `han_po_l`, side: 'HAN', type: 'PO', x: 1, y: 2 });
  pieces.push({ id: `han_po_r`, side: 'HAN', type: 'PO', x: 7, y: 2 });

  // Row 3: Han Soldiers (병)
  [0, 2, 4, 6, 8].forEach((x, idx) => {
    pieces.push({ id: `han_byeong_${idx}`, side: 'HAN', type: 'ZOL', x, y: 3 });
  });

  // --- CHO SETUP (Bottom, y=6..9) ---
  // Row 6: Cho Soldiers (졸)
  [0, 2, 4, 6, 8].forEach((x, idx) => {
    pieces.push({ id: `cho_zol_${idx}`, side: 'CHO', type: 'ZOL', x, y: 6 });
  });

  // Row 7: Cho Cannons (포)
  pieces.push({ id: `cho_po_l`, side: 'CHO', type: 'PO', x: 1, y: 7 });
  pieces.push({ id: `cho_po_r`, side: 'CHO', type: 'PO', x: 7, y: 7 });

  // Row 8: Cho King
  pieces.push({ id: `cho_king`, side: 'CHO', type: 'KING', x: 4, y: 8 });

  // Row 9
  pieces.push({ id: `cho_cha_l`, side: 'CHO', type: 'CHA', x: 0, y: 9 });
  pieces.push({ id: `cho_slot1`, side: 'CHO', type: choPieces[0], x: 1, y: 9 });
  pieces.push({ id: `cho_slot2`, side: 'CHO', type: choPieces[1], x: 2, y: 9 });
  pieces.push({ id: `cho_sa_l`, side: 'CHO', type: 'SA', x: 3, y: 9 });
  pieces.push({ id: `cho_sa_r`, side: 'CHO', type: 'SA', x: 5, y: 9 });
  pieces.push({ id: `cho_slot3`, side: 'CHO', type: choPieces[2], x: 6, y: 9 });
  pieces.push({ id: `cho_slot4`, side: 'CHO', type: choPieces[3], x: 7, y: 9 });
  pieces.push({ id: `cho_cha_r`, side: 'CHO', type: 'CHA', x: 8, y: 9 });

  return pieces;
}

/**
 * Get piece at coordinate
 */
export function getPieceAt(pieces: Piece[], x: number, y: number): Piece | undefined {
  return pieces.find((p) => p.x === x && p.y === y);
}

/**
 * Calculate total points for a side (includes 1.5 handicap for Han)
 */
export function calculateMaterialScore(pieces: Piece[]): { cho: number; han: number } {
  let cho = 0;
  let han = 1.5; // Han starts with +1.5 tiebreak

  for (const p of pieces) {
    const val = PIECE_SCORES[p.type];
    if (p.side === 'CHO') {
      cho += val;
    } else {
      han += val;
    }
  }

  return { cho, han };
}

/**
 * Generate all raw pseudo-legal moves for a specific piece
 */
export function getRawMovesForPiece(piece: Piece, pieces: Piece[]): Position[] {
  const moves: Position[] = [];
  const { x, y, side, type } = piece;

  const isEnemyOrEmpty = (tx: number, ty: number): boolean => {
    if (tx < 0 || tx >= BOARD_COLS || ty < 0 || ty >= BOARD_ROWS) return false;
    const target = getPieceAt(pieces, tx, ty);
    return !target || target.side !== side;
  };

  const isEmpty = (tx: number, ty: number): boolean => {
    if (tx < 0 || tx >= BOARD_COLS || ty < 0 || ty >= BOARD_ROWS) return false;
    return !getPieceAt(pieces, tx, ty);
  };

  switch (type) {
    case 'KING':
    case 'SA': {
      // Must stay in own palace
      const isHanPalace = side === 'HAN' && isInPalace(x, y, 'HAN');
      const isChoPalace = side === 'CHO' && isInPalace(x, y, 'CHO');
      if (!isHanPalace && !isChoPalace) return moves;

      // 4 orthogonal moves within palace
      const deltas = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];

      for (const d of deltas) {
        const nx = x + d.dx;
        const ny = y + d.dy;
        if (isInPalace(nx, ny, side) && isEnemyOrEmpty(nx, ny)) {
          moves.push({ x: nx, y: ny });
        }
      }

      // Diagonal palace moves
      const center = side === 'HAN' ? { x: 4, y: 1 } : { x: 4, y: 8 };
      if (x === center.x && y === center.y) {
        // From center to any of the 4 corners
        const corners = [
          { x: 3, y: center.y - 1 },
          { x: 5, y: center.y - 1 },
          { x: 3, y: center.y + 1 },
          { x: 5, y: center.y + 1 },
        ];
        for (const c of corners) {
          if (isEnemyOrEmpty(c.x, c.y)) moves.push(c);
        }
      } else if (
        (x === 3 || x === 5) &&
        (y === center.y - 1 || y === center.y + 1)
      ) {
        // From corner to center
        if (isEnemyOrEmpty(center.x, center.y)) {
          moves.push({ x: center.x, y: center.y });
        }
      }
      break;
    }

    case 'ZOL': {
      // Cho Zol: forward (y-1) or lateral (x±1)
      // Han Byeong: forward (y+1) or lateral (x±1)
      const forwardY = side === 'CHO' ? y - 1 : y + 1;

      // Forward step
      if (isEnemyOrEmpty(x, forwardY)) {
        moves.push({ x, y: forwardY });
      }

      // Lateral steps
      if (isEnemyOrEmpty(x - 1, y)) moves.push({ x: x - 1, y });
      if (isEnemyOrEmpty(x + 1, y)) moves.push({ x: x + 1, y });

      // Inside opponent palace diagonal forward moves
      const oppPalaceSide = side === 'CHO' ? 'HAN' : 'CHO';
      if (isInPalace(x, y, oppPalaceSide)) {
        const center = side === 'CHO' ? { x: 4, y: 1 } : { x: 4, y: 8 };
        if (side === 'CHO') {
          // Entering Han palace at (3,2) or (5,2) -> can go forward diag to (4,1)
          if ((x === 3 && y === 2) || (x === 5 && y === 2)) {
            if (isEnemyOrEmpty(4, 1)) moves.push({ x: 4, y: 1 });
          } else if (x === 4 && y === 1) {
            // From center forward diag to (3,0) or (5,0)
            if (isEnemyOrEmpty(3, 0)) moves.push({ x: 3, y: 0 });
            if (isEnemyOrEmpty(5, 0)) moves.push({ x: 5, y: 0 });
          }
        } else {
          // Han Byeong moving into Cho palace (3,7) or (5,7) -> forward diag to (4,8)
          if ((x === 3 && y === 7) || (x === 5 && y === 7)) {
            if (isEnemyOrEmpty(4, 8)) moves.push({ x: 4, y: 8 });
          } else if (x === 4 && y === 8) {
            // From center forward diag to (3,9) or (5,9)
            if (isEnemyOrEmpty(3, 9)) moves.push({ x: 3, y: 9 });
            if (isEnemyOrEmpty(5, 9)) moves.push({ x: 5, y: 9 });
          }
        }
      }
      break;
    }

    case 'CHA': {
      // Orthogonal rays
      const directions = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];

      for (const d of directions) {
        let step = 1;
        while (true) {
          const nx = x + d.dx * step;
          const ny = y + d.dy * step;
          if (nx < 0 || nx >= BOARD_COLS || ny < 0 || ny >= BOARD_ROWS) break;

          const target = getPieceAt(pieces, nx, ny);
          if (!target) {
            moves.push({ x: nx, y: ny });
          } else {
            if (target.side !== side) {
              moves.push({ x: nx, y: ny });
            }
            break; // blocked
          }
          step++;
        }
      }

      // Diagonal slide in either palace
      for (const pSide of ['HAN', 'CHO'] as Side[]) {
        if (isInPalace(x, y, pSide)) {
          const center = pSide === 'HAN' ? { x: 4, y: 1 } : { x: 4, y: 8 };

          if (x === center.x && y === center.y) {
            // From center can go 1 step to any of the 4 corners
            const corners = [
              { x: 3, y: center.y - 1 },
              { x: 5, y: center.y - 1 },
              { x: 3, y: center.y + 1 },
              { x: 5, y: center.y + 1 },
            ];
            for (const c of corners) {
              if (isEnemyOrEmpty(c.x, c.y)) moves.push(c);
            }
          } else {
            // If on a corner, can move to center; and if center is empty, across to opposite corner!
            const oppX = x === 3 ? 5 : x === 5 ? 3 : -1;
            const oppY =
              y === center.y - 1
                ? center.y + 1
                : y === center.y + 1
                ? center.y - 1
                : -1;

            if (oppX !== -1 && oppY !== -1) {
              // Corner to center
              const centerPiece = getPieceAt(pieces, center.x, center.y);
              if (!centerPiece) {
                moves.push({ x: center.x, y: center.y });
                // Across center to opposite corner
                if (isEnemyOrEmpty(oppX, oppY)) {
                  moves.push({ x: oppX, y: oppY });
                }
              } else if (centerPiece.side !== side) {
                moves.push({ x: center.x, y: center.y });
              }
            }
          }
        }
      }
      break;
    }

    case 'PO': {
      // Orthogonal jump
      const directions = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];

      for (const d of directions) {
        let step = 1;
        let bridgeFound = false;

        while (true) {
          const nx = x + d.dx * step;
          const ny = y + d.dy * step;
          if (nx < 0 || nx >= BOARD_COLS || ny < 0 || ny >= BOARD_ROWS) break;

          const target = getPieceAt(pieces, nx, ny);

          if (!bridgeFound) {
            if (target) {
              // Cannon CANNOT use another cannon as a bridge!
              if (target.type === 'PO') break;
              bridgeFound = true;
            }
          } else {
            // Already jumped bridge!
            if (!target) {
              moves.push({ x: nx, y: ny });
            } else {
              // Cannon CANNOT capture another cannon!
              if (target.side !== side && target.type !== 'PO') {
                moves.push({ x: nx, y: ny });
              }
              break; // blocked by second piece
            }
          }
          step++;
        }
      }

      // Diagonal jump in either palace
      for (const pSide of ['HAN', 'CHO'] as Side[]) {
        if (isInPalace(x, y, pSide)) {
          const center = pSide === 'HAN' ? { x: 4, y: 1 } : { x: 4, y: 8 };

          // A cannon can jump across the palace diagonally ONLY from corner to opposite corner!
          // (It needs a piece in the center to jump over)
          const oppX = x === 3 ? 5 : x === 5 ? 3 : -1;
          const oppY =
            y === center.y - 1
              ? center.y + 1
              : y === center.y + 1
              ? center.y - 1
              : -1;

          if (oppX !== -1 && oppY !== -1) {
            const centerPiece = getPieceAt(pieces, center.x, center.y);
            // Center piece must exist and must NOT be a Po!
            if (centerPiece && centerPiece.type !== 'PO') {
              const oppPiece = getPieceAt(pieces, oppX, oppY);
              if (!oppPiece) {
                moves.push({ x: oppX, y: oppY });
              } else if (oppPiece.side !== side && oppPiece.type !== 'PO') {
                moves.push({ x: oppX, y: oppY });
              }
            }
          }
        }
      }
      break;
    }

    case 'MA': {
      // 8 directions: 1 step orthogonal (blockable), then 1 step diagonal
      const maMoves = [
        // Moving up: (x±1, y-2), check (x, y-1)
        { check: { x, y: y - 1 }, target: { x: x - 1, y: y - 2 } },
        { check: { x, y: y - 1 }, target: { x: x + 1, y: y - 2 } },
        // Moving down: (x±1, y+2), check (x, y+1)
        { check: { x, y: y + 1 }, target: { x: x - 1, y: y + 2 } },
        { check: { x, y: y + 1 }, target: { x: x + 1, y: y + 2 } },
        // Moving left: (x-2, y±1), check (x-1, y)
        { check: { x: x - 1, y }, target: { x: x - 2, y: y - 1 } },
        { check: { x: x - 1, y }, target: { x: x - 2, y: y + 1 } },
        // Moving right: (x+2, y±1), check (x+1, y)
        { check: { x: x + 1, y }, target: { x: x + 2, y: y - 1 } },
        { check: { x: x + 1, y }, target: { x: x + 2, y: y + 1 } },
      ];

      for (const m of maMoves) {
        if (isEmpty(m.check.x, m.check.y) && isEnemyOrEmpty(m.target.x, m.target.y)) {
          moves.push(m.target);
        }
      }
      break;
    }

    case 'SANG': {
      // Elephant: 1 step orthogonal + 2 steps diagonal (both intermediate squares must be empty)
      const sangMoves = [
        // Up-Left: (x-2, y-3), checks: (x, y-1) and (x-1, y-2)
        { c1: { x, y: y - 1 }, c2: { x: x - 1, y: y - 2 }, target: { x: x - 2, y: y - 3 } },
        // Up-Right: (x+2, y-3), checks: (x, y-1) and (x+1, y-2)
        { c1: { x, y: y - 1 }, c2: { x: x + 1, y: y - 2 }, target: { x: x + 2, y: y - 3 } },
        // Down-Left: (x-2, y+3), checks: (x, y+1) and (x-1, y+2)
        { c1: { x, y: y + 1 }, c2: { x: x - 1, y: y + 2 }, target: { x: x - 2, y: y + 3 } },
        // Down-Right: (x+2, y+3), checks: (x, y+1) and (x+1, y+2)
        { c1: { x, y: y + 1 }, c2: { x: x + 1, y: y + 2 }, target: { x: x + 2, y: y + 3 } },
        // Left-Up: (x-3, y-2), checks: (x-1, y) and (x-2, y-1)
        { c1: { x: x - 1, y }, c2: { x: x - 2, y: y - 1 }, target: { x: x - 3, y: y - 2 } },
        // Left-Down: (x-3, y+2), checks: (x-1, y) and (x-2, y+1)
        { c1: { x: x - 1, y }, c2: { x: x - 2, y: y + 1 }, target: { x: x - 3, y: y + 2 } },
        // Right-Up: (x+3, y-2), checks: (x+1, y) and (x+2, y-1)
        { c1: { x: x + 1, y }, c2: { x: x + 2, y: y - 1 }, target: { x: x + 3, y: y - 2 } },
        // Right-Down: (x+3, y+2), checks: (x+1, y) and (x+2, y+1)
        { c1: { x: x + 1, y }, c2: { x: x + 2, y: y + 1 }, target: { x: x + 3, y: y + 2 } },
      ];

      for (const sm of sangMoves) {
        if (
          isEmpty(sm.c1.x, sm.c1.y) &&
          isEmpty(sm.c2.x, sm.c2.y) &&
          isEnemyOrEmpty(sm.target.x, sm.target.y)
        ) {
          moves.push(sm.target);
        }
      }
      break;
    }
  }

  return moves;
}

/**
 * Check if a King is currently in check (장군)
 */
export function isKingInCheck(pieces: Piece[], side: Side): boolean {
  const king = pieces.find((p) => p.side === side && p.type === 'KING');
  if (!king) return false;

  const enemySide: Side = side === 'CHO' ? 'HAN' : 'CHO';
  const enemyPieces = pieces.filter((p) => p.side === enemySide);

  for (const ep of enemyPieces) {
    const rawMoves = getRawMovesForPiece(ep, pieces);
    if (rawMoves.some((m) => m.x === king.x && m.y === king.y)) {
      return true;
    }
  }

  return false;
}

/**
 * Filter raw moves to only those that do not leave own King in check
 */
export function getLegalMovesForPiece(piece: Piece, pieces: Piece[]): Position[] {
  const rawMoves = getRawMovesForPiece(piece, pieces);
  const legalMoves: Position[] = [];

  for (const to of rawMoves) {
    // Simulate move
    const simulated = pieces
      .filter((p) => !(p.x === to.x && p.y === to.y)) // remove captured
      .map((p) => (p.id === piece.id ? { ...p, x: to.x, y: to.y } : p));

    if (!isKingInCheck(simulated, piece.side)) {
      legalMoves.push(to);
    }
  }

  return legalMoves;
}

/**
 * Check if the given side has ANY legal move available
 */
export function hasAnyLegalMoves(pieces: Piece[], side: Side): boolean {
  const myPieces = pieces.filter((p) => p.side === side);
  for (const p of myPieces) {
    const legalMoves = getLegalMovesForPiece(p, pieces);
    if (legalMoves.length > 0) return true;
  }
  return false;
}

/**
 * Check if facing King (빅장 - King facing King on the same column with no pieces in between)
 */
export function isBikjang(pieces: Piece[]): boolean {
  const choKing = pieces.find((p) => p.side === 'CHO' && p.type === 'KING');
  const hanKing = pieces.find((p) => p.side === 'HAN' && p.type === 'KING');
  if (!choKing || !hanKing) return false;

  if (choKing.x !== hanKing.x) return false;

  const col = choKing.x;
  const minY = Math.min(choKing.y, hanKing.y);
  const maxY = Math.max(choKing.y, hanKing.y);

  for (let y = minY + 1; y < maxY; y++) {
    if (getPieceAt(pieces, col, y)) {
      return false; // piece exists in between
    }
  }

  return true;
}

/**
 * Create traditional notation for a move (e.g. "82포" or "한수쉼")
 */
export function formatJanggiNotation(
  move: { from: Position | null; to: Position | null; isPass?: boolean; piece?: Piece },
  hangul: boolean = false
): string {
  if (move.isPass || !move.from || !move.to || !move.piece) {
    return '한수쉼';
  }

  const pieceName = hangul
    ? HANGUL_NAMES[move.piece.side][move.piece.type]
    : HANJA_NAMES[move.piece.side][move.piece.type];

  // Korean notation traditionally uses column (1-9) and row (1-10) or from-to
  const fromCol = move.from.x + 1;
  const fromRow = move.from.y + 1;
  const toCol = move.to.x + 1;
  const toRow = move.to.y + 1;

  return `${pieceName} (${fromCol},${fromRow}) → (${toCol},${toRow})`;
}
