import React, { useEffect, useState } from 'react';
import { EMPTY_CUSTOM_PRESET } from './data/samplePresets';
import { ScheduleConflict, ScheduleDataset, SchedulerMetrics, SlotAssignment } from './types';
import { runAutoScheduler, validateSchedule } from './utils/schedulerEngine';
import { processClassHourDeductions } from './utils/classHourUtils';
import { Header, MainTab } from './components/Header';
import { saveScheduleToCloud } from './lib/firebase';
import { TeacherManagement } from './components/TeacherManagement';
import { RoomManagement } from './components/RoomManagement';
import { GroupManagement } from './components/GroupManagement';
import { CourseManagement } from './components/CourseManagement';
import { ScheduleManagement } from './components/ScheduleManagement';
import { TimetableManagement } from './components/TimetableManagement';
import { ConflictDiagnostics } from './components/ConflictDiagnostics';
import { ClassHourManagement } from './components/ClassHourManagement';
import { AiAdvisor } from './components/AiAdvisor';
import { SlotEditModal } from './components/SlotEditModal';
import { CloudSyncModal } from './components/CloudSyncModal';

export default function App() {
  const [dataset, setDataset] = useState<ScheduleDataset>(() => {
    const saved = localStorage.getItem('chronos_custom_dataset');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return EMPTY_CUSTOM_PRESET;
  });

  useEffect(() => {
    localStorage.setItem('chronos_custom_dataset', JSON.stringify(dataset));
  }, [dataset]);

  const [assignments, setAssignments] = useState<SlotAssignment[]>(dataset.assignments || []);
  const [historyStack, setHistoryStack] = useState<SlotAssignment[][]>(() => [dataset.assignments || []]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const historyRef = React.useRef({ stack: historyStack, index: historyIndex });

  useEffect(() => {
    historyRef.current = { stack: historyStack, index: historyIndex };
  }, [historyStack, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyStack.length - 1;

  const applyAssignmentsState = (
    newAssignments: SlotAssignment[],
    datasetOverride?: ScheduleDataset,
    actionNotice?: string
  ) => {
    const targetDataset = datasetOverride || dataset;
    const { updatedDataset, noticeMessages } = processClassHourDeductions(targetDataset, newAssignments, assignments);
    const currentConflicts = validateSchedule(updatedDataset, newAssignments);
    
    setAssignments(newAssignments);
    setConflicts(currentConflicts);

    const totalRequiredPeriods = updatedDataset.courses.reduce((sum, c) => sum + (c.weeklyHours || 0), 0);
    const scheduledPeriods = newAssignments.length;
    const completionRate = totalRequiredPeriods > 0 ? Math.min(100, Math.round((scheduledPeriods / totalRequiredPeriods) * 100)) : (scheduledPeriods > 0 ? 100 : 0);
    const hardConflictsCount = currentConflicts.filter((c) => c.severity === 'hard').length;
    const softConflictsCount = currentConflicts.filter((c) => c.severity === 'soft').length;

    const roomsCount = updatedDataset.rooms?.length || 0;
    const daysCount = updatedDataset.timeConfig?.days?.length || 5;
    const periodsCount = updatedDataset.timeConfig?.periods?.filter(p => !p.isBreak).length || 8;
    const totalRoomSlots = Math.max(1, roomsCount * daysCount * periodsCount);
    const occupiedRoomSlots = newAssignments.filter(a => Boolean(a.roomId)).length;
    const roomUtilizationRate = Math.min(100, Math.round((occupiedRoomSlots / totalRoomSlots) * 100));

    setMetrics((prev) => ({
      ...prev,
      totalRequiredPeriods,
      scheduledPeriods,
      completionRate,
      hardConflictsCount,
      softConflictsCount,
      roomUtilizationRate,
    }));

    setDataset({ ...updatedDataset, assignments: newAssignments });

    if (actionNotice) {
      showNotice(actionNotice);
    } else if (noticeMessages.length > 0) {
      showNotice(noticeMessages[0]);
    }
  };

  const pushHistoryAndValidate = (
    newAssignments: SlotAssignment[],
    datasetOverride?: ScheduleDataset,
    actionNotice?: string
  ) => {
    const { stack, index } = historyRef.current;
    const updatedStack = stack.slice(0, index + 1);

    const currentTop = updatedStack[updatedStack.length - 1];
    if (!currentTop || JSON.stringify(currentTop) !== JSON.stringify(newAssignments)) {
      updatedStack.push(newAssignments);
      if (updatedStack.length > 30) updatedStack.shift();
      setHistoryStack(updatedStack);
      setHistoryIndex(updatedStack.length - 1);
    }
    applyAssignmentsState(newAssignments, datasetOverride, actionNotice);
  };

  const handleUndo = () => {
    const { stack, index } = historyRef.current;
    if (index > 0) {
      const prevIndex = index - 1;
      setHistoryIndex(prevIndex);
      applyAssignmentsState(stack[prevIndex], undefined, '已撤销');
    }
  };

  const handleRedo = () => {
    const { stack, index } = historyRef.current;
    if (index < stack.length - 1) {
      const nextIndex = index + 1;
      setHistoryIndex(nextIndex);
      applyAssignmentsState(stack[nextIndex], undefined, '已重做');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElem = document.activeElement;
      if (activeElem) {
        const tagName = activeElem.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || (activeElem as HTMLElement).isContentEditable) {
          return;
        }
      }

      const isMac = /mac/i.test(navigator.userAgent || navigator.platform);
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (!modifierKey) return;
      const key = e.key.toLowerCase();

      if (key === 'z') {
        if (e.shiftKey) { e.preventDefault(); handleRedo(); }
        else { e.preventDefault(); handleUndo(); }
      } else if (key === 'y' && !isMac) {
        e.preventDefault(); handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [metrics, setMetrics] = useState<SchedulerMetrics>(() => {
    const totalRequiredPeriods = dataset.courses.reduce((sum, c) => sum + (c.weeklyHours || 0), 0);
    const scheduledPeriods = (dataset.assignments || []).length;
    const completionRate = totalRequiredPeriods > 0 ? Math.min(100, Math.round((scheduledPeriods / totalRequiredPeriods) * 100)) : (scheduledPeriods > 0 ? 100 : 0);
    const roomsCount = dataset.rooms?.length || 0;
    const daysCount = dataset.timeConfig?.days?.length || 5;
    const periodsCount = dataset.timeConfig?.periods?.filter(p => !p.isBreak).length || 8;
    const totalRoomSlots = Math.max(1, roomsCount * daysCount * periodsCount);
    const occupiedRoomSlots = (dataset.assignments || []).filter(a => Boolean(a.roomId)).length;
    const roomUtilizationRate = Math.min(100, Math.round((occupiedRoomSlots / totalRoomSlots) * 100));

    return {
      totalRequiredPeriods,
      scheduledPeriods,
      completionRate,
      hardConflictsCount: 0,
      softConflictsCount: 0,
      roomUtilizationRate,
      teacherBalanceScore: 100,
      executionTimeMs: 0,
    };
  });

  const [isScheduling, setIsScheduling] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<MainTab>('data-prep');
  const [dataPrepTab, setDataPrepTab] = useState<'teachers' | 'rooms' | 'groups' | 'courses' | 'class-hours'>('teachers');
  const [activeTool, setActiveTool] = useState<'diagnostics' | 'ai-advisor' | null>(null);

  const [syncCode, setSyncCode] = useState<string | null>(() => localStorage.getItem('xinzhi_cloud_sync_code'));
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => localStorage.getItem('xinzhi_last_synced_at'));
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => localStorage.getItem('xinzhi_auto_sync_enabled') === 'true');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'unsaved' | 'idle' | 'error'>('synced');

  const handleSyncCodeUpdate = (code: string) => {
    setSyncCode(code);
    localStorage.setItem('xinzhi_cloud_sync_code', code);
  };

  const handleLastSyncedUpdate = (time: string) => {
    setLastSyncedAt(time);
    localStorage.setItem('xinzhi_last_synced_at', time);
  };

  const handleToggleAutoSync = () => {
    const next = !autoSyncEnabled;
    setAutoSyncEnabled(next);
    localStorage.setItem('xinzhi_auto_sync_enabled', String(next));
    if (next) showNotice('已开启实时云端同步');
    else showNotice('已关闭实时云端同步');
  };

  useEffect(() => {
    if (!autoSyncEnabled) return;
    setSyncStatus('unsaved');
    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        let currentCode = syncCode;
        if (!currentCode) {
          currentCode = `XZ-${Math.floor(1000 + Math.random() * 9000)}`;
          handleSyncCodeUpdate(currentCode);
        }
        await saveScheduleToCloud(dataset, currentCode);
        handleLastSyncedUpdate(new Date().toLocaleTimeString());
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('error');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [dataset, assignments, autoSyncEnabled]);

  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  const [activeSlotModal, setActiveSlotModal] = useState<{
    dayIndex: number;
    periodIndex: number;
    existingAssignment?: SlotAssignment;
    initialSpecificDate?: string;
  } | null>(null);

  useEffect(() => {
    if (dataset.courses.length > 0) {
      handleRunAutoSchedule(dataset);
    } else {
      applyAssignmentsState(dataset.assignments || []);
    }
  }, []);

  const handleRunAutoSchedule = (currentData: ScheduleDataset = dataset) => {
    setIsScheduling(true);
    setTimeout(() => {
      const result = runAutoScheduler(currentData);
      setMetrics(prev => ({
        ...prev,
        bottlenecks: result.metrics.bottlenecks,
        executionTimeMs: result.metrics.executionTimeMs,
        teacherBalanceScore: result.metrics.teacherBalanceScore,
      }));
      pushHistoryAndValidate(result.assignments, currentData, '排课完成');
      setIsScheduling(false);
    }, 150);
  };

  const handleDeleteAssignment = (assignmentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = assignments.filter((a) => a.id !== assignmentId);
    pushHistoryAndValidate(updated, undefined, '已移除');
    if (activeSlotModal) setActiveSlotModal(null);
  };

  const handleSaveSlot = (assignment: SlotAssignment) => {
    const existingIdx = assignments.findIndex((a) => a.id === assignment.id);
    let updated: SlotAssignment[];
    if (existingIdx >= 0) {
      updated = [...assignments];
      updated[existingIdx] = assignment;
    } else {
      updated = [...assignments, assignment];
    }
    pushHistoryAndValidate(updated, undefined, '已保存');
    setActiveSlotModal(null);
  };

  const handleAutoFixConflict = (conflict: ScheduleConflict) => {
    if (conflict.affectedAssignmentIds.length === 0) return;
    const targetId = conflict.affectedAssignmentIds[0];
    const target = assignments.find((a) => a.id === targetId);
    if (!target) return;

    const course = dataset.courses.find((c) => c.id === target.courseId);
    if (!course) return;

    const daysCount = dataset.timeConfig.days.length;
    const periods = dataset.timeConfig.periods;

    for (let d = 0; d < daysCount; d++) {
      for (let p = 0; p < periods.length; p++) {
        if (periods[p].isBreak) continue;
        if (d === target.dayIndex && p === target.periodIndex) continue;

        const isTeacherBusy = assignments.some((a) => a.id !== targetId && a.dayIndex === d && a.periodIndex === p && a.teacherId === target.teacherId);
        const isRoomBusy = target.roomId
          ? assignments.some((a) => a.id !== targetId && a.dayIndex === d && a.periodIndex === p && a.roomId === target.roomId)
          : false;
        const targetMode = target.teachingMode || course.teachingMode || 'group';
        const isGroupBusy =
          targetMode === 'group' && target.groupId
            ? assignments.some((a) => a.id !== targetId && a.dayIndex === d && a.periodIndex === p && a.groupId === target.groupId && (a.teachingMode || 'group') === 'group')
            : false;

        if (!isTeacherBusy && !isRoomBusy && !isGroupBusy) {
          const updated = assignments.map((a) => (a.id === targetId ? { ...a, dayIndex: d, periodIndex: p } : a));
          pushHistoryAndValidate(updated, undefined, '已调换');
          return;
        }
      }
    }
    showNotice('无法自动修复，建议重新排课');
  };

  const handleMoveAssignmentToSlot = (assignmentId: string, dayIndex: number, periodIndex: number) => {
    const updated = assignments.map((a) => (a.id === assignmentId ? { ...a, dayIndex, periodIndex } : a));
    pushHistoryAndValidate(updated, undefined, '已调整');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAiAdvisor={() => setActiveTool('ai-advisor')}
        onOpenDiagnostics={() => setActiveTool('diagnostics')}
        dataset={dataset}
        metrics={metrics}
        conflictCount={conflicts.filter((c) => c.severity === 'hard').length}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenCloudSync={() => setIsCloudModalOpen(true)}
        syncCode={syncCode}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={handleToggleAutoSync}
        syncStatus={syncStatus}
      />

      <main className="flex-1 flex flex-col w-full relative">
        {currentTab === 'data-prep' && (
          <div className="flex flex-col flex-1 h-full w-full">
            <div className="flex items-center gap-8 px-8 py-0 border-b border-neutral-100 bg-neutral-50/50 text-sm">
              <button onClick={() => setDataPrepTab('teachers')} className={`py-2.5 border-b-2 font-medium ${dataPrepTab === 'teachers' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}>教师</button>
              <button onClick={() => setDataPrepTab('rooms')} className={`py-2.5 border-b-2 font-medium ${dataPrepTab === 'rooms' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}>教室</button>
              <button onClick={() => setDataPrepTab('groups')} className={`py-2.5 border-b-2 font-medium ${dataPrepTab === 'groups' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}>班级</button>
              <button onClick={() => setDataPrepTab('courses')} className={`py-2.5 border-b-2 font-medium ${dataPrepTab === 'courses' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}>课程</button>
              <button onClick={() => setDataPrepTab('class-hours')} className={`py-2.5 border-b-2 font-medium ${dataPrepTab === 'class-hours' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}>课时管理</button>
            </div>
            <div className="flex-1 overflow-auto bg-neutral-50">
              {dataPrepTab === 'teachers' && (
                <TeacherManagement dataset={dataset} onUpdateDataset={(updated) => pushHistoryAndValidate(updated.assignments || assignments, updated)} />
              )}
              {dataPrepTab === 'rooms' && (
                <RoomManagement dataset={dataset} onUpdateDataset={(updated) => pushHistoryAndValidate(updated.assignments || assignments, updated)} />
              )}
              {dataPrepTab === 'groups' && (
                <GroupManagement dataset={dataset} onUpdateDataset={(updated) => pushHistoryAndValidate(updated.assignments || assignments, updated)} onNavigateToCourses={() => setDataPrepTab('courses')} />
              )}
              {dataPrepTab === 'courses' && (
                <CourseManagement dataset={dataset} onUpdateDataset={(updated) => pushHistoryAndValidate(updated.assignments || assignments, updated)} />
              )}
              {dataPrepTab === 'class-hours' && (
                <ClassHourManagement dataset={dataset} onUpdateDataset={(updated) => setDataset(updated)} />
              )}
            </div>
          </div>
        )}

        {currentTab === 'scheduling' && (
          <ScheduleManagement
            dataset={dataset}
            assignments={assignments}
            onUpdateAssignments={(newAssignments) => pushHistoryAndValidate(newAssignments, undefined, '已更新课时分布')}
            onRunAutoSchedule={() => handleRunAutoSchedule(dataset)}
            isScheduling={isScheduling}
            onUpdateDataset={(updated) => pushHistoryAndValidate(updated.assignments || assignments, updated)}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        )}

        {currentTab === 'timetable' && (
          <TimetableManagement
            dataset={dataset}
            assignments={assignments}
            onUpdateAssignments={(newAssignments) => pushHistoryAndValidate(newAssignments, undefined, '已更新课时分布')}
            onUpdateDataset={(updated) => pushHistoryAndValidate(updated.assignments || assignments, updated)}
            onSelectAssignment={(a) => setActiveSlotModal({ dayIndex: a.dayIndex, periodIndex: a.periodIndex, existingAssignment: a, initialSpecificDate: a.specificDate })}
            onSlotClick={(dayIndex, periodIndex, existingAssignment, specificDate) => setActiveSlotModal({ dayIndex, periodIndex, existingAssignment, initialSpecificDate: specificDate })}
            onClearAssignment={handleDeleteAssignment}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        )}
      </main>

      {/* Diagnostics Modal Overlay */}
      {activeTool === 'diagnostics' && (
        <div className="fixed inset-0 z-50 bg-neutral-50 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between px-8 py-4 border-b border-neutral-200 bg-white">
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-neutral-500">health_and_safety</span>
              冲突诊断
            </h2>
            <button onClick={() => setActiveTool(null)} className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <ConflictDiagnostics
              conflicts={conflicts}
              metrics={metrics}
              dataset={dataset}
              assignments={assignments}
              onAutoFixConflict={handleAutoFixConflict}
              onRunAutoSchedule={() => {
                handleRunAutoSchedule(dataset);
                setActiveTool(null);
              }}
              onMoveAssignmentToSlot={handleMoveAssignmentToSlot}
              onNavigateToTab={(tab) => {
                // Not perfectly mapped, but close enough to navigate away
                setActiveTool(null);
                setCurrentTab('data-prep');
              }}
            />
          </div>
        </div>
      )}

      {/* AI Advisor Modal Overlay */}
      {activeTool === 'ai-advisor' && (
        <div className="fixed inset-0 z-50 bg-[#FDFBF7] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between px-8 py-4 border-b border-amber-200/50 bg-white">
            <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600">auto_awesome</span>
              AI 顾问
            </h2>
            <button onClick={() => setActiveTool(null)} className="p-2 rounded-full hover:bg-amber-50 text-amber-700 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <AiAdvisor dataset={dataset} conflicts={conflicts} metrics={metrics} />
          </div>
        </div>
      )}

      {activeSlotModal && (
        <SlotEditModal
          dayIndex={activeSlotModal.dayIndex}
          periodIndex={activeSlotModal.periodIndex}
          existingAssignment={activeSlotModal.existingAssignment}
          initialSpecificDate={activeSlotModal.initialSpecificDate}
          dataset={dataset}
          onSave={handleSaveSlot}
          onDelete={handleDeleteAssignment}
          onClose={() => setActiveSlotModal(null)}
        />
      )}

      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        dataset={dataset}
        onDatasetLoaded={(newDataset) => {
          setDataset(newDataset);
          if (newDataset.assignments) pushHistoryAndValidate(newDataset.assignments, newDataset, '已恢复云端课表');
          else handleRunAutoSchedule(newDataset);
        }}
        syncCode={syncCode}
        onSyncCodeUpdate={handleSyncCodeUpdate}
        lastSyncedAt={lastSyncedAt}
        onLastSyncedUpdate={handleLastSyncedUpdate}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={handleToggleAutoSync}
        syncStatus={syncStatus}
      />

      {noticeMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
          <span>{noticeMessage}</span>
        </div>
      )}
    </div>
  );
}
