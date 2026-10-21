import React from 'react';
import {
  Side,
  Piece,
  PieceType,
  HANJA_NAMES,
  HANGUL_NAMES,
  FORMATION_INFO,
  FormationType,
} from '../engine/janggi.ts';
import { Clock, Shield } from 'lucide-react';

interface PlayerCardProps {
  side: Side;
  name: string;
  formation: FormationType;
  timeLeft: number;
  score: number;
  isMyTurn: boolean;
  capturedPieces: Piece[];
  useHangul?: boolean;
  isMe?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  side,
  name,
  formation,
  timeLeft,
  score,
  isMyTurn,
  capturedPieces,
  useHangul = false,
  isMe = false,
}) => {
  const isCho = side === 'CHO';
  const formationLabel = FORMATION_INFO[formation]?.name?.split(' ')[0] || '귀마';

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isLowTime = timeLeft <= 30;

  // Group captured pieces by type
  const pieceCounts: Partial<Record<PieceType, number>> = {};
  for (const p of capturedPieces) {
    pieceCounts[p.type] = (pieceCounts[p.type] || 0) + 1;
  }

  const pieceOrder: PieceType[] = ['CHA', 'PO', 'MA', 'SANG', 'SA', 'ZOL'];

  return (
    <div
      className={`relative px-3.5 py-2.5 rounded-xl border transition-all duration-300 ${
        isMyTurn
          ? isCho
            ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md shadow-emerald-900/20 ring-1 ring-emerald-500/50'
            : 'bg-rose-950/40 border-rose-500/80 shadow-md shadow-rose-900/20 ring-1 ring-rose-500/50'
          : 'bg-stone-900/70 border-stone-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Left: Player Identity & Formation */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Side Circle Mark */}
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-base shadow-inner shrink-0 ${
              isCho
                ? 'bg-emerald-900/80 border border-emerald-400 text-emerald-200'
                : 'bg-red-950/80 border border-rose-400 text-rose-200'
            }`}
          >
            {useHangul ? (isCho ? '초' : '한') : isCho ? '楚' : '漢'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-stone-100 truncate max-w-[110px]">
                {name}
              </span>
              {isMe && (
                <span className="text-[10px] text-amber-400 font-medium px-1 py-0.2 bg-amber-950/60 rounded border border-amber-800/60">
                  나
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <span className="text-stone-300">{formationLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-mono text-amber-300">
                {score.toFixed(1)}점
              </span>
            </div>
          </div>
        </div>

        {/* Right: Digital Timer Clock & Turn Pulse */}
        <div className="flex items-center gap-2 shrink-0">
          {isMyTurn && (
            <div
              className={`w-2 h-2 rounded-full animate-ping ${
                isCho ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
          )}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono tabular-nums text-sm font-semibold transition-colors ${
              isLowTime
                ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse'
                : isMyTurn
                ? 'bg-stone-800 border-amber-500/70 text-amber-200'
                : 'bg-stone-900 border-stone-800 text-stone-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5 opacity-70" />
            <span>{timeFormatted}</span>
          </div>
        </div>
      </div>

      {/* Bottom: Captured Pieces Tray (잡은 기물) */}
      <div className="mt-1.5 pt-1.5 border-t border-stone-800/80 flex items-center justify-between text-xs">
        <span className="text-[11px] text-stone-500">획득 기물</span>
        <div className="flex items-center gap-1.5 min-h-[20px] overflow-x-auto">
          {capturedPieces.length === 0 ? (
            <span className="text-[11px] text-stone-600">없음</span>
          ) : (
            pieceOrder.map((type) => {
              const count = pieceCounts[type];
              if (!count) return null;
              const enemySide: Side = isCho ? 'HAN' : 'CHO';
              const label = useHangul
                ? HANGUL_NAMES[enemySide][type]
                : HANJA_NAMES[enemySide][type];
              return (
                <div
                  key={type}
                  className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium border ${
                    enemySide === 'CHO'
                      ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                  }`}
                >
                  <span>{label}</span>
                  {count > 1 && <span className="text-[9px] font-bold">×{count}</span>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
