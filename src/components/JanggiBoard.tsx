import React, { useState } from 'react';
import {
  Piece,
  Position,
  Side,
  HANJA_NAMES,
  HANGUL_NAMES,
  BOARD_COLS,
  BOARD_ROWS,
  isInPalace,
} from '../engine/janggi.ts';
import boardWoodBg from '../assets/images/janggi_board_wood_1792546907747.jpg';

interface JanggiBoardProps {
  pieces: Piece[];
  selectedPiece: Piece | null;
  legalMoves: Position[];
  lastMove: { from: Position | null; to: Position | null } | null;
  isCheck: boolean;
  checkedSide: Side | null;
  flipped?: boolean; // Han on bottom if flipped
  useHangul?: boolean;
  interactive?: boolean;
  onSelectPiece: (piece: Piece) => void;
  onMakeMove: (to: Position) => void;
}

export const JanggiBoard: React.FC<JanggiBoardProps> = ({
  pieces,
  selectedPiece,
  legalMoves,
  lastMove,
  isCheck,
  checkedSide,
  flipped = false,
  useHangul = false,
  interactive = true,
  onSelectPiece,
  onMakeMove,
}) => {
  // SVG coordinates setup
  // Board has 9 files (0-8) and 10 ranks (0-9)
  // We add margins around the lines
  const PADDING_X = 32;
  const PADDING_Y = 32;
  const CELL_WIDTH = 44;
  const CELL_HEIGHT = 44;

  const SVG_WIDTH = PADDING_X * 2 + (BOARD_COLS - 1) * CELL_WIDTH; // 32*2 + 8*44 = 416
  const SVG_HEIGHT = PADDING_Y * 2 + (BOARD_ROWS - 1) * CELL_HEIGHT; // 32*2 + 9*44 = 460

  // Coordinate mapping function
  const getCoords = (x: number, y: number) => {
    const renderX = flipped ? BOARD_COLS - 1 - x : x;
    const renderY = flipped ? BOARD_ROWS - 1 - y : y;
    return {
      cx: PADDING_X + renderX * CELL_WIDTH,
      cy: PADDING_Y + renderY * CELL_HEIGHT,
    };
  };

  const handleIntersectionClick = (x: number, y: number) => {
    if (!interactive) return;

    // Check if clicked coordinate is in legal moves
    const isMoveTarget = legalMoves.some((m) => m.x === x && m.y === y);
    if (isMoveTarget && selectedPiece) {
      onMakeMove({ x, y });
      return;
    }

    // Check if clicking a piece
    const clickedPiece = pieces.find((p) => p.x === x && p.y === y);
    if (clickedPiece) {
      onSelectPiece(clickedPiece);
    }
  };

  return (
    <div className="relative w-full max-w-[440px] mx-auto select-none aspect-[416/460] rounded-xl overflow-hidden shadow-2xl border-4 border-[#5c3a21] bg-[#dcb37e]">
      {/* Woodgrain Board Texture */}
      <img
        src={boardWoodBg}
        alt="장기판 배경"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover opacity-90 pointer-events-none"
      />
      {/* Board subtle shadow/lighting overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />

      {/* SVG Board Lines & Pieces */}
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="relative z-10 w-full h-full"
      >
        <defs>
          {/* Subtle drop shadow for pieces */}
          <filter id="piece-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2.5" stdDeviation="1.5" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <filter id="glow-gold" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.9" />
          </filter>
          <filter id="glow-check" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ef4444" floodOpacity="1" />
          </filter>
        </defs>

        {/* 1. Grid Horizontal Lines */}
        {Array.from({ length: BOARD_ROWS }).map((_, r) => {
          const pLeft = getCoords(0, r);
          const pRight = getCoords(BOARD_COLS - 1, r);
          return (
            <line
              key={`h-${r}`}
              x1={Math.min(pLeft.cx, pRight.cx)}
              y1={pLeft.cy}
              x2={Math.max(pLeft.cx, pRight.cx)}
              y2={pLeft.cy}
              stroke="#3d210b"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          );
        })}

        {/* 2. Grid Vertical Lines */}
        {Array.from({ length: BOARD_COLS }).map((_, c) => {
          const pTop = getCoords(c, 0);
          const pBottom = getCoords(c, BOARD_ROWS - 1);
          return (
            <line
              key={`v-${c}`}
              x1={pTop.cx}
              y1={Math.min(pTop.cy, pBottom.cy)}
              x2={pTop.cx}
              y2={Math.max(pTop.cy, pBottom.cy)}
              stroke="#3d210b"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          );
        })}

        {/* 3. Palace Diagonals (궁성 사선) */}
        {/* Han Palace (y=0..2, x=3..5) */}
        {(() => {
          const tl = getCoords(3, 0);
          const br = getCoords(5, 2);
          const tr = getCoords(5, 0);
          const bl = getCoords(3, 2);
          return (
            <g key="han-palace-diag">
              <line x1={tl.cx} y1={tl.cy} x2={br.cx} y2={br.cy} stroke="#3d210b" strokeWidth="1.6" />
              <line x1={tr.cx} y1={tr.cy} x2={bl.cx} y2={bl.cy} stroke="#3d210b" strokeWidth="1.6" />
            </g>
          );
        })()}

        {/* Cho Palace (y=7..9, x=3..5) */}
        {(() => {
          const tl = getCoords(3, 7);
          const br = getCoords(5, 9);
          const tr = getCoords(5, 7);
          const bl = getCoords(3, 9);
          return (
            <g key="cho-palace-diag">
              <line x1={tl.cx} y1={tl.cy} x2={br.cx} y2={br.cy} stroke="#3d210b" strokeWidth="1.6" />
              <line x1={tr.cx} y1={tr.cy} x2={bl.cx} y2={bl.cy} stroke="#3d210b" strokeWidth="1.6" />
            </g>
          );
        })()}

        {/* 4. Flower intersection marks (화점/기물 위치 표식) */}
        {[
          // Han cannons
          { x: 1, y: 2 }, { x: 7, y: 2 },
          // Han pawns
          { x: 0, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 }, { x: 6, y: 3 }, { x: 8, y: 3 },
          // Cho pawns
          { x: 0, y: 6 }, { x: 2, y: 6 }, { x: 4, y: 6 }, { x: 6, y: 6 }, { x: 8, y: 6 },
          // Cho cannons
          { x: 1, y: 7 }, { x: 7, y: 7 },
        ].map((pt, idx) => {
          const { cx, cy } = getCoords(pt.x, pt.y);
          const arm = 4;
          const gap = 2;
          return (
            <g key={`flower-${idx}`} stroke="#4a2b13" strokeWidth="1.2" opacity="0.75">
              {/* Corner markers around intersection */}
              {pt.x > 0 && (
                <>
                  <path d={`M ${cx - gap - arm} ${cy - gap} L ${cx - gap} ${cy - gap} L ${cx - gap} ${cy - gap - arm}`} fill="none" />
                  <path d={`M ${cx - gap - arm} ${cy + gap} L ${cx - gap} ${cy + gap} L ${cx - gap} ${cy + gap + arm}`} fill="none" />
                </>
              )}
              {pt.x < BOARD_COLS - 1 && (
                <>
                  <path d={`M ${cx + gap + arm} ${cy - gap} L ${cx + gap} ${cy - gap} L ${cx + gap} ${cy - gap - arm}`} fill="none" />
                  <path d={`M ${cx + gap + arm} ${cy + gap} L ${cx + gap} ${cy + gap} L ${cx + gap} ${cy + gap + arm}`} fill="none" />
                </>
              )}
            </g>
          );
        })}

        {/* 5. Last Move Trail Highlight */}
        {lastMove?.from && lastMove?.to && (
          <g key="last-move-trail">
            {(() => {
              const p1 = getCoords(lastMove.from.x, lastMove.from.y);
              const p2 = getCoords(lastMove.to.x, lastMove.to.y);
              return (
                <>
                  <line
                    x1={p1.cx}
                    y1={p1.cy}
                    x2={p2.cx}
                    y2={p2.cy}
                    stroke="#eab308"
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                    opacity="0.8"
                  />
                  <circle cx={p1.cx} cy={p1.cy} r="6" fill="#eab308" opacity="0.6" />
                  <circle cx={p2.cx} cy={p2.cy} r="18" fill="none" stroke="#eab308" strokeWidth="2.5" opacity="0.85" />
                </>
              );
            })()}
          </g>
        )}

        {/* 6. Pieces Render */}
        {pieces.map((piece) => {
          const { cx, cy } = getCoords(piece.x, piece.y);
          const isSelected = selectedPiece?.id === piece.id;
          const isCho = piece.side === 'CHO';
          const isKing = piece.type === 'KING';
          const isInCheckState = isCheck && checkedSide === piece.side && isKing;

          // Piece radii: King is largest, Zol/Sa smallest
          let r = 18;
          let fontSize = 16;
          if (isKing) {
            r = 20;
            fontSize = 18;
          } else if (piece.type === 'CHA' || piece.type === 'PO') {
            r = 18.5;
            fontSize = 16.5;
          } else if (piece.type === 'MA' || piece.type === 'SANG') {
            r = 17.5;
            fontSize = 15.5;
          } else {
            r = 16;
            fontSize = 14;
          }

          const label = useHangul
            ? HANGUL_NAMES[piece.side][piece.type]
            : HANJA_NAMES[piece.side][piece.type];

          // Colors
          // Cho: Emerald dark jade rim, deep green text
          // Han: Vermilion cinnabar rim, rich red text
          const borderColor = isCho ? '#065f46' : '#991b1b';
          const innerColor = isCho ? '#f0fdf4' : '#fff1f2';
          const textColor = isCho ? '#047857' : '#b91c1c';

          return (
            <g
              key={piece.id}
              onClick={() => handleIntersectionClick(piece.x, piece.y)}
              className="cursor-pointer transition-transform active:scale-95"
              filter={isInCheckState ? 'url(#glow-check)' : isSelected ? 'url(#glow-gold)' : 'url(#piece-shadow)'}
            >
              {/* Outer Piece Ring */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={innerColor}
                stroke={borderColor}
                strokeWidth={isKing ? '3' : '2.2'}
              />
              {/* Inner Inset Ring for authentic carved wood look */}
              <circle
                cx={cx}
                cy={cy}
                r={r - 3}
                fill="none"
                stroke={borderColor}
                strokeWidth="0.8"
                opacity="0.6"
              />

              {/* Check Alert Pulsing Ring */}
              {isInCheckState && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 5}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  className="animate-ping origin-center"
                />
              )}

              {/* Selection Ring */}
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 4}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                />
              )}

              {/* Piece Name Calligraphy */}
              <text
                x={cx}
                y={cy + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={textColor}
                fontSize={fontSize}
                fontWeight="bold"
                fontFamily={useHangul ? 'Noto Serif KR, serif' : 'Gowun Batang, serif'}
                className="select-none pointer-events-none"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* 7. Legal Move Destination Indicators */}
        {legalMoves.map((m, idx) => {
          const { cx, cy } = getCoords(m.x, m.y);
          const targetPiece = pieces.find((p) => p.x === m.x && p.y === m.y);
          return (
            <g
              key={`target-${idx}-${m.x}-${m.y}`}
              onClick={() => handleIntersectionClick(m.x, m.y)}
              className="cursor-pointer"
            >
              {targetPiece ? (
                // Capture indicator: red-tinted target ring
                <>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="20"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="3"
                    strokeDasharray="4 2"
                    className="animate-pulse"
                  />
                  <circle cx={cx} cy={cy} r="6" fill="#dc2626" opacity="0.8" />
                </>
              ) : (
                // Normal move dot
                <>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="14"
                    fill="rgba(16, 185, 129, 0.25)"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r="5.5"
                    fill="#059669"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </g>
          );
        })}

        {/* 8. Invisible hitboxes on all intersections for easy tap targeting */}
        {Array.from({ length: BOARD_ROWS }).map((_, r) =>
          Array.from({ length: BOARD_COLS }).map((_, c) => {
            const { cx, cy } = getCoords(c, r);
            return (
              <circle
                key={`hit-${c}-${r}`}
                cx={cx}
                cy={cy}
                r={CELL_WIDTH / 2}
                fill="transparent"
                onClick={() => handleIntersectionClick(c, r)}
                className="cursor-pointer"
              />
            );
          })
        )}
      </svg>
    </div>
  );
};
