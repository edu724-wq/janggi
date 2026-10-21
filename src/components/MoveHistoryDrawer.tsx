import React from 'react';
import { X, BookOpen, Download } from 'lucide-react';
import { Side } from '../engine/janggi.ts';

interface MoveHistoryRecord {
  side: Side;
  notation: string;
  isPass?: boolean;
}

interface MoveHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  moves: MoveHistoryRecord[];
  winner: Side | 'DRAW' | null;
  winReason: string | null;
}

export const MoveHistoryDrawer: React.FC<MoveHistoryDrawerProps> = ({
  isOpen,
  onClose,
  moves,
  winner,
  winReason,
}) => {
  if (!isOpen) return null;

  const handleExportKibo = () => {
    let content = '=== 천하장기 기보 (Cheonha Janggi Game Record) ===\n';
    content += `대국 일시: ${new Date().toLocaleString()}\n`;
    content += `총 수수: ${moves.length}수\n`;
    if (winner) {
      content += `결과: ${winner === 'DRAW' ? '무승부' : winner === 'CHO' ? '초(楚) 승' : '한(漢) 승'} (${winReason || ''})\n`;
    }
    content += '--------------------------------------------------\n';
    moves.forEach((m, idx) => {
      const sideText = m.side === 'CHO' ? '초(楚)' : '한(漢)';
      content += `${idx + 1}. [${sideText}] ${m.notation}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `janggi_kibo_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-3 text-stone-100 max-h-[85vh]">
        <div className="flex items-center justify-between pb-2 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-stone-100">기보 기록 (수순)</h3>
            <span className="text-xs text-stone-400 font-mono">({moves.length}수)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Moves Table */}
        <div className="flex-1 overflow-y-auto max-h-72 border border-stone-800 rounded-xl bg-stone-950/60 p-2">
          {moves.length === 0 ? (
            <div className="text-center py-10 text-stone-500 text-xs">
              아직 진행된 수가 없습니다.
            </div>
          ) : (
            <div className="space-y-1 font-mono text-xs">
              {moves.map((m, idx) => {
                const isCho = m.side === 'CHO';
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-stone-900 border-b border-stone-900/60 last:border-0"
                  >
                    <span className="text-stone-500 w-8">{idx + 1}.</span>
                    <span
                      className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                        isCho
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                          : 'bg-rose-950 text-rose-300 border border-rose-800/40'
                      }`}
                    >
                      {isCho ? '초(楚)' : '한(漢)'}
                    </span>
                    <span className="flex-1 text-right text-stone-200">
                      {m.notation}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Export Button */}
        {moves.length > 0 && (
          <button
            onClick={handleExportKibo}
            className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-stone-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>기보 텍스트 파일 다운로드 (.txt)</span>
          </button>
        )}
      </div>
    </div>
  );
};
