import React, { useState } from 'react';
import {
  Piece,
  Position,
  Side,
  FormationType,
  createInitialBoard,
  getLegalMovesForPiece,
  getPieceAt,
  isKingInCheck,
  hasAnyLegalMoves,
  formatJanggiNotation,
  calculateMaterialScore,
} from '../engine/janggi.ts';
import { JanggiBoard } from './JanggiBoard.tsx';
import { PlayerCard } from './PlayerCard.tsx';
import { soundManager } from '../utils/sound.ts';
import { RotateCw, SkipForward, Flag, RefreshCw, Play } from 'lucide-react';

interface PassAndPlayViewProps {
  useHangul: boolean;
  onOpenRules: () => void;
}

export const PassAndPlayView: React.FC<PassAndPlayViewProps> = ({ useHangul }) => {
  const [gameState, setGameState] = useState<'SETUP' | 'PLAYING' | 'ENDED'>('SETUP');
  const [choFormation, setChoFormation] = useState<FormationType>('GWIMA');
  const [hanFormation, setHanFormation] = useState<FormationType>('GWIMA');
  const [autoRotate, setAutoRotate] = useState(false);

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [turn, setTurn] = useState<Side>('CHO');
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Position | null; to: Position | null } | null>(null);
  const [capturedCho, setCapturedCho] = useState<Piece[]>([]);
  const [capturedHan, setCapturedHan] = useState<Piece[]>([]);
  const [winner, setWinner] = useState<Side | 'DRAW' | null>(null);
  const [winReason, setWinReason] = useState<string | null>(null);

  const startGame = () => {
    setPieces(createInitialBoard(choFormation, hanFormation));
    setTurn('CHO');
    setSelectedPiece(null);
    setLegalMoves([]);
    setLastMove(null);
    setCapturedCho([]);
    setCapturedHan([]);
    setWinner(null);
    setWinReason(null);
    setGameState('PLAYING');
  };

  const handleSelectPiece = (piece: Piece) => {
    if (gameState !== 'PLAYING') return;

    if (piece.side !== turn) {
      const isTarget = legalMoves.some((m) => m.x === piece.x && m.y === piece.y);
      if (isTarget && selectedPiece) {
        handleMakeMove({ x: piece.x, y: piece.y });
      }
      return;
    }

    setSelectedPiece(piece);
    setLegalMoves(getLegalMovesForPiece(piece, pieces));
  };

  const handleMakeMove = (to: Position) => {
    if (!selectedPiece || gameState !== 'PLAYING') return;

    const captured = getPieceAt(pieces, to.x, to.y);
    if (captured) {
      if (captured.side === 'CHO') setCapturedCho((prev) => [...prev, captured]);
      else setCapturedHan((prev) => [...prev, captured]);
      soundManager.playCapture();
    } else {
      soundManager.playPlacePiece();
    }

    const nextPieces = pieces
      .filter((p) => !(p.x === to.x && p.y === to.y))
      .map((p) => (p.id === selectedPiece.id ? { ...p, x: to.x, y: to.y } : p));

    setPieces(nextPieces);
    setLastMove({ from: { x: selectedPiece.x, y: selectedPiece.y }, to });
    setSelectedPiece(null);
    setLegalMoves([]);

    const nextTurn: Side = turn === 'CHO' ? 'HAN' : 'CHO';

    // Check next king
    if (isKingInCheck(nextPieces, nextTurn)) {
      if (!hasAnyLegalMoves(nextPieces, nextTurn)) {
        setWinner(turn);
        setWinReason('외통승 (Checkmate)');
        setGameState('ENDED');
        soundManager.playVictory();
      } else {
        soundManager.playCheck();
      }
    }

    setTurn(nextTurn);
  };

  const handlePass = () => {
    if (gameState !== 'PLAYING') return;
    soundManager.playPass();
    setSelectedPiece(null);
    setLegalMoves([]);
    setTurn(turn === 'CHO' ? 'HAN' : 'CHO');
  };

  const handleResign = () => {
    if (gameState !== 'PLAYING') return;
    setWinner(turn === 'CHO' ? 'HAN' : 'CHO');
    setWinReason('기권승 (Resignation)');
    setGameState('ENDED');
    soundManager.playVictory();
  };

  const scores = calculateMaterialScore(pieces);
  const isCheckNow = isKingInCheck(pieces, turn);

  if (gameState === 'SETUP') {
    return (
      <div className="max-w-md mx-auto w-full p-4 flex flex-col gap-4 text-stone-100 pb-20">
        <div className="text-center pt-2">
          <h2 className="text-2xl font-bold font-serif text-amber-200">한 폰으로 둘이서 (2인 대국)</h2>
          <p className="text-xs text-stone-400 mt-1">
            하나의 기기를 마주 보고 둘이서 대국할 수 있습니다.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-emerald-400">초(楚) 선공 포진</label>
            <select
              value={choFormation}
              onChange={(e) => setChoFormation(e.target.value as FormationType)}
              className="w-full mt-1 px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-sm text-amber-300 focus:outline-none focus:border-amber-500"
            >
              <option value="GWIMA">귀마 (마-상-상-마)</option>
              <option value="WONANGMA">원앙마 (상-마-마-상)</option>
              <option value="YANGGWIMA">양귀마 (마-상-마-상)</option>
              <option value="YANGGWISANG">양귀상 (상-마-상-마)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-rose-400">한(漢) 후공 포진</label>
            <select
              value={hanFormation}
              onChange={(e) => setHanFormation(e.target.value as FormationType)}
              className="w-full mt-1 px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-sm text-stone-300 focus:outline-none focus:border-amber-500"
            >
              <option value="GWIMA">귀마 (마-상-상-마)</option>
              <option value="WONANGMA">원앙마 (상-마-마-상)</option>
              <option value="YANGGWIMA">양귀마 (마-상-마-상)</option>
              <option value="YANGGWISANG">양귀상 (상-마-상-마)</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-800">
            <span className="text-xs text-stone-300">차례마다 판 자동 회전</span>
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => setAutoRotate(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={startGame}
          className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm transition-colors shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>2인 오프라인 대국 시작</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-md mx-auto w-full pb-20">
      {/* Top Player (Han) */}
      <PlayerCard
        side="HAN"
        name="한(漢) 대국자"
        formation={hanFormation}
        timeLeft={600}
        score={scores.han}
        isMyTurn={turn === 'HAN'}
        capturedPieces={capturedCho}
        useHangul={useHangul}
      />

      {/* Board */}
      <div className="relative">
        <JanggiBoard
          pieces={pieces}
          selectedPiece={selectedPiece}
          legalMoves={legalMoves}
          lastMove={lastMove}
          isCheck={isCheckNow}
          checkedSide={isCheckNow ? turn : null}
          flipped={autoRotate ? turn === 'HAN' : false}
          useHangul={useHangul}
          interactive={gameState === 'PLAYING'}
          onSelectPiece={handleSelectPiece}
          onMakeMove={handleMakeMove}
        />

        {gameState === 'ENDED' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-xl z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <h3 className="text-2xl font-bold font-serif text-amber-300">
              {winner === 'CHO' ? '초(楚) 승리!' : '한(漢) 승리!'}
            </h3>
            <p className="text-stone-300 text-sm mt-1">{winReason}</p>
            <div className="mt-3 text-xs text-stone-400">
              최종 기물 점수: 초 {scores.cho.toFixed(1)}점 vs 한 {scores.han.toFixed(1)}점
            </div>
            <button
              onClick={() => setGameState('SETUP')}
              className="mt-5 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm transition-colors shadow"
            >
              새 대국 시작
            </button>
          </div>
        )}
      </div>

      {/* Bottom Player (Cho) */}
      <PlayerCard
        side="CHO"
        name="초(楚) 대국자"
        formation={choFormation}
        timeLeft={600}
        score={scores.cho}
        isMyTurn={turn === 'CHO'}
        capturedPieces={capturedHan}
        useHangul={useHangul}
      />

      {/* In-game Controls */}
      <div className="grid grid-cols-3 gap-2 mt-1">
        <button
          onClick={handlePass}
          disabled={gameState !== 'PLAYING'}
          className="py-2.5 px-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 border border-stone-800 rounded-xl text-xs font-semibold text-stone-200 flex items-center justify-center gap-1.5 transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />
          <span>한수쉼</span>
        </button>
        <button
          onClick={handleResign}
          disabled={gameState !== 'PLAYING'}
          className="py-2.5 px-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 border border-stone-800 rounded-xl text-xs font-semibold text-stone-200 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>기권</span>
        </button>
        <button
          onClick={() => setGameState('SETUP')}
          className="py-2.5 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-xs font-semibold text-stone-200 flex items-center justify-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>새 판</span>
        </button>
      </div>
    </div>
  );
};
