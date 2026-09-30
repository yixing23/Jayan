import React from 'react';
import { ScheduleDataset, SchedulerMetrics } from '../types';

export type MainTab = 'data-prep' | 'scheduling' | 'timetable';

interface HeaderProps {
  currentTab: MainTab;
  setCurrentTab: (tab: MainTab) => void;
  onOpenAiAdvisor: () => void;
  onOpenDiagnostics: () => void;
  dataset: ScheduleDataset;
  metrics: SchedulerMetrics;
  conflictCount: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onOpenCloudSync?: () => void;
  syncCode?: string | null;
  autoSyncEnabled?: boolean;
  onToggleAutoSync?: () => void;
  syncStatus?: 'synced' | 'syncing' | 'unsaved' | 'idle' | 'error';
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAiAdvisor,
  onOpenDiagnostics,
  metrics,
  conflictCount,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onOpenCloudSync,
  syncCode,
  autoSyncEnabled = false,
  onToggleAutoSync,
  syncStatus = 'synced',
}) => {
  return (
    <header className="border-b-[2px] border-[#1A1A1A] bg-[#FDFCFB] px-6 lg:px-8 py-3 flex flex-col lg:flex-row items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
      {/* Brand & Main Nav */}
      <div className="flex items-center gap-8 w-full lg:w-auto shrink-0">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block mb-0.5">
            Core Scheduling System
          </span>
          <h1 className="text-xl font-serif italic font-bold text-[#1A1A1A] tracking-tight">
            新知 THE WISSEN
          </h1>
        </div>

        {/* Main Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setCurrentTab('data-prep')}
            className={`py-1.5 transition-all flex items-center gap-1.5 border-b-2 ${
              currentTab === 'data-prep'
                ? 'text-[#1A1A1A] border-[#1A1A1A]'
                : 'text-neutral-500 hover:text-[#1A1A1A] border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-base">database</span>
            1. 数据准备
          </button>
          <button
            onClick={() => setCurrentTab('scheduling')}
            className={`py-1.5 transition-all flex items-center gap-1.5 border-b-2 ${
              currentTab === 'scheduling'
                ? 'text-[#1A1A1A] border-[#1A1A1A]'
                : 'text-neutral-500 hover:text-[#1A1A1A] border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-base">psychology</span>
            2. 智能排课
          </button>
          <button
            onClick={() => setCurrentTab('timetable')}
            className={`py-1.5 transition-all flex items-center gap-1.5 border-b-2 ${
              currentTab === 'timetable'
                ? 'text-[#1A1A1A] border-[#1A1A1A]'
                : 'text-neutral-500 hover:text-[#1A1A1A] border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-base">calendar_view_week</span>
            3. 课表大盘
          </button>
        </nav>
      </div>

      {/* Right Tools Area */}
      <div className="flex items-center gap-3 w-full lg:w-auto justify-end shrink-0 flex-wrap text-xs">
        
        {/* Undo / Redo */}
        {onUndo && onRedo && (
          <div className="flex items-center gap-1 bg-neutral-100 rounded-none border border-[#1A1A1A] px-1 py-0.5 shadow-2xs">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1 transition-colors ${
                canUndo ? 'text-[#1A1A1A] hover:bg-neutral-200 cursor-pointer' : 'text-neutral-300 cursor-not-allowed'
              }`}
              title="撤销"
            >
              <span className="material-symbols-outlined text-sm block">undo</span>
            </button>
            <div className="w-[1px] h-3 bg-[#1A1A1A]"></div>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1 transition-colors ${
                canRedo ? 'text-[#1A1A1A] hover:bg-neutral-200 cursor-pointer' : 'text-neutral-300 cursor-not-allowed'
              }`}
              title="重做"
            >
              <span className="material-symbols-outlined text-sm block">redo</span>
            </button>
          </div>
        )}

        {/* Diagnostics & AI */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#1A1A1A] text-[#1A1A1A] font-bold hover:bg-neutral-100 transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">health_and_safety</span>
            <span>冲突诊断</span>
            {conflictCount > 0 && (
              <span className="bg-red-700 text-white px-1.5 py-0.5 text-[10px] font-bold ml-1">{conflictCount}</span>
            )}
          </button>

          <button
            onClick={onOpenAiAdvisor}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-800 text-amber-900 font-bold hover:bg-amber-100 transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            <span>AI 顾问</span>
          </button>
        </div>

        {/* Cloud Sync Tool */}
        {onOpenCloudSync && (
          <button
            onClick={onOpenCloudSync}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white font-bold hover:bg-neutral-800 transition-colors shadow-2xs"
            title="云端同步"
          >
            <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
            <span>云同步</span>
            {syncStatus === 'syncing' ? (
              <span className="w-1.5 h-1.5 rounded-none bg-amber-500 animate-ping ml-1"></span>
            ) : syncStatus === 'unsaved' ? (
              <span className="w-1.5 h-1.5 rounded-none bg-amber-500 ml-1"></span>
            ) : syncStatus === 'synced' ? (
              <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 ml-1"></span>
            ) : (
              <span className="w-1.5 h-1.5 rounded-none bg-red-500 ml-1"></span>
            )}
          </button>
        )}
      </div>

      {/* Mobile Tab Navigation */}
      <div className="flex lg:hidden w-full border-t border-[#1A1A1A] pt-2 justify-center text-xs font-bold uppercase gap-6">
        <button onClick={() => setCurrentTab('data-prep')} className={currentTab === 'data-prep' ? 'text-[#1A1A1A] font-bold' : 'text-neutral-500'}>
          1. 数据准备
        </button>
        <button onClick={() => setCurrentTab('scheduling')} className={currentTab === 'scheduling' ? 'text-[#1A1A1A] font-bold' : 'text-neutral-500'}>
          2. 排课
        </button>
        <button onClick={() => setCurrentTab('timetable')} className={currentTab === 'timetable' ? 'text-[#1A1A1A] font-bold' : 'text-neutral-500'}>
          3. 课表
        </button>
      </div>
    </header>
  );
};
