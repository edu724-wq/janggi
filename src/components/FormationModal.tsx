import React from 'react';
import { FormationType, FORMATION_INFO, Side, HANJA_NAMES, HANGUL_NAMES } from '../engine/janggi.ts';
import { Check } from 'lucide-react';

interface FormationModalProps {
  isOpen: boolean;
  currentFormation: FormationType;
  side: Side;
  useHangul?: boolean;
  onSelect: (formation: FormationType) => void;
  onConfirm: () => void;
}

export const FormationModal: React.FC<FormationModalProps> = ({
  isOpen,
  currentFormation,
  side,
  useHangul = false,
  onSelect,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const formations: FormationType[] = ['GWIMA', 'WONANGMA', 'YANGGWIMA', 'YANGGWISANG'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4 text-stone-100">
        <div>
          <h2 className="text-lg font-bold text-amber-200">
            {side === 'CHO' ? '초(楚)' : '한(漢)'} 포진 선택
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            대국 시작 전 마(馬)와 상(象)의 배치 방식을 선택하세요.
          </p>
        </div>

        {/* Formation Selection Cards */}
        <div className="flex flex-col gap-2.5">
          {formations.map((fType) => {
            const info = FORMATION_INFO[fType];
            const isSelected = currentFormation === fType;
            const pieces = info.arrangement;

            return (
              <div
                key={fType}
                onClick={() => onSelect(fType)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                    : 'bg-stone-800/60 border-stone-700/60 hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-stone-100">{info.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                  </div>
                  {/* Miniature Visual Layout */}
                  <div className="flex items-center gap-1 bg-stone-950/60 px-2 py-1 rounded-md border border-stone-800 font-mono text-xs">
                    {pieces.map((p, idx) => {
                      const label = useHangul
                        ? HANGUL_NAMES[side][p]
                        : HANJA_NAMES[side][p];
                      return (
                        <span
                          key={idx}
                          className={`w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-bold ${
                            p === 'MA'
                              ? side === 'CHO'
                                ? 'bg-emerald-900/60 text-emerald-300'
                                : 'bg-red-900/60 text-rose-300'
                              : side === 'CHO'
                              ? 'bg-teal-950 text-teal-400'
                              : 'bg-amber-950 text-amber-400'
                          }`}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">{info.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <button
          onClick={onConfirm}
          className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm transition-colors shadow-lg shadow-amber-900/20 active:scale-[0.98]"
        >
          포진 결정 및 대국 시작
        </button>
      </div>
    </div>
  );
};
