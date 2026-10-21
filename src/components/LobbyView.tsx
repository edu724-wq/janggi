import React, { useState } from 'react';
import { Side, FormationType, FORMATION_INFO } from '../engine/janggi.ts';
import { Users, Plus, Zap, ArrowRight, Shield, Clock, Search, RefreshCw } from 'lucide-react';
import heroMatchImg from '../assets/images/janggi_hero_match_1792546907645.jpg';

export interface PublicRoomInfo {
  id: string;
  name: string;
  status: 'WAITING' | 'FORMATION_SELECT' | 'PLAYING' | 'ENDED';
  choName: string | null;
  hanName: string | null;
  spectatorCount: number;
}

interface LobbyViewProps {
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  publicRooms: PublicRoomInfo[];
  onCreateRoom: (params: {
    name: string;
    timeControlSeconds: number;
    side: Side;
    formation: FormationType;
  }) => void;
  onJoinRoom: (roomId: string, formation: FormationType) => void;
  onRefreshRooms: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  playerName,
  onUpdatePlayerName,
  publicRooms,
  onCreateRoom,
  onJoinRoom,
  onRefreshRooms,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState(`${playerName}님의 대국실`);
  const [timeControl, setTimeControl] = useState(600); // 10 mins
  const [selectedSide, setSelectedSide] = useState<Side>('CHO');
  const [selectedFormation, setSelectedFormation] = useState<FormationType>('GWIMA');
  const [searchCode, setSearchCode] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom({
      name: roomNameInput.trim() || `${playerName}님의 대국실`,
      timeControlSeconds: timeControl,
      side: selectedSide,
      formation: selectedFormation,
    });
    setShowCreateModal(false);
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    onJoinRoom(searchCode.trim().toUpperCase(), selectedFormation);
  };

  const handleQuickMatch = () => {
    // Find first room with WAITING status
    const waitingRoom = publicRooms.find((r) => r.status === 'WAITING');
    if (waitingRoom) {
      onJoinRoom(waitingRoom.id, selectedFormation);
    } else {
      // Create new room automatically
      onCreateRoom({
        name: `${playerName}님의 빠른 대국`,
        timeControlSeconds: 600,
        side: 'CHO',
        formation: selectedFormation,
      });
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto w-full pb-20">
      {/* Hero Visual Card */}
      <div className="relative rounded-2xl overflow-hidden border border-stone-800 shadow-xl bg-stone-900 aspect-[16/8] sm:aspect-[16/7]">
        <img
          src={heroMatchImg}
          alt="천하장기 온라인 대국"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 flex flex-col justify-end">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60">
              초(楚)
            </span>
            <span className="text-xs text-stone-300">vs</span>
            <span className="text-xs font-semibold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-700/60">
              한(漢)
            </span>
            <span className="text-xs text-amber-300 ml-auto font-mono">실시간 1:1</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-100 font-serif">
            실시간 온라인 대국장
          </h2>
          <p className="text-xs text-stone-300 mt-1 line-clamp-1">
            친구와 방 코드로 함께하거나, 전국 장기 기객들과 실시간으로 맞붙으세요.
          </p>
        </div>
      </div>

      {/* User Name & Quick Match Strip */}
      <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <label className="text-[11px] text-stone-400 font-medium">대국자 닉네임</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => onUpdatePlayerName(e.target.value)}
              maxLength={12}
              className="w-full mt-0.5 px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100 font-medium focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-stone-400 font-medium">내 기본 포진</label>
            <select
              value={selectedFormation}
              onChange={(e) => setSelectedFormation(e.target.value as FormationType)}
              className="w-full mt-0.5 px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-sm text-amber-300 font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="GWIMA">귀마 (마상상마)</option>
              <option value="WONANGMA">원앙마 (상마마상)</option>
              <option value="YANGGWIMA">양귀마 (마상마상)</option>
              <option value="YANGGWISANG">양귀상 (상마상마)</option>
            </select>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleQuickMatch}
            className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>빠른 대국 참가</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="py-3 px-4 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>방 만들기</span>
          </button>
        </div>
      </div>

      {/* Join by Room Code Box */}
      <form onSubmit={handleJoinByCode} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            placeholder="방 코드 입력 (예: JG-ABCD)"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-stone-100 placeholder-stone-500 uppercase font-mono focus:outline-none focus:border-amber-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl text-sm transition-colors border border-stone-700"
        >
          입장
        </button>
      </form>

      {/* Open Rooms List */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-stone-400" />
            <h3 className="font-semibold text-sm text-stone-200">개설된 대국실 목록</h3>
            <span className="text-xs text-stone-500">({publicRooms.length})</span>
          </div>
          <button
            onClick={onRefreshRooms}
            className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {publicRooms.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-stone-900/50 border border-stone-800 text-stone-400 text-xs flex flex-col items-center gap-2">
            <Users className="w-8 h-8 text-stone-600 stroke-[1.5]" />
            <p>현재 대기 중인 공개 대국실이 없습니다.</p>
            <p className="text-stone-500 text-[11px]">
              직접 방을 만들어 친구를 초대하거나 상대방을 기다려보세요!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {publicRooms.map((room) => {
              const isWaiting = room.status === 'WAITING';
              const isPlaying = room.status === 'PLAYING' || room.status === 'FORMATION_SELECT';
              return (
                <div
                  key={room.id}
                  className="p-3 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700 transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-stone-100 truncate">
                        {room.name}
                      </span>
                      <span className="text-[10px] font-mono text-stone-500 bg-stone-950 px-1.5 py-0.5 rounded border border-stone-800">
                        {room.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-400 mt-1">
                      <span>초: {room.choName || '공석'}</span>
                      <span aria-hidden="true">·</span>
                      <span>한: {room.hanName || '공석'}</span>
                      {room.spectatorCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>관전 {room.spectatorCount}명</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isWaiting ? (
                      <button
                        onClick={() => onJoinRoom(room.id, selectedFormation)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                      >
                        <span>대국 참가</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : isPlaying ? (
                      <button
                        onClick={() => onJoinRoom(room.id, selectedFormation)}
                        className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 font-medium rounded-lg text-xs transition-colors border border-stone-700"
                      >
                        관전하기
                      </button>
                    ) : (
                      <span className="text-xs text-stone-500">종료</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4 text-stone-100"
          >
            <div>
              <h3 className="text-lg font-bold text-amber-200">새 장기 대국실 개설</h3>
              <p className="text-xs text-stone-400 mt-0.5">
                대국 조건과 선후수를 설정하세요.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-stone-400 font-medium">대국실 이름</label>
                <input
                  type="text"
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  maxLength={24}
                  className="w-full mt-1 px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-stone-400 font-medium">대국 제한 시간</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[
                    { label: '5분', val: 300 },
                    { label: '10분', val: 600 },
                    { label: '15분', val: 900 },
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setTimeControl(t.val)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        timeControl === t.val
                          ? 'bg-amber-600 text-stone-950 border-amber-500 shadow'
                          : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-stone-400 font-medium">선후수 선택</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedSide('CHO')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      selectedSide === 'CHO'
                        ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200 shadow'
                        : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span>초(楚) 선공</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSide('HAN')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      selectedSide === 'HAN'
                        ? 'bg-rose-900/60 border-rose-500 text-rose-200 shadow'
                        : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span>한(漢) 후공 (덤 1.5점)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-stone-400 font-medium">내 초기 포진</label>
                <select
                  value={selectedFormation}
                  onChange={(e) => setSelectedFormation(e.target.value as FormationType)}
                  className="w-full mt-1 px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-sm text-amber-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="GWIMA">귀마 (마-상-상-마) [추천]</option>
                  <option value="WONANGMA">원앙마 (상-마-마-상)</option>
                  <option value="YANGGWIMA">양귀마 (마-상-마-상)</option>
                  <option value="YANGGWISANG">양귀상 (상-마-상-마)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl text-sm transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm transition-colors shadow"
              >
                방 개설하기
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
