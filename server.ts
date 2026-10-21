import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
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
} from './src/engine/janggi.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

interface PlayerState {
  id: string;
  name: string;
  formation: FormationType;
  isReady: boolean;
  timeLeft: number; // in seconds
  connected: boolean;
}

interface ChatMessage {
  id: string;
  senderName: string;
  senderSide: Side | 'SPECTATOR';
  text: string;
  timestamp: number;
}

interface MoveRecord {
  from: Position | null;
  to: Position | null;
  side: Side;
  notation: string;
  isPass?: boolean;
}

interface Room {
  id: string;
  name: string;
  status: 'WAITING' | 'FORMATION_SELECT' | 'PLAYING' | 'ENDED';
  timeControlSeconds: number; // e.g. 600 (10 mins)
  choPlayer: PlayerState | null;
  hanPlayer: PlayerState | null;
  spectators: { id: string; name: string }[];
  pieces: Piece[];
  turn: Side;
  moveHistory: MoveRecord[];
  capturedCho: Piece[]; // pieces lost by Cho
  capturedHan: Piece[]; // pieces lost by Han
  winner: Side | 'DRAW' | null;
  winReason: string | null;
  chat: ChatMessage[];
  drawOfferFrom: Side | null;
  lastTurnStartTime: number;
}

const rooms = new Map<string, Room>();
const clientRooms = new Map<WebSocket, { roomId: string; playerId: string }>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `JG-${id}`;
}

function broadcastToRoom(room: Room, type: string, payload: unknown) {
  const message = JSON.stringify({ type, payload });
  for (const [ws, data] of clientRooms.entries()) {
    if (data.roomId === room.id && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

function getSanitizedRoom(room: Room) {
  const scores = calculateMaterialScore(room.pieces);
  return {
    id: room.id,
    name: room.name,
    status: room.status,
    timeControlSeconds: room.timeControlSeconds,
    choPlayer: room.choPlayer,
    hanPlayer: room.hanPlayer,
    spectatorCount: room.spectators.length,
    pieces: room.pieces,
    turn: room.turn,
    moveHistory: room.moveHistory,
    capturedCho: room.capturedCho,
    capturedHan: room.capturedHan,
    scores,
    winner: room.winner,
    winReason: room.winReason,
    chat: room.chat.slice(-50),
    drawOfferFrom: room.drawOfferFrom,
  };
}

function getPublicRoomsList() {
  const list = [];
  for (const room of rooms.values()) {
    list.push({
      id: room.id,
      name: room.name,
      status: room.status,
      choName: room.choPlayer?.name || null,
      hanName: room.hanPlayer?.name || null,
      spectatorCount: room.spectators.length,
    });
  }
  return list;
}

// Timer tick every 1000ms
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.status === 'PLAYING') {
      const activePlayer = room.turn === 'CHO' ? room.choPlayer : room.hanPlayer;
      if (activePlayer && activePlayer.timeLeft > 0) {
        activePlayer.timeLeft -= 1;
        if (activePlayer.timeLeft <= 0) {
          activePlayer.timeLeft = 0;
          room.status = 'ENDED';
          room.winner = room.turn === 'CHO' ? 'HAN' : 'CHO';
          room.winReason = '시간패 (Time Out)';
          broadcastToRoom(room, 'ROOM_UPDATE', getSanitizedRoom(room));
          continue;
        }
      }
      // Broadcast time update every 2 seconds or on low time
      if (activePlayer && (activePlayer.timeLeft <= 10 || now % 2000 < 1000)) {
        broadcastToRoom(room, 'TIME_UPDATE', {
          choTime: room.choPlayer?.timeLeft ?? 0,
          hanTime: room.hanPlayer?.timeLeft ?? 0,
        });
      }
    }
  }
}, 1000);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(express.json());

  // API Health and stats
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size, timestamp: Date.now() });
  });

  // REST API for room list fallback
  app.get('/api/rooms', (req, res) => {
    res.json(getPublicRoomsList());
  });

  wss.on('connection', (ws) => {
    // Send immediate initial room list
    ws.send(JSON.stringify({ type: 'ROOMS_LIST', payload: getPublicRoomsList() }));

    ws.on('message', (raw) => {
      try {
        const { type, payload } = JSON.parse(raw.toString());

        switch (type) {
          case 'LIST_ROOMS': {
            ws.send(JSON.stringify({ type: 'ROOMS_LIST', payload: getPublicRoomsList() }));
            break;
          }

          case 'CREATE_ROOM': {
            const { name, timeControlSeconds, playerName, side = 'CHO', formation = 'GWIMA' } = payload || {};
            const roomId = generateRoomId();

            const player: PlayerState = {
              id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: playerName?.trim() || '대국자 1',
              formation: formation || 'GWIMA',
              isReady: false,
              timeLeft: timeControlSeconds || 600,
              connected: true,
            };

            const newRoom: Room = {
              id: roomId,
              name: name?.trim() || `${player.name}님의 대국실`,
              status: 'WAITING',
              timeControlSeconds: timeControlSeconds || 600,
              choPlayer: side === 'CHO' ? player : null,
              hanPlayer: side === 'HAN' ? player : null,
              spectators: [],
              pieces: [],
              turn: 'CHO',
              moveHistory: [],
              capturedCho: [],
              capturedHan: [],
              winner: null,
              winReason: null,
              chat: [
                {
                  id: 'system_init',
                  senderName: '시스템',
                  senderSide: 'SPECTATOR',
                  text: '장기 대국실이 생성되었습니다. 상대방의 입장을 기다리는 중입니다.',
                  timestamp: Date.now(),
                },
              ],
              drawOfferFrom: null,
              lastTurnStartTime: Date.now(),
            };

            rooms.set(roomId, newRoom);
            clientRooms.set(ws, { roomId, playerId: player.id });

            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              payload: {
                room: getSanitizedRoom(newRoom),
                myPlayerId: player.id,
                mySide: side,
              },
            }));

            // Notify everyone of updated room list
            for (const client of wss.clients) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'ROOMS_LIST', payload: getPublicRoomsList() }));
              }
            }
            break;
          }

          case 'JOIN_ROOM': {
            const { roomId, playerName, formation = 'GWIMA' } = payload || {};
            const room = rooms.get(roomId);
            if (!room) {
              ws.send(JSON.stringify({ type: 'ERROR', payload: '해당 대국실을 찾을 수 없습니다.' }));
              return;
            }

            const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const pName = playerName?.trim() || '도전자';
            let mySide: Side | 'SPECTATOR' = 'SPECTATOR';

            if (!room.choPlayer) {
              room.choPlayer = {
                id: playerId,
                name: pName,
                formation,
                isReady: false,
                timeLeft: room.timeControlSeconds,
                connected: true,
              };
              mySide = 'CHO';
            } else if (!room.hanPlayer) {
              room.hanPlayer = {
                id: playerId,
                name: pName,
                formation,
                isReady: false,
                timeLeft: room.timeControlSeconds,
                connected: true,
              };
              mySide = 'HAN';
            } else {
              // Spectator
              room.spectators.push({ id: playerId, name: pName });
              mySide = 'SPECTATOR';
            }

            clientRooms.set(ws, { roomId, playerId });

            // If both players are present and room was waiting, move to formation select
            if (room.choPlayer && room.hanPlayer && room.status === 'WAITING') {
              room.status = 'FORMATION_SELECT';
              room.chat.push({
                id: `sys_${Date.now()}`,
                senderName: '시스템',
                senderSide: 'SPECTATOR',
                text: `${room.choPlayer.name}님(초)과 ${room.hanPlayer.name}님(한)이 입장했습니다. 포진을 선택해주세요.`,
                timestamp: Date.now(),
              });
            }

            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              payload: {
                room: getSanitizedRoom(room),
                myPlayerId: playerId,
                mySide,
              },
            }));

            broadcastToRoom(room, 'ROOM_UPDATE', getSanitizedRoom(room));
            break;
          }

          case 'UPDATE_FORMATION': {
            const clientInfo = clientRooms.get(ws);
            if (!clientInfo) return;
            const room = rooms.get(clientInfo.roomId);
            if (!room) return;

            const { formation } = payload || {};
            if (room.choPlayer?.id === clientInfo.playerId) {
              room.choPlayer.formation = formation;
            } else if (room.hanPlayer?.id === clientInfo.playerId) {
              room.hanPlayer.formation = formation;
            }

            broadcastToRoom(room, 'ROOM_UPDATE', getSanitizedRoom(room));
            break;
          }

          case 'START_GAME': {
            const clientInfo = clientRooms.get(ws);
            if (!clientInfo) return;
            const room = rooms.get(clientInfo.roomId);
            if (!room) return;

            if (room.choPlayer?.id === clientInfo.playerId) {
              room.choPlayer.isReady = true;
            } else if (room.hanPlayer?.id === clientInfo.playerId) {
              room.hanPlayer.isReady = true;
            }

            // If both are ready, start!
            if (room.choPlayer?.isReady && room.hanPlayer?.isReady) {
              room.pieces = createInitialBoard(room.choPlayer.formation, room.hanPlayer.formation);
              room.status = 'PLAYING';
              room.turn = 'CHO'; // Cho always moves first in Korean Janggi
              room.lastTurnStartTime = Date.now();
              room.chat.push({
                id: `sys_start_${Date.now()}`,
                senderName: '시스템',
                senderSide: 'SPECTATOR',
                text: '대국이 시작되었습니다! 초(楚)의 선공입니다.',
                timestamp: Date.now(),
              });
            }

            broadcastToRoom(room, 'ROOM_UPDATE', getSanitizedRoom(room));
            break;
          }

          case 'MAKE_MOVE': {
            const clientInfo = clientRooms.get(ws);
            if (!clientInfo) return;
            const room = rooms.get(clientInfo.roomId);
            if (!room || room.status !== 'PLAYING') return;

            const isChoTurn = room.turn === 'CHO';
            const expectedPlayerId = isChoTurn ? room.choPlayer?.id : room.hanPlayer?.id;
            if (clientInfo.playerId !== expectedPlayerId) {
              ws.send(JSON.stringify({ type: 'ERROR', payload: '자신의 차례가 아닙니다.' }));
              return;
            }

            const { from, to } = payload || {};
            const movingPiece = getPieceAt(room.pieces, from.x, from.y);
            if (!movingPiece || movingPiece.side !== room.turn) {
              ws.send(JSON.stringify({ type: 'ERROR', payload: '올바른 기물이 아닙니다.' }));
              return;
            }

            const legalMoves = getLegalMovesForPiece(movingPiece, room.pieces);
            const isValid = legalMoves.some((m) => m.x === to.x && m.y === to.y);
            if (!isValid) {
              ws.send(JSON.stringify({ type: 'ERROR', payload: '이동할 수 없는 위치입니다.' }));
              return;
            }

            // Capture target piece if exists
            const captured = getPieceAt(room.pieces, to.x, to.y);
            if (captured) {
              if (captured.side === 'CHO') {
                room.capturedCho.push(captured);
              } else {
                room.capturedHan.push(captured);
              }
            }

            // Move piece
            room.pieces = room.pieces
              .filter((p) => !(p.x === to.x && p.y === to.y))
              .map((p) => (p.id === movingPiece.id ? { ...p, x: to.x, y: to.y } : p));

            const notation = formatJanggiNotation({
              from,
              to,
              piece: movingPiece,
            });

            room.moveHistory.push({
              from,
              to,
              side: room.turn,
              notation,
            });

            // Switch turn
            const nextSide: Side = room.turn === 'CHO' ? 'HAN' : 'CHO';
            room.turn = nextSide;
            room.lastTurnStartTime = Date.now();

            // Check if next player King captured or checkmated
            const nextKing = room.pieces.find((p) => p.side === nextSide && p.type === 'KING');
            if (!nextKing) {
              room.status = 'ENDED';
              room.winner = room.turn === 'CHO' ? 'HAN' : 'CHO';
              room.winReason = '궁 포획 (King Captured)';
            } else {
              const inCheck = isKingInCheck(room.pieces, nextSide);
              const hasMoves = hasAnyLegalMoves(room.pieces, nextSide);
              if (inCheck && !hasMoves) {
                room.status = 'ENDED';
                room.winner = room.turn === 'CHO' ? 'HAN' : 'CHO';
                room.winReason = '외통승 (Checkmate)';
              } else if (inCheck) {
                room.chat.push({
                  id: `sys_check_${Date.now()}`,
                  senderName: '시스템',
                  senderSide: 'SPECTATOR',
                  text: '장군!',
                  timestamp: Date.now(),
                });
              }
            }

            broadcastToRoom(room, 'ROOM_UPDATE', getSanitizedRoom(room));
            break;
          }

          case 'PASS_TURN': {
            const clientInfo = clientRooms.get(ws);
            if (!clientInfo) return;
            const room = rooms.get(clientInfo.roomId);
            if (!room || room.status !== 'PLAYING') return;

            const isChoTurn = room.turn === 'CHO';
            const expectedPlayerId = isChoTurn ? room.choPlayer?.id : room.hanPlayer?.id;
            if (clientInfo.playerId !== expectedPlayerId) return;

            room.moveHistory.push({
              from: null,
              to: null,
              side: room.turn,
              notation: '한수쉼',
              isPass: true,
            });

            room.turn = room.turn === 'CHO' ? 'HAN' : 'CHO';
            room.lastTurnStartTime = Date.now();

            room.chat.push({
              id: `sys_pass_${Date.now()}`,
              senderName: '시스템',
              senderSide: 'SPECTATOR',
              text: `${isChoTurn ? '초' : '한'}에서 한수 쉬었습니다.`,
              timestamp: Date.now(),
            });

            broadcastToRoom(room, 'ROOM_UPDATE', getSanitizedRoom(room));
            break;
          }

          case 'RESIGN': {
            const clientInfo = clientRooms.get(ws);
            if (!clientInfo) return;
            const room = rooms.get(clientInfo.roomId);
            if (!room || room.status !== 'PLAYING') return;

            const isCho = room.choPlayer?.id === clientInfo.playerId;
            const isHan = room.hanPlayer?.id === clientInfo.playerId;
            if (!isCho && !isHan) return;

            room.status = 'ENDED';
            room.winner = isCho ? 'HAN' : 'CHO';
            room.winReason = '기권승 (Resignation)';

            room.chat.push({
              id: `sys_resign_${Date.now()}`,
              senderName: '시스템',
              senderSide: 'SPECTATOR',
              text: `${isCho ? room.choPlayer?.name : room.hanPlayer?.name}님이 기권하였습니다.`,
              timestamp: Date.now(),
            });

            broadcastToRoom(room, 'ROOM_UPDATE', getSanitizedRoom(room));
            break;
          }

          case 'OFFER_DRAW': {
            const clientInfo = clientRooms.get(ws);
            if (!clientInfo) return;
            const room = rooms.get(clientInfo.roomId);
            if (!room || room.status !== 'PLAYING') return;

            const side: Side | null =
              room.choPlayer?.id === clientInfo.playerId
                ? 'CHO'
                : room.hanPlayer?.id === clientInfo.playerId
                ? 'HAN'
                : null;
            if (!side) return;

            room.drawOfferFrom = side;
            room.chat.push({
              id: `sys_draw_${Date.now()}`,
              senderName: '시스템',
              senderSide: 'SPECTATOR',
              text: `${side === 'CHO' ? room.choPlayer?.name : room.hanPlayer?.name}님이 무승부를 제안했습니다.`,
              timestamp: Date.now(),
            });

            broadcastToRoom(room, 'ROOM_UPDATE', getSanitizedRoom(room));
            break;
          }

          case 'RESPOND_DRAW': {
            const clientInfo = clientRooms.get(ws);
            if (!clientInfo) return;
            const room = rooms.get(clientInfo.roomId);
            if (!room || room.status !== 'PLAYING' || !room.drawOfferFrom) return;

            const { accept } = payload || {};
            if (accept) {
              room.status = 'ENDED';
              room.winner = 'DRAW';
              room.winReason = '무승부 합의 (Mutual Draw)';
              room.drawOfferFrom = null;
              room.chat.push({
                id: `sys_draw_acc_${Date.now()}`,
                senderName: '시스템',
                senderSide: 'SPECTATOR',
                text: '양 대국자가 무승부에 합의하였습니다.',
                timestamp: Date.now(),
              });
            } else {
              room.drawOfferFrom = null;
              room.chat.push({
                id: `sys_draw_rej_${Date.now()}`,
                senderName: '시스템',
                senderSide: 'SPECTATOR',
                text: '무승부 제안이 거절되었습니다.',
                timestamp: Date.now(),
              });
            }

            broadcastToRoom(room, 'ROOM_UPDATE', getSanitizedRoom(room));
            break;
          }

          case 'SEND_CHAT': {
            const clientInfo = clientRooms.get(ws);
            if (!clientInfo) return;
            const room = rooms.get(clientInfo.roomId);
            if (!room) return;

            const { text } = payload || {};
            if (!text || typeof text !== 'string') return;

            let senderName = '관전자';
            let senderSide: Side | 'SPECTATOR' = 'SPECTATOR';

            if (room.choPlayer?.id === clientInfo.playerId) {
              senderName = room.choPlayer.name;
              senderSide = 'CHO';
            } else if (room.hanPlayer?.id === clientInfo.playerId) {
              senderName = room.hanPlayer.name;
              senderSide = 'HAN';
            } else {
              const spec = room.spectators.find((s) => s.id === clientInfo.playerId);
              if (spec) senderName = spec.name;
            }

            room.chat.push({
              id: `chat_${Date.now()}_${Math.random()}`,
              senderName,
              senderSide,
              text: text.slice(0, 100),
              timestamp: Date.now(),
            });

            broadcastToRoom(room, 'CHAT_UPDATE', { chat: room.chat.slice(-50) });
            break;
          }

          case 'REMATCH': {
            const clientInfo = clientRooms.get(ws);
            if (!clientInfo) return;
            const room = rooms.get(clientInfo.roomId);
            if (!room || room.status !== 'ENDED') return;

            // Reset game
            if (room.choPlayer) {
              room.choPlayer.isReady = false;
              room.choPlayer.timeLeft = room.timeControlSeconds;
            }
            if (room.hanPlayer) {
              room.hanPlayer.isReady = false;
              room.hanPlayer.timeLeft = room.timeControlSeconds;
            }
            room.status = 'FORMATION_SELECT';
            room.winner = null;
            room.winReason = null;
            room.moveHistory = [];
            room.capturedCho = [];
            room.capturedHan = [];
            room.drawOfferFrom = null;

            room.chat.push({
              id: `sys_rematch_${Date.now()}`,
              senderName: '시스템',
              senderSide: 'SPECTATOR',
              text: '재대국이 준비되었습니다. 포진을 확인하고 준비를 눌러주세요.',
              timestamp: Date.now(),
            });

            broadcastToRoom(room, 'ROOM_UPDATE', getSanitizedRoom(room));
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      const clientInfo = clientRooms.get(ws);
      if (clientInfo) {
        const room = rooms.get(clientInfo.roomId);
        if (room) {
          if (room.choPlayer?.id === clientInfo.playerId) {
            room.choPlayer.connected = false;
          } else if (room.hanPlayer?.id === clientInfo.playerId) {
            room.hanPlayer.connected = false;
          } else {
            room.spectators = room.spectators.filter((s) => s.id !== clientInfo.playerId);
          }
          broadcastToRoom(room, 'ROOM_UPDATE', getSanitizedRoom(room));
        }
        clientRooms.delete(ws);
      }
    });
  });

  // Mount Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
