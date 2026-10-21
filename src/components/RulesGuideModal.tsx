import React, { useState } from 'react';
import { X, ShieldAlert, Award, HelpCircle } from 'lucide-react';

interface RulesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesGuideModal: React.FC<RulesGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'PIECES' | 'FORMATIONS' | 'RULES'>('PIECES');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 text-stone-100 max-h-[90vh]">
        <div className="flex items-center justify-between pb-2 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-stone-100">한국장기 규칙 및 포진 가이드</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800">
          <button
            onClick={() => setActiveTab('PIECES')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'PIECES'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            기물 행마법 (7대 기물)
          </button>
          <button
            onClick={() => setActiveTab('FORMATIONS')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'FORMATIONS'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            4대 전통 포진
          </button>
          <button
            onClick={() => setActiveTab('RULES')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'RULES'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            점수제 및 특수 규칙
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs sm:text-sm text-stone-300">
          {activeTab === 'PIECES' && (
            <div className="space-y-3">
              <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span>차 (車 - 13점)</span>
                  <span className="text-[11px] text-stone-400">최강의 원거리 공격수</span>
                </div>
                <p className="mt-1 text-stone-300 leading-relaxed text-xs">
                  상하좌우 직선 방향으로 장애물이 없는 한 무제한 직진합니다. 궁성 사선을 탈 수 있어 대각선으로도 이동 가능합니다.
                </p>
              </div>

              <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span>포 (包 - 7점)</span>
                  <span className="text-[11px] text-red-400 font-semibold">★ 특수 규칙 필수</span>
                </div>
                <p className="mt-1 text-stone-300 leading-relaxed text-xs">
                  반드시 하나의 기물(다리)을 뛰어넘어야만 이동하거나 잡을 수 있습니다.
                  <br />
                  <strong className="text-amber-200">※ 금지 규칙:</strong> 포는 다른 포를 다리로 넘을 수 없으며, 상대 포를 잡을 수도 없습니다!
                </p>
              </div>

              <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span>마 (馬 - 5점)</span>
                  <span className="text-[11px] text-stone-400">기동성의 핵심</span>
                </div>
                <p className="mt-1 text-stone-300 leading-relaxed text-xs">
                  직선 1칸 후 대각선 1칸(날 일자, 日)으로 이동합니다. 직선 1칸 위치에 다른 기물이 가로막고 있으면(멱) 그 방향으로 이동할 수 없습니다.
                </p>
              </div>

              <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span>상 (象 - 3점)</span>
                  <span className="text-[11px] text-stone-400">장거리 대각 침투</span>
                </div>
                <p className="mt-1 text-stone-300 leading-relaxed text-xs">
                  직선 1칸 후 대각선 2칸(쓸 용자, 用)으로 이동합니다. 이동 경로인 직선 1칸과 대각선 1칸 모두 비어 있어야 이동 가능합니다(멱이 2개).
                </p>
              </div>

              <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span>졸 / 병 (卒/兵 - 2점)</span>
                  <span className="text-[11px] text-stone-400">전진과 좌우</span>
                </div>
                <p className="mt-1 text-stone-300 leading-relaxed text-xs">
                  앞으로 1칸 또는 좌우로 1칸 이동합니다 (후퇴 불가). 상대 궁성에 진입하면 궁성 사선을 따라 대각선 전진도 가능합니다.
                </p>
              </div>

              <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span>궁 & 사 (宮/士 - 0점 / 3점)</span>
                  <span className="text-[11px] text-stone-400">궁성의 수호</span>
                </div>
                <p className="mt-1 text-stone-300 leading-relaxed text-xs">
                  궁성(3×3 격자) 내부의 선을 따라서만 1칸씩 이동합니다. 사선 중심과 모서리 사이에서는 대각선으로 1칸 이동할 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'FORMATIONS' && (
            <div className="space-y-3">
              <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60">
                <h4 className="font-bold text-amber-300">1. 귀마 (마-상-상-마)</h4>
                <p className="mt-1 text-xs text-stone-300 leading-relaxed">
                  장기 대국에서 가장 많이 사용되는 정통 포진입니다. 한쪽 귀에 마를 올려 왕궁을 수비하고 다른 쪽 상과 차로 공격하는 공수 밸런스가 뛰어납니다.
                </p>
              </div>
              <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60">
                <h4 className="font-bold text-amber-300">2. 원앙마 (상-마-마-상)</h4>
                <p className="mt-1 text-xs text-stone-300 leading-relaxed">
                  두 마가 중앙에서 서로 연결되어(원앙처럼) 지켜주는 수비 중심 포진입니다. 초반 중앙 돌파가 어려울 만큼 방어력이 탄탄합니다.
                </p>
              </div>
              <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60">
                <h4 className="font-bold text-amber-300">3. 양귀마 (마-상-마-상)</h4>
                <p className="mt-1 text-xs text-stone-300 leading-relaxed">
                  양쪽 귀에 마를 배치하는 포진입니다. 중앙 졸을 열어 적극적인 압박과 강력한 공격을 펼치기에 적합합니다.
                </p>
              </div>
              <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60">
                <h4 className="font-bold text-amber-300">4. 양귀상 (상-마-상-마)</h4>
                <p className="mt-1 text-xs text-stone-300 leading-relaxed">
                  양 귀에 상을 배치하여 초반부터 상대 진영 깊숙이 상길을 열어두는 기습 특화 포진입니다.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'RULES' && (
            <div className="space-y-3">
              <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60">
                <h4 className="font-bold text-amber-300">점수제 승부 및 덤 (1.5점)</h4>
                <p className="mt-1 text-xs text-stone-300 leading-relaxed">
                  초(楚)의 기물 총점은 72점, 한(漢)은 후수 보정으로 덤 1.5점을 받아 73.5점으로 시작합니다.
                  <br />
                  시간 초과나 기권 없이 대국이 종료되거나 합의 판정 시 남은 기물 점수가 높은 쪽이 판정승합니다.
                </p>
              </div>
              <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60">
                <h4 className="font-bold text-amber-300">한수쉼 (Pass)</h4>
                <p className="mt-1 text-xs text-stone-300 leading-relaxed">
                  한국장기만의 고유한 규칙으로, 마땅히 둘 수가 없거나 자신의 진형을 흩뜨리지 않고자 할 때 자신의 차례를 패스(한수쉼)할 수 있습니다.
                </p>
              </div>
              <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60">
                <h4 className="font-bold text-amber-300">빅장 (왕과 왕의 대면)</h4>
                <p className="mt-1 text-xs text-stone-300 leading-relaxed">
                  같은 세로선상에서 두 왕 사이에 아무 기물도 없이 서로 마주 보게 되면 빅장이라 부르며, 상대방은 무승부를 주장하거나 회피할 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
