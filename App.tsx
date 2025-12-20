import React, { useState, useEffect, useCallback } from 'react';
import { BotSettings, LogEntry, Platform, ChartDataPoint, Language } from './types';
import { generatePromoContent } from './services/geminiService';
import { ActivityChart } from './components/ActivityChart';
import { PromotionLog } from './components/PromotionLog';
import { 
  Bot, 
  Play, 
  Square, 
  Settings2, 
  Zap, 
  Globe, 
  Wallet,
  Terminal,
  Activity,
  Languages
} from 'lucide-react';

const INITIAL_SETTINGS: BotSettings = {
  contractAddress: "0xf1094ca0c4b2EF11b9fCd36550ac322A39E666F1",
  referralAddress: "0xC8F76B6719615A9F829A9f7035791798cc182927",
  intervalMin: 3, // Seconds (for demo purposes, instead of hours)
  intervalMax: 8  // Seconds
};

const TRANSLATIONS = {
  en: {
    appTitle: "VTF AutoBot",
    appSubtitle: "Autonomous Promotion",
    status: "Status",
    statusRunning: "RUNNING",
    statusStopped: "STOPPED",
    nextPostIn: "Next post in",
    contractAddr: "Contract Address",
    referralAddr: "Referral Address",
    startBot: "Start Bot",
    stopBot: "Stop Bot",
    logPath: "/var/log/vtf-bot/active.log",
    totalReach: "Total Reach",
    posts: "Posts",
    metricsTitle: "Live Engagement Metrics",
    logTitle: "Execution Log"
  },
  zh: {
    appTitle: "VTF 自动推广",
    appSubtitle: "智能自动营销机器人",
    status: "运行状态",
    statusRunning: "运行中",
    statusStopped: "已停止",
    nextPostIn: "下次发布倒计时",
    contractAddr: "合约地址",
    referralAddr: "推荐地址",
    startBot: "开始推广",
    stopBot: "停止推广",
    logPath: "/var/log/vtf-bot/active_zh.log",
    totalReach: "总覆盖人数",
    posts: "已发布",
    metricsTitle: "实时互动数据",
    logTitle: "执行日志"
  }
};

const App: React.FC = () => {
  // State
  const [language, setLanguage] = useState<Language>('zh');
  const [isRunning, setIsRunning] = useState(false);
  const [settings, setSettings] = useState<BotSettings>(INITIAL_SETTINGS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [nextRunTime, setNextRunTime] = useState<number | null>(null);
  const [totalReach, setTotalReach] = useState(0);

  const t = TRANSLATIONS[language];

  // Helper to generate chart data based on logs
  const updateStats = useCallback((engagement: number) => {
    setTotalReach(prev => prev + engagement);
    
    setChartData(prev => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const newPoint: ChartDataPoint = {
        time: timeStr,
        reach: engagement,
        actions: 1
      };
      
      // Keep last 10 points
      const newData = [...prev, newPoint];
      if (newData.length > 10) newData.shift();
      return newData;
    });
  }, []);

  // The "Bot" Logic
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const runBotCycle = async () => {
      if (!isRunning) return;

      // 1. Generate Content (pass current language)
      const content = await generatePromoContent(settings, language);
      
      // 2. Select Random Platform
      const platforms = [Platform.Twitter, Platform.Reddit, Platform.Telegram, Platform.Discord];
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      
      // 3. Simulate Engagement
      const engagement = Math.floor(Math.random() * 500) + 50;

      // 4. Create Log Entry
      const newLog: LogEntry = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        platform,
        content,
        status: 'Success',
        engagement
      };

      setLogs(prev => [...prev, newLog]);
      updateStats(engagement);

      // 5. Schedule Next Run
      const delay = Math.floor(Math.random() * (settings.intervalMax - settings.intervalMin + 1) + settings.intervalMin) * 1000;
      setNextRunTime(Date.now() + delay);
      
      timeoutId = setTimeout(runBotCycle, delay);
    };

    if (isRunning) {
      // Start immediately on first toggle
      if (!nextRunTime) {
         runBotCycle();
      } else {
         // Resume if paused (simplified logic: just restart cycle)
         runBotCycle();
      }
    } else {
      setNextRunTime(null);
    }

    return () => clearTimeout(timeoutId);
  }, [isRunning, settings, updateStats, language]); // Added language dependency to regenerate with new lang if running


  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar / Configuration */}
      <aside className="w-full md:w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 z-10 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 text-cyan-400">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Bot size={28} />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-white">{t.appTitle}</h1>
              <p className="text-xs text-slate-500">{t.appSubtitle}</p>
            </div>
          </div>
          <button 
            onClick={() => setLanguage(l => l === 'en' ? 'zh' : 'en')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Switch Language"
          >
            <Languages size={20} />
            <span className="sr-only">Switch Language</span>
          </button>
        </div>

        {/* Status Card */}
        <div className={`p-4 rounded-xl border ${isRunning ? 'bg-cyan-950/30 border-cyan-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-slate-300">{t.status}</span>
            <div className={`flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-bold ${isRunning ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/20 text-slate-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`} />
              {isRunning ? t.statusRunning : t.statusStopped}
            </div>
          </div>
          {isRunning && nextRunTime && (
            <div className="text-xs text-cyan-300 font-mono mt-2">
               {t.nextPostIn}: {Math.max(0, Math.ceil((nextRunTime - Date.now()) / 1000))}s
            </div>
          )}
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-2">
              <Wallet size={12} /> {t.contractAddr}
            </label>
            <input 
              type="text" 
              value={settings.contractAddress}
              onChange={(e) => setSettings({...settings, contractAddress: e.target.value})}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-2">
              <Globe size={12} /> {t.referralAddr}
            </label>
            <input 
              type="text" 
              value={settings.referralAddress}
              onChange={(e) => setSettings({...settings, referralAddress: e.target.value})}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Start/Stop Button */}
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`w-full mt-auto py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-bold transition-all duration-200 transform active:scale-95 ${
            isRunning 
            ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20' 
            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/50'
          }`}
        >
          {isRunning ? (
            <>
              <Square size={18} fill="currentColor" /> {t.stopBot}
            </>
          ) : (
            <>
              <Play size={18} fill="currentColor" /> {t.startBot}
            </>
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header Stats */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 text-slate-400">
            <Terminal size={18} />
            <span className="font-mono text-sm">{t.logPath}</span>
          </div>
          <div className="flex gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{t.totalReach}</span>
              <span className="text-lg font-bold text-white font-mono">{totalReach.toLocaleString()}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{t.posts}</span>
              <span className="text-lg font-bold text-white font-mono">{logs.length}</span>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-rows-[auto_1fr] gap-6">
          
          {/* Top Row: Analytics */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Activity size={100} />
             </div>
             <h2 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
               <Zap size={16} className="text-yellow-500" /> {t.metricsTitle}
             </h2>
             <ActivityChart data={chartData} />
          </section>

          {/* Bottom Row: Terminal Log */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-0 shadow-sm flex flex-col overflow-hidden min-h-[300px]">
             <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                  <Settings2 size={16} className="text-purple-500" /> {t.logTitle}
                </h2>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto bg-slate-950/50 p-2 scrollbar-hide">
               <PromotionLog logs={logs} language={language} />
             </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default App;