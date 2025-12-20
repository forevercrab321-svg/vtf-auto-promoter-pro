export type Language = 'en' | 'zh';

export interface BotSettings {
  contractAddress: string;
  referralAddress: string;
  intervalMin: number; // in seconds for simulation speed
  intervalMax: number; // in seconds for simulation speed
}

export enum Platform {
  Twitter = 'Twitter',
  Reddit = 'Reddit',
  Telegram = 'Telegram',
  Discord = 'Discord'
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  platform: Platform;
  content: string;
  status: 'Pending' | 'Success' | 'Failed';
  engagement: number; // Simulated reach/views
}

export interface ChartDataPoint {
  time: string;
  reach: number;
  actions: number;
}