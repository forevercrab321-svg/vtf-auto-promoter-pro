import React, { useEffect, useRef } from 'react';
import { LogEntry, Platform, Language } from '../types';
import { Twitter, Send, MessageCircle, Share2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface PromotionLogProps {
  logs: LogEntry[];
  language?: Language;
}

const PlatformIcon = ({ platform }: { platform: Platform }) => {
  switch (platform) {
    case Platform.Twitter: return <Twitter size={16} className="text-sky-400" />;
    case Platform.Telegram: return <Send size={16} className="text-blue-400" />;
    case Platform.Reddit: return <MessageCircle size={16} className="text-orange-500" />;
    case Platform.Discord: return <Share2 size={16} className="text-indigo-400" />;
    default: return <Share2 size={16} className="text-gray-400" />;
  }
};

export const PromotionLog: React.FC<PromotionLogProps> = ({ logs, language = 'zh' }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const t = {
    waiting: language === 'zh' ? "等待机器人启动..." : "Waiting for bot to start...",
    contract: language === 'zh' ? "合约:" : "Contract:",
    views: language === 'zh' ? "浏览" : "Views"
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Clock size={48} className="mb-4 opacity-50" />
        <p>{t.waiting}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-2">
      {logs.map((log) => (
        <div 
          key={log.id} 
          className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 transition-all duration-300 hover:bg-slate-800 hover:border-slate-600 animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <PlatformIcon platform={log.platform} />
              <span className="text-sm font-semibold text-slate-200">{log.platform}</span>
              <span className="text-xs text-slate-500 font-mono">
                {log.timestamp.toLocaleTimeString([], { hour12: false })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {log.status === 'Success' ? (
                <CheckCircle2 size={14} className="text-green-500" />
              ) : (
                <AlertCircle size={14} className="text-red-500" />
              )}
              <span className={`text-xs ${log.status === 'Success' ? 'text-green-500' : 'text-red-500'}`}>
                {log.status}
              </span>
            </div>
          </div>
          
          <div className="bg-slate-900/50 rounded p-3 mb-2 font-mono text-xs text-slate-300 border-l-2 border-slate-700 break-words whitespace-pre-wrap">
            {log.content}
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400">
             <span>{t.contract} ...{log.content.includes('0x') ? log.content.split('0x')[1].substring(0,6) : 'N/A'}</span>
             <span className="text-cyan-400 font-bold">+{log.engagement} {t.views}</span>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};