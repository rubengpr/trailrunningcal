'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';

export function OpenAIPlayground() {
  const t = useTranslations('playground');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    // TODO: wire up OpenAI API call
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  return (
    <div className='flex flex-1 items-center justify-center'>
      <div className='w-full max-w-2xl'>
        <div className='flex gap-2 items-end'>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={t('inputPlaceholder')}
            rows={3}
            className='flex-1 resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-gray-500 focus:outline-none'
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className='rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {t('send')}
          </button>
        </div>
      </div>
    </div>
  );
}
