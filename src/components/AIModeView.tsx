import React, { useState, useEffect, useRef } from 'react';
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
import { getAIMove, AIDifficulty } from '../engine/ai.ts';
import { JanggiBoard } from './JanggiBoard.tsx';
import { PlayerCard } from './PlayerCard.tsx';
import { soundManager } from '../utils/sound.ts';
import { RotateCcw, SkipForward, Play, Shield, RefreshCw } from 'lucide-react';

interface AIModeViewProps {
  useHangul: boolean;
  onOpenRules: () => void;
}

export const AIModeView: React.FC<AIModeViewProps> = ({ useHangul, onOpenRules }) => {
  const [difficulty, setDifficulty] = useState<AIDifficulty>('INTERMEDIATE');
  const [playerSide, setPlayerSide] = useState<Side>('CHO');
  const [playerFormation, setPlayerFormation] = useState<FormationType>('GWIMA');
  const [aiFormation, setAiFormation] = useState<FormationType>('GWIMA');

  const [gameState, setGameState] = useState<'SETUP' | 'PLAYING' | 'ENDED'>('SETUP');
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [turn, setTurn] = useState<Side>('CHO');
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Position | null; to: Position | null } | null>(null);
  const [capturedCho, setCapturedCho] = useState<Piece[]>([]);
  const [capturedHan, setCapturedHan] = useState<Piece[]>([]);
  const [winner, setWinner] = useState<Side | 'DRAW' | null>(null);
  const [winReason, setWinReason] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Move history for undo
  const [history, setHistory] = useState<
    {
      pieces: Piece[];
      turn: Side;
      capturedCho: Piece[];
      capturedHan: Piece[];
      lastMove: { from: Position | null; to: Position | null } | null;
    }[]
  >([]);

  const startNewGame = () => {
    const choF = playerSide === 'CHO' ? playerFormation : aiFormation;
    const hanF = playerSide === 'HAN' ? playerFormation : aiFormation;
    const initial = createInitialBoard(choF, hanF);

    setPieces(initial);
    setTurn('CHO');
    setSelectedPiece(null);
    setLegalMoves([]);
    setLastMove(null);
    setCapturedCho([]);
    setCapturedHan([]);
    setWinner(null);
    setWinReason(null);
    setHistory([]);
    setGameState('PLAYING');
  };

  const aiSide: Side = playerSide === 'CHO' ? 'HAN' : 'CHO';

  // AI Turn handler
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    if (turn === aiSide && !winner) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        const move = getAIMove(pieces, aiSide, difficulty);

        if (!move) {
          // AI must pass or is checkmated
          if (isKingInCheck(pieces, aiSide)) {
            setWinner(playerSide);
            setWinReason('외통승 (Checkmate)');
            setGameState('ENDED');
            soundManager.playVictory();
          } else {
            // Pass turn
            setTurn(playerSide);
            soundManager.playPass();
          }
          setIsAiThinking(false);
          return;
        }

        // Execute AI Move
        const captured = getPieceAt(pieces, move.to.x, move.to.y);
        if (captured) {
          if (captured.side === 'CHO') setCapturedCho((prev) => [...prev, captured]);
          else setCapturedHan((prev) => [...prev, captured]);
          soundManager.playCapture();
        } else {
          soundManager.playPlacePiece();
        }

        const nextPieces = pieces
          .filter((p) => !(p.x === move.to.x && p.y === move.to.y))
          .map((p) => (p.id === move.piece.id ? { ...p, x: move.to.x, y: move.to.y } : p));

        setPieces(nextPieces);
        setLastMove({ from: move.from, to: move.to });

        // Save history
        setHistory((prev) => [
          ...prev,
          {
            pieces: nextPieces,
            turn: playerSide,
            capturedCho,
            capturedHan,
            lastMove: { from: move.from, to: move.to },
          },
        ]);

        // Check if player King is in check
        if (isKingInCheck(nextPieces, playerSide)) {
          if (!hasAnyLegalMoves(nextPieces, playerSide)) {
            setWinner(aiSide);
            setWinReason('외통승 (Checkmate)');
            setGameState('ENDED');
            soundManager.playVictory();
          } else {
            soundManager.playCheck();
          }
        }

        setTurn(playerSide);
        setIsAiThinking(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [turn, gameState, pieces, aiSide, playerSide, difficulty, winner, capturedCho, capturedHan]);

  // Handle piece selection
  const handleSelectPiece = (piece: Piece) => {
    if (gameState !== 'PLAYING' || turn !== playerSide || isAiThinking) return;

    if (piece.side !== playerSide) {
      // Clicked opponent piece: if it's in legal moves, execute capture
      const isTarget = legalMoves.some((m) => m.x === piece.x && m.y === piece.y);
      if (isTarget && selectedPiece) {
        handleMakeMove({ x: piece.x, y: piece.y });
      }
      return;
    }

    setSelectedPiece(piece);
    const moves = getLegalMovesForPiece(piece, pieces);
    setLegalMoves(moves);
  };

  // Handle move execution
  const handleMakeMove = (to: Position) => {
    if (!selectedPiece || gameState !== 'PLAYING' || turn !== playerSide) return;

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

    // Save history
    setHistory((prev) => [
      ...prev,
      {
        pieces: nextPieces,
        turn: aiSide,
        capturedCho,
        capturedHan,
        lastMove: { from: { x: selectedPiece.x, y: selectedPiece.y }, to },
      },
    ]);

    // Check if AI king is in check or checkmated
    if (isKingInCheck(nextPieces, aiSide)) {
      if (!hasAnyLegalMoves(nextPieces, aiSide)) {
        setWinner(playerSide);
        setWinReason('외통승 (Checkmate)');
        setGameState('ENDED');
        soundManager.playVictory();
      } else {
        soundManager.playCheck();
      }
    }

    setTurn(aiSide);
  };

  // Handle Pass (한수쉼)
  const handlePass = () => {
    if (gameState !== 'PLAYING' || turn !== playerSide || isAiThinking) return;
    soundManager.playPass();
    setSelectedPiece(null);
    setLegalMoves([]);
    setTurn(aiSide);
  };

  // Handle Undo (무르기)
  const handleUndo = () => {
    if (history.length < 2 || isAiThinking) return;
    // Step back 2 plies (both AI move and player move)
    const targetState = history[history.length - 3] || {
      pieces: createInitialBoard(playerFormation, aiFormation),
      turn: 'CHO',
      capturedCho: [],
      capturedHan: [],
      lastMove: null,
    };

    setPieces(targetState.pieces);
    setTurn(playerSide);
    setCapturedCho(targetState.capturedCho);
    setCapturedHan(targetState.capturedHan);
    setLastMove(targetState.lastMove);
    setSelectedPiece(null);
    setLegalMoves([]);
    setWinner(null);
    setWinReason(null);
    setGameState('PLAYING');
    setHistory((prev) => prev.slice(0, Math.max(0, prev.length - 2)));
  };

  const scores = calculateMaterialScore(pieces);
  const isCheckNow = isKingInCheck(pieces, turn);

  if (gameState === 'SETUP') {
    return (
      <div className="max-w-md mx-auto w-full p-4 flex flex-col gap-4 text-stone-100 pb-20">
        <div className="text-center pt-2">
          <h2 className="text-2xl font-bold font-serif text-amber-200">AI 대국 연습장</h2>
          <p className="text-xs text-stone-400 mt-1">
            혼자서도 실력을 연마할 수 있는 인공지능 장기 대국 모드입니다.
          </p>
        </div>

        {/* Difficulty Selection */}
        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col gap-2">
          <label className="text-xs font-semibold text-stone-300">인공지능 난이도</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'BEGINNER', label: '초급 (입문)', desc: '장기 기초 연습' },
              { id: 'INTERMEDIATE', label: '중급 (일반)', desc: '균형 잡힌 대국' },
              { id: 'MASTER', label: '고급 (달인)', desc: '깊은 수읽기' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id as AIDifficulty)}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  difficulty === d.id
                    ? 'bg-amber-600 text-stone-950 border-amber-500 font-bold shadow'
                    : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:bg-stone-800'
                }`}
              >
                <div className="text-xs font-bold">{d.label}</div>
                <div className="text-[10px] opacity-80 mt-0.5">{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Player Side Choice */}
        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col gap-2">
          <label className="text-xs font-semibold text-stone-300">진영 선택</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPlayerSide('CHO')}
              className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 ${
                playerSide === 'CHO'
                  ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200 shadow'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>초(楚) 선공</span>
            </button>
            <button
              onClick={() => setPlayerSide('HAN')}
              className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 ${
                playerSide === 'HAN'
                  ? 'bg-rose-900/60 border-rose-500 text-rose-200 shadow'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>한(漢) 후공 (덤 1.5점)</span>
            </button>
          </div>
        </div>

        {/* Formation Selection */}
        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-stone-300">내 포진 설정</label>
            <select
              value={playerFormation}
              onChange={(e) => setPlayerFormation(e.target.value as FormationType)}
              className="w-full mt-1 px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-sm text-amber-300 focus:outline-none focus:border-amber-500"
            >
              <option value="GWIMA">귀마 (마-상-상-마) [가장 추천]</option>
              <option value="WONANGMA">원앙마 (상-마-마-상)</option>
              <option value="YANGGWIMA">양귀마 (마-상-마-상)</option>
              <option value="YANGGWISANG">양귀상 (상-마-상-마)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-300">AI 상대 포진</label>
            <select
              value={aiFormation}
              onChange={(e) => setAiFormation(e.target.value as FormationType)}
              className="w-full mt-1 px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-sm text-stone-300 focus:outline-none focus:border-amber-500"
            >
              <option value="GWIMA">귀마 (마-상-상-마)</option>
              <option value="WONANGMA">원앙마 (상-마-마-상)</option>
              <option value="YANGGWIMA">양귀마 (마-상-마-상)</option>
              <option value="YANGGWISANG">양귀상 (상-마-상-마)</option>
            </select>
          </div>
        </div>

        <button
          onClick={startNewGame}
          className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm transition-colors shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>AI 대국 시작하기</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-md mx-auto w-full pb-20">
      {/* Opponent Card (AI) */}
      <PlayerCard
        side={aiSide}
        name={`인공지능 (${difficulty === 'BEGINNER' ? '초급' : difficulty === 'INTERMEDIATE' ? '중급' : '고급'})`}
        formation={aiFormation}
        timeLeft={600}
        score={aiSide === 'CHO' ? scores.cho : scores.han}
        isMyTurn={turn === aiSide}
        capturedPieces={aiSide === 'CHO' ? capturedHan : capturedCho}
        useHangul={useHangul}
      />

      {/* AI Thinking Notice */}
      {isAiThinking && (
        <div className="text-center py-1 text-xs text-amber-300 font-medium animate-pulse flex items-center justify-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>인공지능이 최적의 수를 수읽기 중입니다...</span>
        </div>
      )}

      {/* Board */}
      <div className="relative">
        <JanggiBoard
          pieces={pieces}
          selectedPiece={selectedPiece}
          legalMoves={legalMoves}
          lastMove={lastMove}
          isCheck={isCheckNow}
          checkedSide={isCheckNow ? turn : null}
          flipped={playerSide === 'HAN'}
          useHangul={useHangul}
          interactive={turn === playerSide && !isAiThinking && gameState === 'PLAYING'}
          onSelectPiece={handleSelectPiece}
          onMakeMove={handleMakeMove}
        />

        {/* Victory/Game Over Overlay */}
        {gameState === 'ENDED' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-xl z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <h3 className="text-2xl font-bold font-serif text-amber-300">
              {winner === playerSide ? '대국 승리!' : '대국 패배'}
            </h3>
            <p className="text-stone-300 text-sm mt-1">{winReason}</p>
            <div className="mt-3 text-xs text-stone-400">
              최종 기물 점수: 초 {scores.cho.toFixed(1)}점 vs 한 {scores.han.toFixed(1)}점
            </div>
            <button
              onClick={() => setGameState('SETUP')}
              className="mt-5 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm transition-colors shadow"
            >
              다시 도전하기
            </button>
          </div>
        )}
      </div>

      {/* Player Card (Me) */}
      <PlayerCard
        side={playerSide}
        name="나 (대국자)"
        formation={playerFormation}
        timeLeft={600}
        score={playerSide === 'CHO' ? scores.cho : scores.han}
        isMyTurn={turn === playerSide}
        capturedPieces={playerSide === 'CHO' ? capturedHan : capturedCho}
        useHangul={useHangul}
        isMe
      />

      {/* In-game Controls */}
      <div className="grid grid-cols-3 gap-2 mt-1">
        <button
          onClick={handleUndo}
          disabled={history.length < 2 || isAiThinking}
          className="py-2.5 px-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed border border-stone-800 rounded-xl text-xs font-semibold text-stone-200 flex items-center justify-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>무르기</span>
        </button>
        <button
          onClick={handlePass}
          disabled={turn !== playerSide || isAiThinking || gameState !== 'PLAYING'}
          className="py-2.5 px-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed border border-stone-800 rounded-xl text-xs font-semibold text-stone-200 flex items-center justify-center gap-1.5 transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />
          <span>한수쉼</span>
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
