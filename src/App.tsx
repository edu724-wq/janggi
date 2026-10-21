/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Side,
  Piece,
  Position,
  FormationType,
  calculateMaterialScore,
  isKingInCheck,
  getLegalMovesForPiece,
} from './engine/janggi.ts';
import { JanggiBoard } from './components/JanggiBoard.tsx';
import { PlayerCard } from './components/PlayerCard.tsx';
import { FormationModal } from './components/FormationModal.tsx';
import { QuickChatModal } from './components/QuickChatModal.tsx';
import { MoveHistoryDrawer } from './components/MoveHistoryDrawer.tsx';
import { RulesGuideModal } from './components/RulesGuideModal.tsx';
import { LobbyView, PublicRoomInfo } from './components/LobbyView.tsx';
import { AIModeView } from './components/AIModeView.tsx';
import { PassAndPlayView } from './components/PassAndPlayView.tsx';
import { soundManager } from './utils/sound.ts';
import {
  Volume2,
  VolumeX,
  BookOpen,
  Share2,
  MessageSquare,
  SkipForward,
  Flag,
  Handshake,
  Check,
  RotateCcw,
  LogOut,
  Sparkles,
  Users,
  Bot,
  Gamepad2,
  HelpCircle,
  Copy,
} from 'lucide-react';

type NavTab = 'ONLINE' | 'AI' | 'LOCAL' | 'RULES';

interface RoomData {
  id: string;
  name: string;
  status: 'WAITING' | 'FORMATION_SELECT' | 'PLAYING' | 'ENDED';
  timeControlSeconds: number;
  choPlayer: {
    id: string;
    name: string;
    formation: FormationType;
    isReady: boolean;
    timeLeft: number;
    connected: boolean;
  } | null;
  hanPlayer: {
    id: string;
    name: string;
    formation: FormationType;
    isReady: boolean;
    timeLeft: number;
    connected: boolean;
  } | null;
  spectatorCount: number;
  pieces: Piece[];
  turn: Side;
  moveHistory: { from: Position | null; to: Position | null; side: Side; notation: string; isPass?: boolean }[];
  capturedCho: Piece[];
  capturedHan: Piece[];
  scores: { cho: number; han: number };
  winner: Side | 'DRAW' | null;
  winReason: string | null;
  chat: { id: string; senderName: string; senderSide: Side | 'SPECTATOR'; text: string; timestamp: number }[];
  drawOfferFrom: Side | null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('ONLINE');
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('janggi_player_name') || `기객_${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [isMuted, setIsMuted] = useState(() => soundManager.getMuted());
  const [useHangul, setUseHangul] = useState(false);

  // Online Multiplayer State
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [mySide, setMySide] = useState<Side | 'SPECTATOR' | null>(null);

  // In-Game Selection & UI state
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [tempFormation, setTempFormation] = useState<FormationType>('GWIMA');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const prevTurnRef = useRef<Side | null>(null);
  const prevMoveCountRef = useRef<number>(0);

  const handleUpdatePlayerName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('janggi_player_name', name);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Connect WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'LIST_ROOMS' }));
    };

    socket.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);

        switch (type) {
          case 'ROOMS_LIST': {
            setPublicRooms(payload || []);
            break;
          }

          case 'ROOM_JOINED': {
            setCurrentRoom(payload.room);
            setMyPlayerId(payload.myPlayerId);
            setMySide(payload.mySide);
            if (payload.room.status === 'FORMATION_SELECT') {
              setShowFormationModal(true);
            }
            break;
          }

          case 'ROOM_UPDATE': {
            const updatedRoom: RoomData = payload;
            setCurrentRoom(updatedRoom);

            // Handle sounds on move update
            if (updatedRoom.moveHistory.length > prevMoveCountRef.current) {
              const last = updatedRoom.moveHistory[updatedRoom.moveHistory.length - 1];
              if (last.isPass) {
                soundManager.playPass();
              } else {
                soundManager.playPlacePiece();
              }
              prevMoveCountRef.current = updatedRoom.moveHistory.length;
            }

            // Check alerts
            if (updatedRoom.status === 'PLAYING') {
              const inCheck = isKingInCheck(updatedRoom.pieces, updatedRoom.turn);
              if (inCheck && updatedRoom.turn !== prevTurnRef.current) {
                soundManager.playCheck();
                showToast('장군!');
              }
            } else if (updatedRoom.status === 'ENDED' && updatedRoom.winner) {
              soundManager.playVictory();
            }

            prevTurnRef.current = updatedRoom.turn;
            break;
          }

          case 'TIME_UPDATE': {
            setCurrentRoom((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                choPlayer: prev.choPlayer ? { ...prev.choPlayer, timeLeft: payload.choTime } : null,
                hanPlayer: prev.hanPlayer ? { ...prev.hanPlayer, timeLeft: payload.hanTime } : null,
              };
            });
            break;
          }

          case 'CHAT_UPDATE': {
            setCurrentRoom((prev) => (prev ? { ...prev, chat: payload.chat } : null));
            break;
          }

          case 'ERROR': {
            showToast(payload);
            break;
          }
        }
      } catch (err) {
        console.error('Socket parse error:', err);
      }
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // Online Room Actions
  const handleCreateRoom = (params: {
    name: string;
    timeControlSeconds: number;
    side: Side;
    formation: FormationType;
  }) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      showToast('서버 연결 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    setTempFormation(params.formation);
    ws.send(
      JSON.stringify({
        type: 'CREATE_ROOM',
        payload: {
          name: params.name,
          timeControlSeconds: params.timeControlSeconds,
          playerName,
          side: params.side,
          formation: params.formation,
        },
      })
    );
  };

  const handleJoinRoom = (roomId: string, formation: FormationType) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      showToast('서버 연결 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    setTempFormation(formation);
    ws.send(
      JSON.stringify({
        type: 'JOIN_ROOM',
        payload: {
          roomId,
          playerName,
          formation,
        },
      })
    );
  };

  const handleRefreshRooms = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'LIST_ROOMS' }));
    }
  };

  const handleConfirmFormation = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !currentRoom) return;
    ws.send(
      JSON.stringify({
        type: 'UPDATE_FORMATION',
        payload: { formation: tempFormation },
      })
    );
    ws.send(JSON.stringify({ type: 'START_GAME' }));
    setShowFormationModal(false);
  };

  const handleOnlineSelectPiece = (piece: Piece) => {
    if (!currentRoom || currentRoom.status !== 'PLAYING') return;
    if (currentRoom.turn !== mySide) return;

    if (piece.side !== mySide) {
      const isTarget = legalMoves.some((m) => m.x === piece.x && m.y === piece.y);
      if (isTarget && selectedPiece) {
        handleOnlineMakeMove({ x: piece.x, y: piece.y });
      }
      return;
    }

    setSelectedPiece(piece);
    const moves = piece ? getLegalMovesForPiece(piece, currentRoom.pieces) : [];
    setLegalMoves(moves);
  };

  const handleOnlineMakeMove = (to: Position) => {
    if (!selectedPiece || !ws || !currentRoom || currentRoom.turn !== mySide) return;

    ws.send(
      JSON.stringify({
        type: 'MAKE_MOVE',
        payload: {
          from: { x: selectedPiece.x, y: selectedPiece.y },
          to,
        },
      })
    );

    setSelectedPiece(null);
    setLegalMoves([]);
  };

  const handleOnlinePass = () => {
    if (!ws || !currentRoom || currentRoom.turn !== mySide) return;
    ws.send(JSON.stringify({ type: 'PASS_TURN' }));
    setSelectedPiece(null);
    setLegalMoves([]);
  };

  const handleOnlineResign = () => {
    if (!ws || !currentRoom || currentRoom.status !== 'PLAYING') return;
    if (window.confirm('정말 기권하시겠습니까?')) {
      ws.send(JSON.stringify({ type: 'RESIGN' }));
    }
  };

  const handleOnlineOfferDraw = () => {
    if (!ws || !currentRoom || currentRoom.status !== 'PLAYING') return;
    ws.send(JSON.stringify({ type: 'OFFER_DRAW' }));
    showToast('상대방에게 무승부를 제안했습니다.');
  };

  const handleRespondDraw = (accept: boolean) => {
    if (!ws || !currentRoom) return;
    ws.send(JSON.stringify({ type: 'RESPOND_DRAW', payload: { accept } }));
  };

  const handleSendChat = (text: string) => {
    if (!ws || !currentRoom) return;
    ws.send(JSON.stringify({ type: 'SEND_CHAT', payload: { text } }));
  };

  const handleRematch = () => {
    if (!ws || !currentRoom) return;
    ws.send(JSON.stringify({ type: 'REMATCH' }));
  };

  const handleLeaveRoom = () => {
    if (window.confirm('대국실을 나가시겠습니까?')) {
      setCurrentRoom(null);
      setMyPlayerId(null);
      setMySide(null);
      handleRefreshRooms();
    }
  };

  const handleCopyRoomCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.id);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Helper calculation for check
  const isOnlineCheck = currentRoom && currentRoom.status === 'PLAYING'
    ? isKingInCheck(currentRoom.pieces, currentRoom.turn)
    : false;

  const lastMoveData = currentRoom && currentRoom.moveHistory.length > 0
    ? currentRoom.moveHistory[currentRoom.moveHistory.length - 1]
    : null;

  return (
    <div className="min-h-screen bg-[#141210] text-stone-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl shadow-2xl text-xs sm:text-sm animate-in slide-in-from-top-2 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Top Bar - Strictly 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-4 sm:px-6 py-3 bg-[#1c1815]/95 backdrop-blur-md border-b border-stone-800">
        {/* Zone 1: Single Wordmark */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center font-bold font-serif text-stone-950 text-base shadow">
            將
          </div>
          <span className="text-lg font-bold tracking-tight text-amber-200 whitespace-nowrap shrink-0 font-serif">
            천하장기
          </span>
        </div>

        {/* Zone 2: Navigation Links (hidden on mobile, thumb nav below) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-400">
          <button
            onClick={() => { setCurrentRoom(null); setActiveTab('ONLINE'); }}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'ONLINE' ? 'text-amber-400 font-bold' : ''}`}
          >
            온라인 대국
          </button>
          <button
            onClick={() => { setCurrentRoom(null); setActiveTab('AI'); }}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'AI' ? 'text-amber-400 font-bold' : ''}`}
          >
            AI 연습
          </button>
          <button
            onClick={() => { setCurrentRoom(null); setActiveTab('LOCAL'); }}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'LOCAL' ? 'text-amber-400 font-bold' : ''}`}
          >
            오프라인 2인
          </button>
          <button
            onClick={() => setShowRulesModal(true)}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
          >
            규칙 가이드
          </button>
        </nav>

        {/* Zone 3: Quick Action Affordances */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Hanja / Hangul toggle */}
          <button
            onClick={() => setUseHangul(!useHangul)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-800 text-stone-300 hover:text-amber-300 hover:bg-stone-750 transition-colors border border-stone-700 whitespace-nowrap"
            title="기물 글씨 한자/한글 전환"
          >
            {useHangul ? '한글 기물' : '漢字 기물'}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors border border-stone-800"
            title={isMuted ? '음소거 해제' : '음소거'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Rules Guide */}
          <button
            onClick={() => setShowRulesModal(true)}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors border border-stone-800"
            title="장기 규칙 안내"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-3 sm:p-5 flex flex-col justify-start">
        {/* VIEW 1: ACTIVE ONLINE ROOM */}
        {currentRoom ? (
          <div className="flex flex-col gap-2 max-w-md mx-auto w-full pb-20">
            {/* Room Info Bar */}
            <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-stone-900/80 border border-stone-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-200 truncate max-w-[130px]">
                  {currentRoom.name}
                </span>
                <button
                  onClick={handleCopyRoomCode}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 font-mono text-[10px] text-stone-400 hover:text-stone-200"
                >
                  <span>{currentRoom.id}</span>
                  {copiedNotification ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowHistoryDrawer(true)}
                  className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg font-medium text-[11px] flex items-center gap-1"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>기보</span>
                </button>
                <button
                  onClick={handleLeaveRoom}
                  className="p-1 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-lg"
                  title="방 나가기"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Waiting for Opponent Banner */}
            {currentRoom.status === 'WAITING' && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 text-center flex flex-col items-center gap-2 my-2">
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <h4 className="font-bold text-amber-200 text-sm">상대방을 기다리는 중입니다</h4>
                <p className="text-xs text-stone-400">
                  방 코드 <strong className="text-amber-300 font-mono">{currentRoom.id}</strong>를 친구에게 알려주세요.
                </p>
                <button
                  onClick={handleCopyRoomCode}
                  className="px-3 py-1.5 bg-amber-600 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow mt-1"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>방 코드 복사하기</span>
                </button>
              </div>
            )}

            {/* Draw Offer Prompt Banner */}
            {currentRoom.drawOfferFrom && currentRoom.drawOfferFrom !== mySide && (
              <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500 flex items-center justify-between gap-2 animate-in slide-in-from-top">
                <span className="text-xs text-amber-200 font-semibold">
                  상대방이 무승부를 요청했습니다.
                </span>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRespondDraw(true)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold rounded-lg text-xs"
                  >
                    수락
                  </button>
                  <button
                    onClick={() => handleRespondDraw(false)}
                    className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-lg text-xs"
                  >
                    거절
                  </button>
                </div>
              </div>
            )}

            {/* Opponent Card (Top) */}
            {(() => {
              const oppSide: Side = mySide === 'CHO' ? 'HAN' : 'CHO';
              const oppPlayer = oppSide === 'CHO' ? currentRoom.choPlayer : currentRoom.hanPlayer;
              const oppCaptured = oppSide === 'CHO' ? currentRoom.capturedHan : currentRoom.capturedCho;
              const oppScore = oppSide === 'CHO' ? currentRoom.scores.cho : currentRoom.scores.han;

              return (
                <PlayerCard
                  side={oppSide}
                  name={oppPlayer?.name || '상대 대기 중'}
                  formation={oppPlayer?.formation || 'GWIMA'}
                  timeLeft={oppPlayer?.timeLeft || currentRoom.timeControlSeconds}
                  score={oppScore}
                  isMyTurn={currentRoom.status === 'PLAYING' && currentRoom.turn === oppSide}
                  capturedPieces={oppCaptured}
                  useHangul={useHangul}
                />
              );
            })()}

            {/* Board Container */}
            <div className="relative">
              <JanggiBoard
                pieces={currentRoom.pieces}
                selectedPiece={selectedPiece}
                legalMoves={legalMoves}
                lastMove={lastMoveData ? { from: lastMoveData.from, to: lastMoveData.to } : null}
                isCheck={isOnlineCheck}
                checkedSide={isOnlineCheck ? currentRoom.turn : null}
                flipped={mySide === 'HAN'}
                useHangul={useHangul}
                interactive={currentRoom.status === 'PLAYING' && currentRoom.turn === mySide}
                onSelectPiece={handleOnlineSelectPiece}
                onMakeMove={handleOnlineMakeMove}
              />

              {/* Game Ended Overlay */}
              {currentRoom.status === 'ENDED' && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm rounded-xl z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                  <h3 className="text-2xl font-bold font-serif text-amber-300">
                    {currentRoom.winner === 'DRAW'
                      ? '무승부'
                      : currentRoom.winner === mySide
                      ? '축하합니다! 승리하셨습니다!'
                      : '아쉽게 패배하였습니다'}
                  </h3>
                  <p className="text-stone-300 text-sm mt-1">{currentRoom.winReason}</p>
                  <div className="mt-3 text-xs text-stone-400">
                    기물 점수: 초 {currentRoom.scores.cho.toFixed(1)}점 vs 한 {currentRoom.scores.han.toFixed(1)}점
                  </div>
                  <div className="flex gap-2 mt-5">
                    <button
                      onClick={handleRematch}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm transition-colors shadow"
                    >
                      재대국 신청
                    </button>
                    <button
                      onClick={handleLeaveRoom}
                      className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl text-sm transition-colors"
                    >
                      로비로 나가기
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* My Player Card (Bottom) */}
            {(() => {
              const mySideActual: Side = mySide === 'HAN' ? 'HAN' : 'CHO';
              const myPlayer = mySideActual === 'CHO' ? currentRoom.choPlayer : currentRoom.hanPlayer;
              const myCaptured = mySideActual === 'CHO' ? currentRoom.capturedHan : currentRoom.capturedCho;
              const myScore = mySideActual === 'CHO' ? currentRoom.scores.cho : currentRoom.scores.han;

              return (
                <PlayerCard
                  side={mySideActual}
                  name={myPlayer?.name || playerName}
                  formation={myPlayer?.formation || tempFormation}
                  timeLeft={myPlayer?.timeLeft || currentRoom.timeControlSeconds}
                  score={myScore}
                  isMyTurn={currentRoom.status === 'PLAYING' && currentRoom.turn === mySideActual}
                  capturedPieces={myCaptured}
                  useHangul={useHangul}
                  isMe
                />
              );
            })()}

            {/* In-Game Action Bar */}
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              <button
                onClick={handleOnlinePass}
                disabled={currentRoom.status !== 'PLAYING' || currentRoom.turn !== mySide}
                className="py-2.5 px-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 border border-stone-800 rounded-xl text-xs font-semibold text-stone-200 flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>한수쉼</span>
              </button>

              <button
                onClick={() => setShowChatModal(true)}
                className="py-2.5 px-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-xs font-semibold text-stone-200 flex flex-col items-center justify-center gap-1 transition-colors relative"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>대국 채팅</span>
                {currentRoom.chat.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1.5 right-2" />
                )}
              </button>

              <button
                onClick={handleOnlineOfferDraw}
                disabled={currentRoom.status !== 'PLAYING' || !!currentRoom.drawOfferFrom}
                className="py-2.5 px-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 border border-stone-800 rounded-xl text-xs font-semibold text-stone-200 flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Handshake className="w-3.5 h-3.5" />
                <span>무승부 신청</span>
              </button>

              <button
                onClick={handleOnlineResign}
                disabled={currentRoom.status !== 'PLAYING'}
                className="py-2.5 px-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 border border-stone-800 rounded-xl text-xs font-semibold text-rose-300 flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>기권</span>
              </button>
            </div>
          </div>
        ) : activeTab === 'ONLINE' ? (
          /* VIEW 2: ONLINE LOBBY */
          <LobbyView
            playerName={playerName}
            onUpdatePlayerName={handleUpdatePlayerName}
            publicRooms={publicRooms}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onRefreshRooms={handleRefreshRooms}
          />
        ) : activeTab === 'AI' ? (
          /* VIEW 3: AI PRACTICE */
          <AIModeView useHangul={useHangul} onOpenRules={() => setShowRulesModal(true)} />
        ) : activeTab === 'LOCAL' ? (
          /* VIEW 4: LOCAL PASS & PLAY */
          <PassAndPlayView useHangul={useHangul} onOpenRules={() => setShowRulesModal(true)} />
        ) : (
          /* VIEW 5: RULES TAB */
          <div className="max-w-xl mx-auto w-full pb-20">
            <RulesGuideModal isOpen={true} onClose={() => setActiveTab('ONLINE')} />
          </div>
        )}
      </main>

      {/* Fixed Bottom Tab Bar - Mobile Ergonomic Thumb Zone */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1c1815]/95 backdrop-blur-md border-t border-stone-800">
        <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto px-2">
          <button
            onClick={() => { setCurrentRoom(null); setActiveTab('ONLINE'); }}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'ONLINE' ? 'text-amber-400' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[11px] font-medium tracking-tight mt-1">온라인 대국</span>
          </button>

          <button
            onClick={() => { setCurrentRoom(null); setActiveTab('AI'); }}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'AI' ? 'text-amber-400' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Bot className="w-5 h-5" />
            <span className="text-[11px] font-medium tracking-tight mt-1">AI 연습</span>
          </button>

          <button
            onClick={() => { setCurrentRoom(null); setActiveTab('LOCAL'); }}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'LOCAL' ? 'text-amber-400' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Gamepad2 className="w-5 h-5" />
            <span className="text-[11px] font-medium tracking-tight mt-1">오프라인 2인</span>
          </button>

          <button
            onClick={() => setShowRulesModal(true)}
            className="flex flex-col items-center justify-center h-full text-stone-400 hover:text-stone-200 transition-colors"
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[11px] font-medium tracking-tight mt-1">장기 가이드</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <FormationModal
        isOpen={showFormationModal}
        currentFormation={tempFormation}
        side={mySide === 'HAN' ? 'HAN' : 'CHO'}
        useHangul={useHangul}
        onSelect={setTempFormation}
        onConfirm={handleConfirmFormation}
      />

      <QuickChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        onSend={handleSendChat}
      />

      <MoveHistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        moves={currentRoom?.moveHistory || []}
        winner={currentRoom?.winner || null}
        winReason={currentRoom?.winReason || null}
      />

      <RulesGuideModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
}
