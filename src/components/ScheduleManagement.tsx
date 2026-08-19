import React, { useState } from 'react';
import { Course, Room, ScheduleDataset, SlotAssignment, Teacher, TimeConfig } from '../types';
import { PRESET_TIME_CONFIG_GROUP, PRESET_TIME_CONFIG_VIP_INTEGER, PRESET_TIME_CONFIG_VIP_HALF } from '../data/samplePresets';
import { formatDateISO, getDayIndexFromDateString, formatChineseDateShort } from '../utils/dateUtils';

interface ScheduleManagementProps {
  dataset: ScheduleDataset;
  assignments: SlotAssignment[];
  onUpdateAssignments: (assignments: SlotAssignment[]) => void;
  onRunAutoSchedule: () => void;
  isScheduling: boolean;
  onUpdateDataset?: (updated: ScheduleDataset) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const ScheduleManagement: React.FC<ScheduleManagementProps> = ({
  dataset,
  assignments,
  onUpdateAssignments,
  onRunAutoSchedule,
  isScheduling,
  onUpdateDataset,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const [scheduleMode, setScheduleMode] = useState<'manual' | 'auto'>('manual');

  // Manual Form state
  const [selectedTeacherFilterId, setSelectedTeacherFilterId] = useState<string>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>((dataset?.courses || [])[0]?.id || '');
  const [dateMode, setDateMode] = useState<'weekly' | 'calendar'>('weekly');
  const [specificDate, setSpecificDate] = useState<string>(formatDateISO(new Date()));
  const [selectedDays, setSelectedDays] = useState<number[]>([0]); // default Monday
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string>((dataset?.rooms || [])[0]?.id || '');
  const [manualSaveMessage, setManualSaveMessage] = useState<string | null>(null);

  // Filter courses by selected teacher
  const filteredCourses = (dataset?.courses || []).filter((c) => {
    if (selectedTeacherFilterId === 'all') return true;
    return c.teacherId === selectedTeacherFilterId;
  });

  const selectedCourse = (dataset?.courses || []).find((c) => c.id === selectedCourseId);
  const selectedTeacher = (dataset?.teachers || []).find((t) => t.id === selectedCourse?.teacherId);

  // Filter available rooms matching course requirement or show all
  const sortedRooms = [...(dataset?.rooms || [])].sort((a, b) => {
    if (selectedCourse && a.type === selectedCourse.requiredRoomType) return -1;
    return 1;
  });

  const toggleDaySelection = (dayIdx: number) => {
    if (selectedDays.includes(dayIdx)) {
      if (selectedDays.length === 1) return; // Keep at least 1
      setSelectedDays(selectedDays.filter((d) => d !== dayIdx));
    } else {
      setSelectedDays([...selectedDays, dayIdx]);
    }
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!selectedCourse) {
      setErrorMessage('请先选择需要排课的课程！');
      return;
    }

    const newAssignments: SlotAssignment[] = [];
    const teacherId = selectedCourse.teacherId || (dataset?.teachers || [])[0]?.id || 'default_t';

    if (dateMode === 'calendar') {
      if (!specificDate) {
        setErrorMessage('请选择排课的日历具体日期！');
        return;
      }
      const dayIdx = getDayIndexFromDateString(specificDate);
      newAssignments.push({
        id: `manual_${Date.now()}_${specificDate}_${selectedPeriodIndex}`,
        courseId: selectedCourse.id,
        teacherId: teacherId,
        roomId: selectedRoomId,
        groupId: selectedCourse.groupId,
        dayIndex: dayIdx,
        periodIndex: selectedPeriodIndex,
        specificDate: specificDate,
        isLocked: true,
        studentNames: selectedCourse.studentNames,
        teachingMode: selectedCourse.teachingMode,
      });
    } else {
      (selectedDays || []).forEach((dayIdx) => {
        newAssignments.push({
          id: `manual_${Date.now()}_${dayIdx}_${selectedPeriodIndex}`,
          courseId: selectedCourse.id,
          teacherId: teacherId,
          roomId: selectedRoomId,
          groupId: selectedCourse.groupId,
          dayIndex: dayIdx,
          periodIndex: selectedPeriodIndex,
          isLocked: true, // Manual assignments locked by default
          studentNames: selectedCourse.studentNames,
          teachingMode: selectedCourse.teachingMode,
        });
      });
    }

    // Append new assignments, replacing only if the exact same course and teacher are assigned to the exact same slot/date
    const updated = [...(assignments || [])];
    newAssignments.forEach((item) => {
      const existingIdx = updated.findIndex(
        (a) =>
          a.dayIndex === item.dayIndex &&
          a.periodIndex === item.periodIndex &&
          (item.specificDate ? a.specificDate === item.specificDate : !a.specificDate) &&
          a.courseId === item.courseId &&
          a.teacherId === item.teacherId
      );
      if (existingIdx >= 0) {
        updated[existingIdx] = item;
      } else {
        updated.push(item);
      }
    });

    onUpdateAssignments(updated);
    setManualSaveMessage(
      dateMode === 'calendar'
        ? `成功为《${selectedCourse.name}》安排了 ${formatChineseDateShort(specificDate)} 的课程！`
        : `成功为《${selectedCourse.name}》安排了 ${selectedDays.length} 个周重度时间节次！`
    );
    setTimeout(() => setManualSaveMessage(null), 4000);
  };

  // Count assigned periods for selected course
  const countAssigned = (courseId: string) => {
    return (assignments || []).filter((a) => a.courseId === courseId).length;
  };

  // Mode detection
  const periods = dataset.timeConfig?.periods || [];
  const isGroupMode = periods.some((p) => p.startTime === '08:30');
  const isVipHalf = periods.some((p) => p.startTime === '14:30' && p.endTime === '16:30');
  const isVipInteger = periods.some((p) => p.startTime === '14:00' && p.endTime === '16:00');
  const isVipMode = !isGroupMode && (isVipHalf || isVipInteger || periods.some((p) => p.startTime === '08:00'));

  const handleApplyTimePreset = (config: TimeConfig) => {
    if (onUpdateDataset) {
      onUpdateDataset({
        ...dataset,
        timeConfig: config,
      });
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
      {/* Step Header */}
      <div className="mb-6 border-b border-[#1A1A1A] pb-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
            Step 5 • Scheduling Execution
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A] flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-[#1A1A1A]">calendar_month</span>
            排课管理 (手动排课 / 智能排课)
          </h2>
          <p className="text-xs text-neutral-600 mt-1">
            支持【手动逐门点选排课】或使用【算法一键全自动排课】，灵活调配教师、教室与班级时间。
          </p>
        </div>

        {/* Mode Selector & Undo/Redo */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo Buttons */}
          {onUndo && onRedo && (
            <div className="no-print flex items-center gap-1 border border-[#1A1A1A] bg-[#FDFCFB] p-0.5 shadow-2xs">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`px-2.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1 border border-transparent ${
                  canUndo
                    ? 'hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] cursor-pointer active:scale-95'
                    : 'text-neutral-300 cursor-not-allowed opacity-40'
                }`}
                title={canUndo ? '撤销上一步排课 (Ctrl+Z)' : '无更早历史可撤销'}
              >
                <span className="material-symbols-outlined text-sm">undo</span>
                <span>撤销</span>
              </button>
              <div className="w-[1px] h-4 bg-neutral-300"></div>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`px-2.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1 border border-transparent ${
                  canRedo
                    ? 'hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] cursor-pointer active:scale-95'
                    : 'text-neutral-300 cursor-not-allowed opacity-40'
                }`}
                title={canRedo ? '重做排课 (Ctrl+Y / Cmd+Shift+Z)' : '无重做历史'}
              >
                <span className="material-symbols-outlined text-sm">redo</span>
                <span>重做</span>
              </button>
            </div>
          )}

          <div className="flex border border-[#1A1A1A] text-xs font-bold uppercase tracking-wider bg-[#F4F2F0]">
            <button
              onClick={() => setScheduleMode('manual')}
              className={`px-4 py-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                scheduleMode === 'manual' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">touch_app</span>
              手动逐门排课
            </button>
            <button
              onClick={() => setScheduleMode('auto')}
              className={`px-4 py-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                scheduleMode === 'auto' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-amber-500">bolt</span>
              算法智能排课
            </button>
          </div>
        </div>
      </div>

      {/* Course Type & Time Schedule Selection Control Bar */}
      <div className="mb-6 bg-[#FDFCFB] border border-[#1A1A1A] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-amber-800 text-xl">schedule</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">授课模式与时间方案</h4>
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 font-bold">
                周一 ~ 周日 (7天)
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">直接选择班课或一对一/一对二方案，自动匹配对应的上课时段表</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Main Mode Toggle Buttons */}
          <div className="inline-flex border border-[#1A1A1A] p-0.5 bg-[#F4F2F0]">
            <button
              type="button"
              onClick={() => handleApplyTimePreset(PRESET_TIME_CONFIG_GROUP)}
              className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isGroupMode
                  ? 'bg-[#1A1A1A] text-white shadow-xs'
                  : 'text-neutral-700 hover:text-[#1A1A1A]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">groups</span>
              <span>班课方案</span>
              <span className="text-[10px] opacity-75 font-mono">(08:30-10:10)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isVipMode) {
                  handleApplyTimePreset(PRESET_TIME_CONFIG_VIP_HALF);
                }
              }}
              className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isVipMode
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'text-neutral-700 hover:text-[#1A1A1A]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">person</span>
              <span>一对一 / 一对二</span>
              <span className="text-[10px] opacity-75 font-mono">(08:00-10:00)</span>
            </button>
          </div>

          {/* Sub-Option for VIP Mode: Integer vs Half */}
          {isVipMode && (
            <div className="inline-flex items-center gap-3 bg-purple-50 border border-purple-300 px-3 py-1.5 text-xs animate-in fade-in">
              <span className="text-[11px] font-bold text-purple-900">下午时段：</span>
              <label className="flex items-center gap-1 cursor-pointer text-xs font-medium text-purple-950">
                <input
                  type="radio"
                  name="vipTimeOption"
                  checked={isVipInteger}
                  onChange={() => handleApplyTimePreset(PRESET_TIME_CONFIG_VIP_INTEGER)}
                  className="accent-purple-800 cursor-pointer"
                />
                <span>整点 (14:00-16:00)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-xs font-medium text-purple-950 ml-1">
                <input
                  type="radio"
                  name="vipTimeOption"
                  checked={isVipHalf}
                  onChange={() => handleApplyTimePreset(PRESET_TIME_CONFIG_VIP_HALF)}
                  className="accent-purple-800 cursor-pointer"
                />
                <span className="font-bold text-purple-950">半点 (14:30-16:30)</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Mode A: Manual Scheduling Form */}
      {scheduleMode === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Form */}
          <div className="lg:col-span-1 border border-[#1A1A1A] p-6 bg-[#FDFCFB]">
            <h3 className="text-xl font-serif italic font-bold text-[#1A1A1A] border-b border-[#1A1A1A] pb-3 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">edit_calendar</span>
              手动选择与指定时间
            </h3>

            {manualSaveMessage && (
              <div className="mb-4 p-3 border border-emerald-800 bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                {manualSaveMessage}
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 border border-red-800 bg-red-50 text-red-900 text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleManualSave} className="space-y-5">
              {/* 0. 按教师筛选课程 */}
              <div className="bg-[#F4F2F0] p-3 border border-[#1A1A1A]">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-amber-900 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-amber-800">person_search</span>
                    0. 筛选授课教师 (按教师选课)
                  </span>
                  {selectedTeacherFilterId !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedTeacherFilterId('all')}
                      className="text-[10px] text-amber-800 underline hover:text-[#1A1A1A] cursor-pointer"
                    >
                      显示全部教师
                    </button>
                  )}
                </label>
                <select
                  value={selectedTeacherFilterId}
                  onChange={(e) => {
                    const newTeacherId = e.target.value;
                    setSelectedTeacherFilterId(newTeacherId);
                    const matchingCourses = (dataset?.courses || []).filter((c) =>
                      newTeacherId === 'all' ? true : c.teacherId === newTeacherId
                    );
                    if (matchingCourses.length > 0) {
                      setSelectedCourseId(matchingCourses[0].id);
                    } else {
                      setSelectedCourseId('');
                    }
                  }}
                  className="w-full bg-white border border-[#1A1A1A] px-2.5 py-2 text-xs font-bold text-[#1A1A1A] focus:outline-none cursor-pointer"
                >
                  <option value="all">全部教师 ({dataset?.teachers?.length || 0}位教师)</option>
                  {dataset?.teachers?.map((t) => {
                    const courseCount = (dataset?.courses || []).filter((c) => c.teacherId === t.id).length;
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name} (所教课程: {courseCount}门)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 1. 点选课程 */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1 flex justify-between items-center">
                  <span>1. 选择课程 *</span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {selectedTeacherFilterId !== 'all' ? `已筛选名下 ${filteredCourses.length} 门课程` : `共 ${filteredCourses.length} 门课程`}
                  </span>
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setSelectedCourseId(cId);
                    const cObj = (dataset?.courses || []).find((c) => c.id === cId);
                    if (cObj?.teacherId && selectedTeacherFilterId !== 'all' && selectedTeacherFilterId !== cObj.teacherId) {
                      setSelectedTeacherFilterId(cObj.teacherId);
                    }
                  }}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2.5 py-2.5 text-xs font-bold text-[#1A1A1A] focus:outline-none cursor-pointer"
                >
                  {filteredCourses.length === 0 && <option value="">(当前教师下暂无课程，请切换或添加)</option>}
                  {filteredCourses.map((c) => {
                    const scheduled = countAssigned(c.id);
                    const tObj = dataset.teachers.find((t) => t.id === c.teacherId);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} {tObj ? `[${tObj.name}]` : ''} (已排 {scheduled}/{c.weeklyHours}节)
                      </option>
                    );
                  })}
                </select>
                {selectedCourse && (
                  <div className="mt-1.5 p-2 bg-[#F4F2F0] border border-[#1A1A1A] text-[11px] text-neutral-700 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>授课教师: <strong>{selectedTeacher?.name || '待定'}</strong></span>
                      <span>场地要求: {selectedCourse.requiredRoomType}</span>
                    </div>
                    {selectedCourse.studentNames && (
                      <div className="pt-1 border-t border-neutral-300 flex items-center justify-between text-amber-900 font-sans font-bold">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">person</span>
                          对应学员: {selectedCourse.studentNames}
                        </span>
                        <span className="text-[10px] bg-amber-100 border border-amber-300 px-1.5 py-0.5">
                          ⚡ 排课将自动扣减课时
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. 排课日期与模式选择 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600">
                    2. 选择排课日期方式 *
                  </label>
                  <div className="flex border border-[#1A1A1A] p-0.5 bg-[#F4F2F0]">
                    <button
                      type="button"
                      onClick={() => setDateMode('weekly')}
                      className={`px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors ${
                        dateMode === 'weekly' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      按星期重复
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateMode('calendar')}
                      className={`px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors ${
                        dateMode === 'calendar' ? 'bg-amber-900 text-white' : 'text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      日历指定日期
                    </button>
                  </div>
                </div>

                {dateMode === 'weekly' ? (
                  <div className="flex flex-wrap gap-2">
                    {dataset.timeConfig.days.map((day, idx) => {
                      const isSelected = selectedDays.includes(idx);
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => toggleDaySelection(idx)}
                          className={`px-3 py-1.5 text-xs font-bold border border-[#1A1A1A] cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#1A1A1A] text-white' : 'bg-white text-neutral-700 hover:bg-[#F4F2F0]'
                          }`}
                        >
                          {isSelected ? '✓ ' : ''}{day}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50 border border-amber-300">
                    <label className="block text-[10px] font-bold text-amber-950 uppercase mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-amber-800">calendar_month</span>
                        选择日历具体年月日 *
                      </span>
                      <span className="text-[10px] font-mono text-amber-900">
                        {specificDate ? formatChineseDateShort(specificDate) : ''}
                      </span>
                    </label>
                    <input
                      type="date"
                      required
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="w-full bg-white border border-[#1A1A1A] px-3 py-2 text-xs font-bold text-[#1A1A1A] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 3. 选时间/节次 */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  3. 选择上课时间 / 节次 *
                </label>
                <select
                  value={selectedPeriodIndex}
                  onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2.5 py-2 text-xs font-mono font-bold focus:outline-none cursor-pointer"
                >
                  {dataset.timeConfig.periods.map((p, pIdx) => {
                    if (p.isBreak) return null;
                    return (
                      <option key={p.index} value={pIdx}>
                        {p.name} ({p.startTime} - {p.endTime})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 4. 选教室 */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  4. 选择授课教室 (选填 / 可不指定)
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2.5 py-2 text-xs font-bold text-[#1A1A1A] focus:outline-none cursor-pointer"
                >
                  <option value="">-- 不指定教室 / 暂无场地 (选填) --</option>
                  {sortedRooms.map((r) => {
                    const isMatching = selectedCourse && r.type === selectedCourse.requiredRoomType;
                    return (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.type} - {r.capacity}座) {isMatching ? '★推荐类型匹配' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 5. 一键保存 */}
              <button
                type="submit"
                className="w-full py-3 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors cursor-pointer mt-4 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">save</span>
                一键保存手动排课
              </button>
            </form>
          </div>

          {/* Right Status Overview */}
          <div className="lg:col-span-2 border border-[#1A1A1A] bg-[#FDFCFB] p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-serif italic font-bold text-[#1A1A1A] border-b border-[#1A1A1A] pb-3 mb-6 flex items-center justify-between">
                <span>课程排课状态监控</span>
                <span className="text-xs font-mono font-normal">
                  已手动排课 {assignments.length} 个节次
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
                {dataset.courses.map((course) => {
                  const scheduled = countAssigned(course.id);
                  const isComplete = scheduled >= course.weeklyHours;
                  const group = dataset.groups.find((g) => g.id === course.groupId);
                  const teacher = dataset.teachers.find((t) => t.id === course.teacherId);

                  return (
                    <div
                      key={course.id}
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        if (course.teacherId) setSelectedTeacherFilterId(course.teacherId);
                      }}
                      className={`p-4 border transition-all cursor-pointer ${
                        selectedCourseId === course.id
                          ? 'border-2 border-[#1A1A1A] bg-[#F4F2F0]'
                          : 'border-[#1A1A1A] hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-serif italic font-bold text-base text-[#1A1A1A]">{course.name}</h4>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold ${
                            isComplete ? 'bg-emerald-800 text-white' : 'bg-amber-100 text-amber-900 border border-amber-800'
                          }`}
                        >
                          {scheduled} / {course.weeklyHours} 节
                        </span>
                      </div>
                      <div className="text-xs text-neutral-600 font-mono space-y-0.5">
                        <p>班级: {group?.name || '班级'}</p>
                        <p>教师: {teacher?.name || '待定'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode B: Auto Scheduling */}
      {scheduleMode === 'auto' && (
        <div className="border border-[#1A1A1A] bg-[#FDFCFB] p-8 max-w-3xl mx-auto text-center my-6">
          <span className="material-symbols-outlined text-6xl text-[#1A1A1A] mb-3">auto_awesome</span>
          <h3 className="text-2xl font-serif italic font-bold text-[#1A1A1A] mb-2">
            算法全自动智能排课引擎
          </h3>
          <p className="text-xs text-neutral-600 max-w-md mx-auto mb-8 leading-relaxed">
            算法将根据机构录入的教师禁排时段、教室场地类型、班级课时量及连课限制，自动进行约束求解与碰撞规避，全自动秒级生成冲突极低的优化课表。
          </p>

          <div className="p-4 border border-[#1A1A1A] bg-[#F4F2F0] text-left text-xs mb-8 space-y-2 font-mono max-w-lg mx-auto">
            <p className="font-bold border-b border-neutral-300 pb-1 text-[#1A1A1A]">排课引擎检查参数:</p>
            <p>✓ 课程计划: {dataset.courses.length} 门</p>
            <p>✓ 教师团队: {dataset.teachers.length} 名 (检查禁排避让)</p>
            <p>✓ 教室场地: {dataset.rooms.length} 间 (匹配场地类型与容量)</p>
            <p>✓ 上课时段: 一周 {dataset.timeConfig.days.length} 天 × {dataset.timeConfig.periods.filter(p=>!p.isBreak).length} 节</p>
          </div>

          <button
            onClick={onRunAutoSchedule}
            disabled={isScheduling || dataset.courses.length === 0}
            className="px-8 py-4 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-sm uppercase tracking-[0.25em] font-bold transition-all inline-flex items-center gap-3 cursor-pointer disabled:opacity-50 border border-[#1A1A1A] shadow-lg"
          >
            <span className={`material-symbols-outlined text-xl ${isScheduling ? 'animate-spin' : ''}`}>
              {isScheduling ? 'autorenew' : 'bolt'}
            </span>
            {isScheduling ? '智能算法排课中...' : '开始算法全自动排课'}
          </button>
        </div>
      )}
    </div>
  );
};
