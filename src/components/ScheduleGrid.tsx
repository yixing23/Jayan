import React, { useState } from 'react';
import { Course, Room, ScheduleConflict, ScheduleDataset, SlotAssignment, Teacher, StudentGroup } from '../types';
import {
  formatDateISO,
  getMondayOfCurrentWeek,
  getWeekDates,
  getDateFromDayIndex,
  formatChineseDateShort,
} from '../utils/dateUtils';

interface ScheduleGridProps {
  dataset: ScheduleDataset;
  assignments?: SlotAssignment[];
  conflicts?: ScheduleConflict[];
  onSlotClick?: (dayIndex: number, periodIndex: number, existingAssignment?: SlotAssignment, specificDate?: string) => void;
  onToggleLockSlot?: (assignmentId: string, e: React.MouseEvent) => void;
  onDeleteAssignment?: (assignmentId: string, e: React.MouseEvent) => void;
  onClearAll?: () => void;
  onRunAutoSchedule?: () => void;
  onSelectAssignment?: (assignment: SlotAssignment) => void;
  onClearAssignment?: (id: string) => void;
  onUpdateAssignments?: (newAssignments: SlotAssignment[]) => void;
  onMoveAssignment?: (assignmentId: string, targetDayIndex: number, targetPeriodIndex: number, targetDateISO?: string) => void;
  recommendedSlots?: { dayIndex: number; periodIndex: number; label: string; assignmentId: string }[];
  onApplyRecommendedSlot?: (slot: { dayIndex: number; periodIndex: number; assignmentId: string }) => void;
  selectedConflictedAssignmentId?: string | null;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  dataset,
  assignments = [],
  conflicts = [],
  onSlotClick,
  onToggleLockSlot,
  onDeleteAssignment,
  onClearAll,
  onRunAutoSchedule,
  onSelectAssignment,
  onClearAssignment,
  onUpdateAssignments,
  onMoveAssignment,
  recommendedSlots = [],
  onApplyRecommendedSlot,
  selectedConflictedAssignmentId,
}) => {
  const { timeConfig, courses = [], teachers = [], rooms = [], groups = [] } = dataset || {};
  const days = timeConfig?.days || [];
  const periods = timeConfig?.periods || [];

  // Drag & Drop State
  const [draggedAssignment, setDraggedAssignment] = useState<SlotAssignment | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ dayIndex: number; periodIndex: number; isConflict: boolean } | null>(null);

  // Calendar Date Navigation state
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMondayOfCurrentWeek());
  const weekDates = getWeekDates(currentMonday);
  const sundayDate = weekDates[6];

  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    setCurrentMonday(next);
  };

  const handleCurrentWeek = () => {
    setCurrentMonday(getMondayOfCurrentWeek());
  };

  const handleJumpToDate = (dateStr: string) => {
    if (!dateStr) return;
    const target = new Date(dateStr);
    if (!isNaN(target.getTime())) {
      setCurrentMonday(getMondayOfCurrentWeek(target));
    }
  };

  // Filtering state - default to 'all' for instant comprehensive timetable visibility
  const [filterType, setFilterType] = useState<'group' | 'teacher' | 'room' | 'student' | 'all'>('all');
  const [selectedEntityId, setSelectedEntityId] = useState<string>(() => {
    // If any group has assignments, pick it
    const activeGroup = groups.find((g) => (assignments || []).some((a) => a.groupId === g.id));
    return activeGroup ? activeGroup.id : groups[0]?.id || '';
  });
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

  // Lookups
  const courseMap = new Map<string, Course>((courses || []).map((c) => [c.id, c]));
  const teacherMap = new Map<string, Teacher>((teachers || []).map((t) => [t.id, t]));
  const roomMap = new Map<string, Room>((rooms || []).map((r) => [r.id, r]));
  const groupMap = new Map<string, StudentGroup>((groups || []).map((g) => [g.id, g]));

  // Gather all unique student names across assignments, courses, and accounts
  const allStudentNames = Array.from(
    new Set([
      ...(assignments || []).map((a) => a.studentNames).filter(Boolean),
      ...(courses || []).map((c) => c.studentNames).filter(Boolean),
      ...(dataset?.classHourAccounts || []).map((a) => a.studentName).filter(Boolean),
    ])
  ) as string[];

  // Create conflict lookup set for high performance: `${assignmentId}`
  const conflictAssignmentIds = new Set<string>();
  (conflicts || []).forEach((c) => {
    if (c.severity === 'hard') {
      (c?.affectedAssignmentIds || []).forEach((id) => conflictAssignmentIds.add(id));
    }
  });

  // Filter assignments based on active view entity
  const activeAssignments = (assignments || []).filter((a) => {
    if (filterType === 'all') return true;
    if (filterType === 'group') return a.groupId === selectedEntityId;
    if (filterType === 'teacher') return a.teacherId === selectedEntityId;
    if (filterType === 'room') return a.roomId === selectedEntityId;
    if (filterType === 'student') {
      const sName = a.studentNames || courseMap.get(a.courseId)?.studentNames || '';
      if (!studentSearchQuery.trim()) return Boolean(sName);
      const query = studentSearchQuery.trim().toLowerCase();
      return sName.toLowerCase().includes(query);
    }
    return true;
  });

  // Helper to find assignment at day, period matching active week date
  const getAssignmentAt = (dayIndex: number, periodIndex: number): SlotAssignment[] => {
    const targetDateISO = getDateFromDayIndex(currentMonday, dayIndex);
    return activeAssignments.filter((a) => {
      if (a.dayIndex !== dayIndex || a.periodIndex !== periodIndex) return false;
      if (a.specificDate) {
        return a.specificDate === targetDateISO;
      }
      return true; // Recurring assignment shows on every week
    });
  };

  // Drag & Drop Conflict Helper
  const checkSlotConflictForAssignment = (assignment: SlotAssignment, targetDay: number, targetPeriod: number): boolean => {
    return assignments.some((a) => {
      if (a.id === assignment.id) return false;
      if (a.dayIndex !== targetDay || a.periodIndex !== targetPeriod) return false;
      
      // If it's the exact same time slot, check dimensions:
      const aMode = a.teachingMode || courseMap.get(a.courseId)?.teachingMode || 'group';
      const targetMode = assignment.teachingMode || courseMap.get(assignment.courseId)?.teachingMode || 'group';

      // 1. Teacher overlap
      if (a.teacherId && assignment.teacherId && a.teacherId === assignment.teacherId) return true;
      
      // 2. Room overlap
      if (a.roomId && assignment.roomId && a.roomId === assignment.roomId) return true;
      
      // 3. Group overlap
      if (aMode === 'group' && targetMode === 'group' && a.groupId && assignment.groupId && a.groupId === assignment.groupId) return true;
      
      // 4. Student overlap
      const getStudents = (asn: SlotAssignment, mode: string) => {
        if (mode === 'group') return [];
        const raw = asn.studentNames || courseMap.get(asn.courseId)?.studentNames || '';
        return raw.split(/[,，、\s]+/).filter(Boolean);
      };
      const studentsA = getStudents(a, aMode);
      const studentsTarget = getStudents(assignment, targetMode);
      if (studentsA.some(s => studentsTarget.includes(s))) return true;

      // 5. Teacher unavailability
      const teacher = teacherMap.get(assignment.teacherId);
      if (teacher && teacher.unavailableSlots) {
        if (teacher.unavailableSlots.some(s => s.dayIndex === targetDay && s.periodIndex === targetPeriod)) {
           return true; // Unavailable slot
        }
      }

      return false; // No direct overlapping constraint
    });
  };

  const handleDragStart = (e: React.DragEvent, assignment: SlotAssignment) => {
    if (assignment.isLocked) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', assignment.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedAssignment(assignment);
  };

  const handleDragOver = (e: React.DragEvent, dayIndex: number, periodIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedAssignment) return;

    if (draggedAssignment.dayIndex === dayIndex && draggedAssignment.periodIndex === periodIndex) {
      setDragOverCell(null);
      return;
    }

    const hasConflict = checkSlotConflictForAssignment(draggedAssignment, dayIndex, periodIndex);
    setDragOverCell({ dayIndex, periodIndex, isConflict: hasConflict });
  };

  const handleDrop = (e: React.DragEvent, targetDayIndex: number, targetPeriodIndex: number, targetDateISO?: string) => {
    e.preventDefault();
    setDragOverCell(null);
    if (!draggedAssignment) return;

    const srcDay = draggedAssignment.dayIndex;
    const srcPeriod = draggedAssignment.periodIndex;

    if (srcDay === targetDayIndex && srcPeriod === targetPeriodIndex) {
      setDraggedAssignment(null);
      return;
    }

    // Find existing assignment at target cell
    const existingInTarget = assignments.find(
      (a) => a.dayIndex === targetDayIndex && a.periodIndex === targetPeriodIndex && a.id !== draggedAssignment.id
    );

    let updated = [...assignments];

    if (existingInTarget && !existingInTarget.isLocked) {
      // Swap positions
      updated = updated.map((a) => {
        if (a.id === draggedAssignment.id) {
          return { ...a, dayIndex: targetDayIndex, periodIndex: targetPeriodIndex, specificDate: targetDateISO };
        }
        if (a.id === existingInTarget.id) {
          return { ...a, dayIndex: srcDay, periodIndex: srcPeriod };
        }
        return a;
      });
    } else {
      // Move dragged assignment to target slot
      updated = updated.map((a) => {
        if (a.id === draggedAssignment.id) {
          return { ...a, dayIndex: targetDayIndex, periodIndex: targetPeriodIndex, specificDate: targetDateISO };
        }
        return a;
      });
    }

    if (onUpdateAssignments) {
      onUpdateAssignments(updated);
    } else if (onMoveAssignment) {
      onMoveAssignment(draggedAssignment.id, targetDayIndex, targetPeriodIndex, targetDateISO);
    }

    setDraggedAssignment(null);
  };

  // Switch entity dropdown list
  const getEntityOptions = () => {
    if (filterType === 'group') return (groups || []).map((g) => ({ id: g.id, label: `${g.name} (${g.size} students)` }));
    if (filterType === 'teacher') return (teachers || []).map((t) => ({ id: t.id, label: `${t.name}` }));
    if (filterType === 'room') return (rooms || []).map((r) => ({ id: r.id, label: `${r.name} [${r.type}]` }));
    return [];
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full">
      {/* Top Controls & View Selector */}
      {dataset.courses.length === 0 && (
        <div className="mb-6 p-4 border border-[#1A1A1A] bg-[#F4F2F0] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-700">lightbulb</span>
            <div className="text-xs">
              <span className="font-bold text-[#1A1A1A]">机构排课库处于空白自定义状态：</span>
              <span className="text-neutral-700"> 您可以随时在顶部【教务数据录入】添加老师、课程、教室和班级，设置完成后即可进行一键智能排课。</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 border-b border-[#1A1A1A] pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
            Timetable View Matrix
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A] flex items-center gap-2">
            {filterType === 'student' ? (
              <>
                <span className="material-symbols-outlined text-amber-800 text-2xl">person_search</span>
                <span>{studentSearchQuery ? `学员【${studentSearchQuery}】专属个人课表` : '学员课表检索与预览'}</span>
                <span className="text-xs font-mono font-normal text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 ml-2">
                  找到 {activeAssignments.length} 节已排课程
                </span>
              </>
            ) : filterType === 'teacher' ? (
              <>
                <span>【教师: {teacherMap.get(selectedEntityId)?.name || '教师'}】排课表</span>
              </>
            ) : filterType === 'group' ? (
              <>
                <span>【班级: {groupMap.get(selectedEntityId)?.name || '班级'}】排课表</span>
              </>
            ) : filterType === 'room' ? (
              <>
                <span>【教室: {roomMap.get(selectedEntityId)?.name || '教室'}】排课表</span>
              </>
            ) : (
              <span>机构全校总课表汇总</span>
            )}
          </h2>
        </div>

        {/* View mode switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex border border-[#1A1A1A] text-xs uppercase tracking-wider font-bold bg-[#F4F2F0]">
            <button
              onClick={() => {
                setFilterType('group');
                setSelectedEntityId(groups[0]?.id || '');
              }}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                filterType === 'group' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
              }`}
            >
              按班级查看
            </button>
            <button
              onClick={() => {
                setFilterType('teacher');
                setSelectedEntityId(teachers[0]?.id || '');
              }}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                filterType === 'teacher' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
              }`}
            >
              按教师查看
            </button>
            <button
              onClick={() => {
                setFilterType('room');
                setSelectedEntityId(rooms[0]?.id || '');
              }}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                filterType === 'room' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
              }`}
            >
              按教室查看
            </button>
            <button
              onClick={() => {
                setFilterType('student');
                if (!studentSearchQuery && allStudentNames.length > 0) {
                  setStudentSearchQuery(allStudentNames[0]);
                }
              }}
              className={`px-3 py-1.5 transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'student' ? 'bg-amber-900 text-white' : 'text-amber-900 hover:bg-amber-100/50'
              }`}
            >
              <span className="material-symbols-outlined text-sm">person_search</span>
              按学员姓名查看
            </button>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                filterType === 'all' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
              }`}
            >
              全部课表汇总
            </button>
          </div>

          {filterType !== 'all' && filterType !== 'student' && (
            <div className="border border-[#1A1A1A] px-3 py-1.5 bg-[#FDFCFB] text-xs font-semibold">
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer font-serif italic text-sm text-[#1A1A1A]"
              >
                {getEntityOptions().map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filterType === 'student' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-amber-50 border border-amber-300 p-1.5 text-xs">
              <div className="relative flex items-center min-w-[180px]">
                <span className="material-symbols-outlined text-amber-800 text-sm absolute left-2 pointer-events-none">search</span>
                <input
                  type="text"
                  placeholder="输入学员姓名 (如: 张三)"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#1A1A1A] pl-7 pr-6 py-1 text-xs font-bold text-[#1A1A1A] focus:outline-none"
                />
                {studentSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStudentSearchQuery('')}
                    className="absolute right-2 text-neutral-400 hover:text-[#1A1A1A] text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              {allStudentNames.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto max-w-[300px] py-0.5">
                  <span className="text-[10px] font-bold text-amber-900 shrink-0">点击选人:</span>
                  {allStudentNames.slice(0, 8).map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setStudentSearchQuery(name)}
                      className={`px-2 py-0.5 border text-[10px] font-bold cursor-pointer whitespace-nowrap transition-colors ${
                        studentSearchQuery === name
                          ? 'bg-amber-900 text-white border-amber-900 shadow-xs'
                          : 'bg-white text-amber-950 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Clear & Regenerate */}
          <button
            onClick={onClearAll}
            className="text-xs uppercase tracking-wider font-semibold text-neutral-500 hover:text-red-700 underline px-2 py-1 cursor-pointer"
          >
            清空已排课表
          </button>
        </div>
      </div>

      {/* Calendar Week Navigation Bar */}
      <div className="mb-4 bg-[#F4F2F0] border border-[#1A1A1A] p-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-900 text-lg">calendar_month</span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#1A1A1A] font-mono">
              🗓️ 周历: {formatDateISO(currentMonday)} ~ {formatDateISO(sundayDate)}
            </span>
            <span className="text-[10px] text-neutral-600 font-sans">
              点击下方日期切换查看任意周次，支持按指定年月日进行精确课时扣减与考勤
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="px-2.5 py-1 bg-white border border-[#1A1A1A] text-xs font-bold text-[#1A1A1A] hover:bg-neutral-100 cursor-pointer transition-colors"
          >
            ◄ 上一周
          </button>
          <button
            type="button"
            onClick={handleCurrentWeek}
            className="px-2.5 py-1 bg-[#1A1A1A] text-white border border-[#1A1A1A] text-xs font-bold hover:bg-neutral-800 cursor-pointer transition-colors"
          >
            回到本周
          </button>
          <button
            type="button"
            onClick={handleNextWeek}
            className="px-2.5 py-1 bg-white border border-[#1A1A1A] text-xs font-bold text-[#1A1A1A] hover:bg-neutral-100 cursor-pointer transition-colors"
          >
            下一周 ►
          </button>

          <div className="flex items-center gap-1 border-l border-neutral-300 pl-2 ml-1">
            <span className="text-[10px] font-bold text-neutral-600">日历跳转:</span>
            <input
              type="date"
              onChange={(e) => handleJumpToDate(e.target.value)}
              className="bg-white border border-[#1A1A1A] px-2 py-0.5 text-xs font-bold text-[#1A1A1A] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto border-t border-l border-[#1A1A1A] bg-[#FDFCFB]">
        <div
          className="min-w-[800px] grid border-b border-[#1A1A1A]"
          style={{ gridTemplateColumns: `140px repeat(${days.length}, minmax(130px, 1fr))` }}
        >
          {/* Header row */}
          <div className="border-r border-[#1A1A1A] bg-[#F4F2F0] p-3 text-center flex items-center justify-center">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase opacity-50">
              节次 / 时间
            </span>
          </div>

          {days.map((day, dIdx) => {
            const dateObj = weekDates[dIdx] || new Date();
            const dateStr = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
            const fullDateISO = formatDateISO(dateObj);
            const isToday = fullDateISO === formatDateISO(new Date());

            return (
              <div
                key={day}
                className={`border-r border-[#1A1A1A] p-2 text-center flex flex-col items-center justify-center ${
                  isToday ? 'bg-amber-100/90 text-amber-950 font-black' : 'bg-[#F4F2F0] text-[#1A1A1A]'
                }`}
              >
                <span className="font-bold text-xs uppercase tracking-widest">{day}</span>
                <span
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-none mt-0.5 ${
                    isToday ? 'bg-amber-900 text-white' : 'text-neutral-600'
                  }`}
                >
                  {dateStr}
                </span>
              </div>
            );
          })}

          {/* Time Slot Rows */}
          {periods.map((period, pIdx) => {
            if (period.isBreak) {
              return (
                <React.Fragment key={`break_${pIdx}`}>
                  <div className="border-r border-b border-[#1A1A1A] p-2 bg-[#EFECE8] flex flex-col items-center justify-center text-[10px] font-mono text-neutral-500">
                    <span className="font-bold">{period.name}</span>
                    <span>{period.startTime}-{period.endTime}</span>
                  </div>
                  <div
                    className="border-r border-b border-[#1A1A1A] bg-[#F4F2F0] p-2 flex items-center justify-center text-[10px] uppercase font-serif italic tracking-widest text-neutral-400"
                    style={{ gridColumn: `span ${days.length}` }}
                  >
                    — {period.name} —
                  </div>
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={`period_${pIdx}`}>
                {/* Period Time Column */}
                <div className="border-r border-b border-[#1A1A1A] p-2 flex flex-col items-center justify-center text-[10px] font-mono bg-[#FDFCFB]">
                  <span className="font-bold text-[#1A1A1A]">{period.name}</span>
                  <span className="text-neutral-500 text-[9px] mt-0.5">
                    {period.startTime}–{period.endTime}
                  </span>
                </div>

                {/* Days Columns */}
                {days.map((_, dIdx) => {
                  const targetDateISO = getDateFromDayIndex(currentMonday, dIdx);
                  const slotAssignments = getAssignmentAt(dIdx, pIdx);
                  const isSlotEmpty = slotAssignments.length === 0;

                  // Drag Over state for this cell
                  const isCellDragOver = dragOverCell?.dayIndex === dIdx && dragOverCell?.periodIndex === pIdx;
                  const isCellDragConflict = isCellDragOver && dragOverCell?.isConflict;

                  // Candidate slot recommendation check
                  const recSlot = recommendedSlots.find(
                    (s) => s.dayIndex === dIdx && s.periodIndex === pIdx
                  );

                  return (
                    <div
                      key={`cell_${dIdx}_${pIdx}`}
                      onClick={() => {
                        if (recSlot && onApplyRecommendedSlot) {
                          onApplyRecommendedSlot(recSlot);
                        } else if (isSlotEmpty) {
                          onSlotClick?.(dIdx, pIdx, undefined, targetDateISO);
                        }
                      }}
                      onDragOver={(e) => handleDragOver(e, dIdx, pIdx)}
                      onDragLeave={() => setDragOverCell(null)}
                      onDrop={(e) => handleDrop(e, dIdx, pIdx, targetDateISO)}
                      className={`border-r border-b border-[#1A1A1A] min-h-[90px] p-1.5 transition-all relative flex flex-col justify-between ${
                        isCellDragOver
                          ? isCellDragConflict
                            ? 'bg-rose-100/90 border-2 border-rose-600 border-dashed scale-[0.99]'
                            : 'bg-emerald-100/90 border-2 border-emerald-600 border-dashed scale-[0.99]'
                          : recSlot
                          ? 'bg-amber-50/90 border-2 border-amber-500 shadow-md cursor-pointer'
                          : isSlotEmpty
                          ? 'hover:bg-[#F4F2F0] cursor-pointer'
                          : 'bg-[#FDFCFB]'
                      }`}
                    >
                      {/* Recommendation Badge overlay */}
                      {recSlot && (
                        <div className="absolute top-1 right-1 z-20 bg-amber-500 text-amber-950 font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-xs shadow-sm flex items-center gap-1 animate-pulse">
                          <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                          <span>{recSlot.label || '推荐槽位'}</span>
                        </div>
                      )}

                      {/* Drag Over Overlay Visual Feedback */}
                      {isCellDragOver && (
                        <div
                          className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-1 text-center font-bold text-[10px] pointer-events-none ${
                            isCellDragConflict
                              ? 'bg-rose-200/90 text-rose-950 border-2 border-dashed border-rose-700'
                              : 'bg-emerald-200/90 text-emerald-950 border-2 border-dashed border-emerald-700'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">
                            {isCellDragConflict ? 'block' : 'swap_calls'}
                          </span>
                          <span>{isCellDragConflict ? '硬冲突 (不可放入)' : '可调换/放入此时段'}</span>
                        </div>
                      )}

                      {isSlotEmpty ? (
                        <div className="h-full flex items-center justify-center text-[10px] text-neutral-300 opacity-0 hover:opacity-100 font-mono">
                          + Add Class
                        </div>
                      ) : (
                        <div className="space-y-1.5 w-full">
                          {slotAssignments.map((a) => {
                            const course = courseMap.get(a.courseId);
                            const teacher = teacherMap.get(a.teacherId);
                            const room = roomMap.get(a.roomId);
                            const group = groupMap.get(a.groupId);
                            const hasConflict = conflictAssignmentIds.has(a.id);
                            const isSelectedForConflict = selectedConflictedAssignmentId === a.id;

                            return (
                              <div
                                key={a.id}
                                draggable={!a.isLocked}
                                onDragStart={(e) => handleDragStart(e, a)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSlotClick) {
                                    onSlotClick(dIdx, pIdx, a);
                                  } else if (onSelectAssignment) {
                                    onSelectAssignment(a);
                                  }
                                }}
                                className={`p-2 border transition-all cursor-grab active:cursor-grabbing relative group ${
                                  isSelectedForConflict
                                    ? 'ring-2 ring-amber-600 bg-amber-100 border-amber-800'
                                    : hasConflict
                                    ? 'bg-red-50 border-red-800 text-red-950'
                                    : a.isLocked
                                    ? 'bg-[#1A1A1A] text-[#FDFCFB] border-[#1A1A1A]'
                                    : 'bg-[#EFECE8] hover:bg-[#E3DFDA] border-[#1A1A1A] text-[#1A1A1A]'
                                }`}
                              >
                                {/* Header badge line */}
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <div className="flex items-center gap-1 min-w-0">
                                    {!a.isLocked && (
                                      <span className="material-symbols-outlined text-[12px] opacity-40 group-hover:opacity-100 cursor-grab">
                                        drag_indicator
                                      </span>
                                    )}
                                    <span className="text-[10px] font-bold font-mono uppercase tracking-wider truncate">
                                      {course?.code || 'COURSE'}
                                    </span>
                                    {(a.teachingMode || a.studentNames) && (
                                      <span
                                        className={`text-[8.5px] font-bold px-1 py-0.2 border shrink-0 ${
                                          a.isLocked
                                            ? 'bg-amber-900 text-amber-200 border-amber-700'
                                            : 'bg-amber-200/90 text-amber-950 border-amber-400'
                                        }`}
                                      >
                                        {a.teachingMode === 'one_on_one'
                                          ? '1对1'
                                          : a.teachingMode === 'one_on_two'
                                          ? '1对2'
                                          : a.teachingMode === 'one_on_n'
                                          ? '1对N'
                                          : a.teachingMode === 'group'
                                          ? '团课'
                                          : '辅导'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 opacity-80">
                                    {/* Pin / Lock Button */}
                                    {onToggleLockSlot && (
                                      <button
                                        onClick={(e) => onToggleLockSlot(a.id, e)}
                                        title={a.isLocked ? 'Pinned slot (auto-scheduler will not move)' : 'Pin slot'}
                                        className="hover:scale-110 transition-transform p-0.5 cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-[13px]">
                                          {a.isLocked ? 'push_pin' : 'keep_off'}
                                        </span>
                                      </button>
                                    )}
                                    {/* Delete Button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onDeleteAssignment) {
                                          onDeleteAssignment(a.id, e);
                                        } else if (onClearAssignment) {
                                          onClearAssignment(a.id);
                                        }
                                      }}
                                      title="Remove from schedule"
                                      className="hover:scale-110 transition-transform p-0.5 cursor-pointer text-red-600 dark:text-red-300"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">close</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Subject Name */}
                                <div className="text-xs font-serif italic font-bold leading-tight mb-0.5 truncate">
                                  {course?.name || 'Class Subject'}
                                </div>

                                {/* Student Name(s) for 1v1 / 1v2 Tutoring */}
                                {(a.studentNames || course?.studentNames) && (
                                  <div
                                    className={`text-[9.5px] font-bold px-1 py-0.5 my-0.5 border flex items-center gap-1 truncate ${
                                      a.isLocked
                                        ? 'bg-neutral-800 text-amber-300 border-neutral-700'
                                        : 'bg-amber-100/90 text-amber-900 border-amber-300'
                                    }`}
                                    title={`学员姓名: ${a.studentNames || course?.studentNames}`}
                                  >
                                    <span className="material-symbols-outlined text-[10px]">person</span>
                                    <span className="truncate">{a.studentNames || course?.studentNames}</span>
                                  </div>
                                )}

                                {/* Class Details Footer */}
                                <div className="text-[9.5px] font-mono opacity-80 flex flex-wrap justify-between gap-x-2 gap-y-0.5 pt-1 border-t border-current/20">
                                  <span>{teacher?.name?.split(' ')[0] || 'Teacher'}</span>
                                  <span>{room?.name || '未指定教室'}</span>
                                  {filterType !== 'group' && (
                                    <span className="font-semibold text-[9px] truncate">{group?.name}</span>
                                  )}
                                </div>

                                {hasConflict && (
                                  <div className="mt-1 text-[8.5px] font-sans font-bold uppercase tracking-wider text-red-700 bg-red-100 px-1 py-0.5 border border-red-300 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[11px]">warning</span>
                                    Conflict
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Footer Legend */}
      <footer className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#EFECE8] border border-[#1A1A1A]"></div>
            <span className="text-[10px] uppercase font-bold tracking-wider">Scheduled Class</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#1A1A1A]"></div>
            <span className="text-[10px] uppercase font-bold tracking-wider">Pinned / Locked Slot</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-50 border border-red-700"></div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-red-800">Conflict Detected</span>
          </div>
        </div>
        <p className="text-[10px] font-serif italic text-neutral-400">
          Click any assigned slot to edit room/teacher or click empty slot to manually assign.
        </p>
      </footer>
    </div>
  );
};
