import React, { useEffect, useState } from 'react';
import { EMPTY_CUSTOM_PRESET } from './data/samplePresets';
import { ScheduleConflict, ScheduleDataset, SchedulerMetrics, SlotAssignment } from './types';
import { runAutoScheduler, validateSchedule } from './utils/schedulerEngine';
import { processClassHourDeductions } from './utils/classHourUtils';
import { Header, NavTab } from './components/Header';
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
  // Current Dataset state - defaults to custom empty preset for educational institutions
  const [dataset, setDataset] = useState<ScheduleDataset>(() => {
    const saved = localStorage.getItem('chronos_custom_dataset');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return EMPTY_CUSTOM_PRESET;
  });

  // Save dataset to localStorage whenever changed
  useEffect(() => {
    localStorage.setItem('chronos_custom_dataset', JSON.stringify(dataset));
  }, [dataset]);

  // Active Assignments
  const [assignments, setAssignments] = useState<SlotAssignment[]>(dataset.assignments || []);

  // History Stack for Undo / Redo (Max 30 steps)
  const [historyStack, setHistoryStack] = useState<SlotAssignment[][]>(() => [dataset.assignments || []]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const historyRef = React.useRef({ stack: historyStack, index: historyIndex });

  useEffect(() => {
    historyRef.current = { stack: historyStack, index: historyIndex };
  }, [historyStack, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyStack.length - 1;

  // Re-validate schedule conflicts & metrics without modifying history stack directly
  const applyAssignmentsState = (
    newAssignments: SlotAssignment[],
    datasetOverride?: ScheduleDataset,
    actionNotice?: string
  ) => {
    const targetDataset = datasetOverride || dataset;
    // Process Class-Hour deductions for student names
    const { updatedDataset, noticeMessages } = processClassHourDeductions(targetDataset, newAssignments, assignments);

    const currentConflicts = validateSchedule(updatedDataset, newAssignments);
    setAssignments(newAssignments);
    setConflicts(currentConflicts);

    const totalRequiredPeriods = updatedDataset.courses.reduce((sum, c) => sum + (c.weeklyHours || 0), 0);
    const scheduledPeriods = newAssignments.length;
    const completionRate = totalRequiredPeriods > 0 ? Math.min(100, Math.round((scheduledPeriods / totalRequiredPeriods) * 100)) : (scheduledPeriods > 0 ? 100 : 0);
    const hardConflictsCount = currentConflicts.filter((c) => c.severity === 'hard').length;
    const softConflictsCount = currentConflicts.filter((c) => c.severity === 'soft').length;

    // Recalculate room utilization
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

  // Push new assignments state onto history stack (Max 30 steps)
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
      if (updatedStack.length > 30) {
        updatedStack.shift();
      }
      setHistoryStack(updatedStack);
      setHistoryIndex(updatedStack.length - 1);
    }

    applyAssignmentsState(newAssignments, datasetOverride, actionNotice);
  };

  // Undo Handler
  const handleUndo = () => {
    const { stack, index } = historyRef.current;
    if (index > 0) {
      const prevIndex = index - 1;
      const prevAssignments = stack[prevIndex];
      setHistoryIndex(prevIndex);
      applyAssignmentsState(prevAssignments, undefined, '↩ 已撤销上一步排课操作');
    }
  };

  // Redo Handler
  const handleRedo = () => {
    const { stack, index } = historyRef.current;
    if (index < stack.length - 1) {
      const nextIndex = index + 1;
      const nextAssignments = stack[nextIndex];
      setHistoryIndex(nextIndex);
      applyAssignmentsState(nextAssignments, undefined, '↪ 已恢复重做排课操作');
    }
  };

  // Global Keyboard Shortcuts (Ctrl+Z / Cmd+Z, Ctrl+Y / Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Pause undo/redo when user is typing in input/textarea/select/contentEditable
      const activeElem = document.activeElement;
      if (activeElem) {
        const tagName = activeElem.tagName.toLowerCase();
        if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          (activeElem as HTMLElement).isContentEditable
        ) {
          return;
        }
      }

      const isMac = /mac/i.test(navigator.userAgent || navigator.platform);
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (!modifierKey) return;

      const key = e.key.toLowerCase();

      if (key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if (key === 'y' && !isMac) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Conflicts & Metrics
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [metrics, setMetrics] = useState<SchedulerMetrics>(() => {
    const totalRequiredPeriods = dataset.courses.reduce((sum, c) => sum + (c.weeklyHours || 0), 0);
    const scheduledPeriods = (dataset.assignments || []).length;
    const completionRate = totalRequiredPeriods > 0 ? Math.min(100, Math.round((scheduledPeriods / totalRequiredPeriods) * 100)) : (scheduledPeriods > 0 ? 100 : 0);
    
    // Calculate initial room utilization
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

  // Scheduling State
  const [isScheduling, setIsScheduling] = useState<boolean>(false);

  // Navigation Tab according to user's 6-step workflow
  const [currentTab, setCurrentTab] = useState<NavTab>('teachers');

  // Cloud Sync state
  const [syncCode, setSyncCode] = useState<string | null>(() => localStorage.getItem('xinzhi_cloud_sync_code'));
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => localStorage.getItem('xinzhi_last_synced_at'));
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);

  // Auto Sync State
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('xinzhi_auto_sync_enabled') === 'true';
  });
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
    if (next) {
      showNotice('已开启实时静默云端同步，每次修改将自动保存至 Firestore');
    } else {
      showNotice('已关闭实时自动云端同步');
    }
  };

  // Debounced Auto Sync Effect
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
        const now = new Date().toLocaleTimeString();
        handleLastSyncedUpdate(now);
        setSyncStatus('synced');
      } catch (err) {
        console.error('Auto sync failed:', err);
        setSyncStatus('error');
      }
    }, 1000); // 1-second debounce

    return () => clearTimeout(timer);
  }, [dataset, assignments, autoSyncEnabled]);

  // Notification Message state
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  // Slot Modal state
  const [activeSlotModal, setActiveSlotModal] = useState<{
    dayIndex: number;
    periodIndex: number;
    existingAssignment?: SlotAssignment;
    initialSpecificDate?: string;
  } | null>(null);

  // Initial Auto-Schedule on mount if courses exist
  useEffect(() => {
    if (dataset.courses.length > 0) {
      handleRunAutoSchedule(dataset);
    } else {
      applyAssignmentsState(dataset.assignments || []);
    }
  }, []);

  // Run Auto-Scheduler Engine
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

      pushHistoryAndValidate(result.assignments, currentData, '✨ 一键全自动智能排课完成');
      setIsScheduling(false);
    }, 150);
  };

  // Delete Assignment
  const handleDeleteAssignment = (assignmentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = assignments.filter((a) => a.id !== assignmentId);
    pushHistoryAndValidate(updated, undefined, '已成功移除该课时');
    if (activeSlotModal) setActiveSlotModal(null);
  };

  // Save Manual Assignment from Modal
  const handleSaveSlot = (assignment: SlotAssignment) => {
    const existingIdx = assignments.findIndex((a) => a.id === assignment.id);
    let updated: SlotAssignment[];
    if (existingIdx >= 0) {
      updated = [...assignments];
      updated[existingIdx] = assignment;
    } else {
      updated = [...assignments, assignment];
    }
    pushHistoryAndValidate(updated, undefined, existingIdx >= 0 ? '已保存修改课时' : '已新增排课');
    setActiveSlotModal(null);
  };

  // Auto-Fix Conflict Action
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
          pushHistoryAndValidate(updated, undefined, '已调换排课时段');
          return;
        }
      }
    }

    showNotice('无法找到完全无碰撞的空闲格子，建议直接点击【一键智能排课】由算法全局重新规划。');
  };

  // Move assignment directly to slot (from candidate slot recommendation)
  const handleMoveAssignmentToSlot = (assignmentId: string, dayIndex: number, periodIndex: number) => {
    const updated = assignments.map((a) => (a.id === assignmentId ? { ...a, dayIndex, periodIndex } : a));
    pushHistoryAndValidate(updated, undefined, '已成功调整课时时段');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB] text-[#1A1A1A]">
      {/* Editorial Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        dataset={dataset}
        onRunAutoSchedule={() => handleRunAutoSchedule(dataset)}
        isScheduling={isScheduling}
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

      {/* Main Body View according to 6-Step logic */}
      <main className="flex-1 flex flex-col w-full">
        {currentTab === 'teachers' && (
          <TeacherManagement
            dataset={dataset}
            onUpdateDataset={(updated) => {
              pushHistoryAndValidate(updated.assignments || assignments, updated);
            }}
          />
        )}

        {currentTab === 'rooms' && (
          <RoomManagement
            dataset={dataset}
            onUpdateDataset={(updated) => {
              pushHistoryAndValidate(updated.assignments || assignments, updated);
            }}
          />
        )}

        {currentTab === 'groups' && (
          <GroupManagement
            dataset={dataset}
            onUpdateDataset={(updated) => {
              pushHistoryAndValidate(updated.assignments || assignments, updated);
            }}
            onNavigateToCourses={() => setCurrentTab('courses')}
          />
        )}

        {currentTab === 'courses' && (
          <CourseManagement
            dataset={dataset}
            onUpdateDataset={(updated) => {
              pushHistoryAndValidate(updated.assignments || assignments, updated);
            }}
          />
        )}

        {currentTab === 'scheduling' && (
          <ScheduleManagement
            dataset={dataset}
            assignments={assignments}
            onUpdateAssignments={(newAssignments) => pushHistoryAndValidate(newAssignments, undefined, '已更新课时分布')}
            onRunAutoSchedule={() => handleRunAutoSchedule(dataset)}
            isScheduling={isScheduling}
            onUpdateDataset={(updated) => {
              pushHistoryAndValidate(updated.assignments || assignments, updated);
            }}
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
            onUpdateDataset={(updated) => {
              pushHistoryAndValidate(updated.assignments || assignments, updated);
            }}
            onSelectAssignment={(a) =>
              setActiveSlotModal({
                dayIndex: a.dayIndex,
                periodIndex: a.periodIndex,
                existingAssignment: a,
                initialSpecificDate: a.specificDate,
              })
            }
            onSlotClick={(dayIndex, periodIndex, existingAssignment, specificDate) =>
              setActiveSlotModal({ dayIndex, periodIndex, existingAssignment, initialSpecificDate: specificDate })
            }
            onClearAssignment={handleDeleteAssignment}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        )}

        {currentTab === 'conflicts' && (
          <ConflictDiagnostics
            conflicts={conflicts}
            metrics={metrics}
            dataset={dataset}
            assignments={assignments}
            onAutoFixConflict={handleAutoFixConflict}
            onRunAutoSchedule={() => handleRunAutoSchedule(dataset)}
            onMoveAssignmentToSlot={handleMoveAssignmentToSlot}
            onNavigateToTab={(tab) => setCurrentTab(tab as NavTab)}
          />
        )}

        {currentTab === 'class-hours' && (
          <ClassHourManagement
            dataset={dataset}
            onUpdateDataset={(updated) => {
              setDataset(updated);
            }}
          />
        )}

        {currentTab === 'ai-advisor' && (
          <AiAdvisor dataset={dataset} conflicts={conflicts} metrics={metrics} />
        )}
      </main>

      {/* Manual Slot Edit Modal */}
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
      {/* Cloud Sync Modal */}
      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        dataset={dataset}
        onDatasetLoaded={(newDataset) => {
          setDataset(newDataset);
          if (newDataset.assignments) {
            pushHistoryAndValidate(newDataset.assignments, newDataset, '已恢复云端保存的课表记录');
          } else {
            handleRunAutoSchedule(newDataset);
          }
        }}
        syncCode={syncCode}
        onSyncCodeUpdate={handleSyncCodeUpdate}
        lastSyncedAt={lastSyncedAt}
        onLastSyncedUpdate={handleLastSyncedUpdate}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={handleToggleAutoSync}
        syncStatus={syncStatus}
      />

      {/* Notice Banner */}
      {noticeMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1A1A1A] text-white px-4 py-3 border border-white/20 shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-amber-400 text-sm">info</span>
          <span>{noticeMessage}</span>
        </div>
      )}
    </div>
  );
}
