import React, { useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';

interface QuickChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
}

export const QUICK_PHRASES = [
  '안녕하세요! 한 수 지도 부탁드립니다.',
  '좋은 수네요! 감탄했습니다.',
  '잠시 생각 중입니다.',
  '실수했습니다. 아차!',
  '한수 쉬겠습니다.',
  '좋은 승부였습니다. 수고하셨습니다!',
  '한 판 더 하시겠습니까?',
  '감사합니다!',
];

export const QuickChatModal: React.FC<QuickChatModalProps> = ({
  isOpen,
  onClose,
  onSend,
}) => {
  const [customText, setCustomText] = useState('');

  if (!isOpen) return null;

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    onSend(customText.trim());
    setCustomText('');
    onClose();
  };

  const handleSelectPhrase = (phrase: string) => {
    onSend(phrase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4 text-stone-100 max-h-[85vh]">
        <div className="flex items-center justify-between pb-2 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-stone-100">빠른 대국 채팅</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phrases List */}
        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-56 pr-1">
          {QUICK_PHRASES.map((phrase, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPhrase(phrase)}
              className="text-left px-3 py-2.5 rounded-xl bg-stone-800/70 hover:bg-stone-800 border border-stone-700/50 text-xs sm:text-sm text-stone-200 hover:text-amber-300 transition-colors active:scale-[0.98]"
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <form onSubmit={handleSendCustom} className="flex gap-2 pt-2 border-t border-stone-800">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="직접 메시지 입력..."
            maxLength={60}
            className="flex-1 px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm transition-colors flex items-center gap-1 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>전송</span>
          </button>
        </form>
      </div>
    </div>
  );
};
