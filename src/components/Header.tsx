import React from 'react';
import { ScheduleDataset, SchedulerMetrics } from '../types';

export type NavTab = 'teachers' | 'rooms' | 'groups' | 'courses' | 'scheduling' | 'timetable' | 'conflicts' | 'class-hours' | 'ai-advisor';

interface HeaderProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  dataset: ScheduleDataset;
  onRunAutoSchedule: () => void;
  isScheduling: boolean;
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
  onRunAutoSchedule,
  isScheduling,
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
    <header className="border-b border-[#1A1A1A] bg-[#FDFCFB] px-6 lg:px-8 py-3.5 flex flex-col lg:flex-row items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
      {/* Brand Title & Subtitle */}
      <div className="flex items-center justify-between w-full lg:w-auto shrink-0">
        <div>
          <h1 className="text-lg md:text-xl font-serif font-bold tracking-tight text-[#1A1A1A]">
            新知 THE WISSEN 排课系统
          </h1>
          <p className="text-[10px] uppercase tracking-widest font-mono text-neutral-500 mt-0.5">
            智能教务排课与课表生成引擎
          </p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="hidden lg:flex items-center gap-4 text-xs font-medium">
        <button
          onClick={() => setCurrentTab('teachers')}
          className={`py-1 px-1 transition-all cursor-pointer border-b-2 flex items-center gap-1 ${
            currentTab === 'teachers'
              ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
              : 'border-transparent text-neutral-500 hover:text-[#1A1A1A]'
          }`}
        >
          教师
        </button>
        <button
          onClick={() => setCurrentTab('rooms')}
          className={`py-1 px-1 transition-all cursor-pointer border-b-2 flex items-center gap-1 ${
            currentTab === 'rooms'
              ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
              : 'border-transparent text-neutral-500 hover:text-[#1A1A1A]'
          }`}
        >
          教室
        </button>
        <button
          onClick={() => setCurrentTab('groups')}
          className={`py-1 px-1 transition-all cursor-pointer border-b-2 flex items-center gap-1 ${
            currentTab === 'groups'
              ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
              : 'border-transparent text-neutral-500 hover:text-[#1A1A1A]'
          }`}
        >
          班级
        </button>
        <button
          onClick={() => setCurrentTab('courses')}
          className={`py-1 px-1 transition-all cursor-pointer border-b-2 flex items-center gap-1 ${
            currentTab === 'courses'
              ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
              : 'border-transparent text-neutral-500 hover:text-[#1A1A1A]'
          }`}
        >
          课程
        </button>
        <button
          onClick={() => setCurrentTab('scheduling')}
          className={`py-1 px-1 transition-all cursor-pointer border-b-2 flex items-center gap-1 ${
            currentTab === 'scheduling'
              ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
              : 'border-transparent text-neutral-500 hover:text-[#1A1A1A]'
          }`}
        >
          排课
        </button>
        <button
          onClick={() => setCurrentTab('timetable')}
          className={`py-1 px-1 transition-all cursor-pointer border-b-2 flex items-center gap-1 ${
            currentTab === 'timetable'
              ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
              : 'border-transparent text-neutral-500 hover:text-[#1A1A1A]'
          }`}
        >
          课表/对比
        </button>
        <button
          onClick={() => setCurrentTab('conflicts')}
          className={`py-1 px-1 transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
            currentTab === 'conflicts'
              ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
              : 'border-transparent text-neutral-500 hover:text-[#1A1A1A]'
          }`}
        >
          <span>诊断</span>
          {conflictCount > 0 ? (
            <span className="px-1.5 py-0.2 bg-red-600 text-white text-[9px] font-mono rounded-full font-bold">
              {conflictCount}
            </span>
          ) : (
            <span className="text-[10px] text-neutral-400">(0)</span>
          )}
        </button>
        <button
          onClick={() => setCurrentTab('class-hours')}
          className={`py-1 px-1 transition-all cursor-pointer border-b-2 flex items-center gap-1 ${
            currentTab === 'class-hours'
              ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
              : 'border-transparent text-neutral-500 hover:text-[#1A1A1A]'
          }`}
        >
          课时管理
        </button>
        <button
          onClick={() => setCurrentTab('ai-advisor')}
          className={`py-1 px-1 transition-all cursor-pointer border-b-2 flex items-center gap-1 ${
            currentTab === 'ai-advisor'
              ? 'border-amber-600 text-amber-900 font-bold'
              : 'border-transparent text-amber-700 hover:text-amber-900 font-medium'
          }`}
        >
          <span className="material-symbols-outlined text-sm text-amber-600">auto_awesome</span>
          <span>AI顾问</span>
        </button>
      </nav>

      {/* Right Controls: Completion Rate, Undo/Redo & Cloud Sync */}
      <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end shrink-0 flex-wrap">
        {/* Undo / Redo Buttons */}
        {onUndo && onRedo && (
          <div className="flex items-center gap-1 border border-[#1A1A1A] bg-white p-0.5 shadow-2xs">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1.5 border border-transparent ${
                canUndo
                  ? 'hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] cursor-pointer active:scale-95'
                  : 'text-neutral-300 cursor-not-allowed opacity-40'
              }`}
              title={canUndo ? '撤销上一步 (Ctrl+Z / Cmd+Z)' : '无更早历史可撤销'}
            >
              <span className="material-symbols-outlined text-sm">undo</span>
              <span className="hidden sm:inline">撤销</span>
            </button>

            <div className="w-[1px] h-4 bg-neutral-300"></div>

            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1.5 border border-transparent ${
                canRedo
                  ? 'hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] cursor-pointer active:scale-95'
                  : 'text-neutral-300 cursor-not-allowed opacity-40'
              }`}
              title={canRedo ? '重做 (Ctrl+Y / Cmd+Shift+Z)' : '无重做历史'}
            >
              <span className="material-symbols-outlined text-sm">redo</span>
              <span className="hidden sm:inline">重做</span>
            </button>
          </div>
        )}

        {/* Completion Rate Card */}
        <div className="px-3 py-1.5 border border-[#1A1A1A] bg-white flex items-center gap-2.5 text-xs shadow-2xs">
          <span className="text-[10px] uppercase font-mono text-neutral-500 tracking-wider">排课完成度</span>
          <span className="font-mono font-bold text-[#1A1A1A] text-sm">{metrics.completionRate}%</span>
        </div>

        {/* Sync Status Badge */}
        <div
          onClick={onOpenCloudSync}
          className="px-2.5 py-1 border border-[#1A1A1A] bg-white flex items-center gap-1.5 text-xs font-mono cursor-pointer hover:bg-neutral-50 transition-colors"
          title="点击打开云端同步管理"
        >
          {syncStatus === 'syncing' ? (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          ) : syncStatus === 'synced' ? (
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          ) : syncStatus === 'unsaved' ? (
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
          )}
          <span className="text-[10px] font-bold text-[#1A1A1A]">
            {syncStatus === 'syncing'
              ? '同步中...'
              : syncStatus === 'synced'
              ? '云端已同步'
              : syncStatus === 'unsaved'
              ? '未同步修改'
              : '同步失败'}
          </span>
        </div>

        {/* Auto Sync Switch Toggle */}
        {onToggleAutoSync && (
          <button
            onClick={onToggleAutoSync}
            className={`px-2.5 py-1.5 text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
              autoSyncEnabled
                ? 'bg-emerald-50 text-emerald-950 border-emerald-700 hover:bg-emerald-100'
                : 'bg-neutral-100 text-neutral-600 border-neutral-400 hover:bg-neutral-200'
            }`}
            title="开启/关闭静默自动云端增量同步"
          >
            <span className="material-symbols-outlined text-xs">
              {autoSyncEnabled ? 'sync' : 'sync_disabled'}
            </span>
            <span>{autoSyncEnabled ? '自动同步: 开' : '自动同步: 关'}</span>
          </button>
        )}

        {/* Cloud Sync Button */}
        {onOpenCloudSync && (
          <button
            onClick={onOpenCloudSync}
            className="px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border bg-[#1A1A1A] hover:bg-neutral-800 text-white border-[#1A1A1A] shadow-2xs active:scale-[0.98]"
            title="跨设备云端数据库同步与提取码"
          >
            <span className="material-symbols-outlined text-sm text-amber-400">cloud_sync</span>
            <span>{syncCode ? `提取码 [${syncCode}]` : '云端同步'}</span>
          </button>
        )}
      </div>

      {/* Mobile Tab Navigation */}
      <div className="flex lg:hidden w-full border-t border-[#1A1A1A] pt-2 justify-between text-[10px] uppercase font-bold tracking-wider overflow-x-auto pb-1 gap-2">
        <button onClick={() => setCurrentTab('teachers')} className={currentTab === 'teachers' ? 'underline font-extrabold whitespace-nowrap' : 'opacity-60 whitespace-nowrap'}>
          教师
        </button>
        <button onClick={() => setCurrentTab('rooms')} className={currentTab === 'rooms' ? 'underline font-extrabold whitespace-nowrap' : 'opacity-60 whitespace-nowrap'}>
          教室
        </button>
        <button onClick={() => setCurrentTab('groups')} className={currentTab === 'groups' ? 'underline font-extrabold whitespace-nowrap' : 'opacity-60 whitespace-nowrap'}>
          班级
        </button>
        <button onClick={() => setCurrentTab('courses')} className={currentTab === 'courses' ? 'underline font-extrabold whitespace-nowrap' : 'opacity-60 whitespace-nowrap'}>
          课程
        </button>
        <button onClick={() => setCurrentTab('scheduling')} className={currentTab === 'scheduling' ? 'underline font-extrabold whitespace-nowrap' : 'opacity-60 whitespace-nowrap'}>
          排课
        </button>
        <button onClick={() => setCurrentTab('timetable')} className={currentTab === 'timetable' ? 'underline font-extrabold whitespace-nowrap' : 'opacity-60 whitespace-nowrap'}>
          课表
        </button>
        <button onClick={() => setCurrentTab('conflicts')} className={currentTab === 'conflicts' ? 'underline font-extrabold whitespace-nowrap' : 'opacity-60 whitespace-nowrap'}>
          诊断({conflictCount})
        </button>
        <button onClick={() => setCurrentTab('class-hours')} className={currentTab === 'class-hours' ? 'underline font-extrabold text-emerald-800 whitespace-nowrap' : 'opacity-60 whitespace-nowrap'}>
          消课
        </button>
        <button onClick={() => setCurrentTab('ai-advisor')} className={currentTab === 'ai-advisor' ? 'underline font-extrabold text-amber-800 whitespace-nowrap' : 'text-amber-700 font-bold whitespace-nowrap'}>
          ✨ AI
        </button>
      </div>
    </header>
  );
};
