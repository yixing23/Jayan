import React, { useState } from 'react';
import { ScheduleDataset, SlotAssignment } from '../types';
import { getDayIndexFromDateString, formatChineseDateShort } from '../utils/dateUtils';

interface SlotEditModalProps {
  dayIndex: number;
  periodIndex: number;
  existingAssignment?: SlotAssignment;
  initialSpecificDate?: string;
  dataset: ScheduleDataset;
  onSave: (assignment: SlotAssignment) => void;
  onDelete?: (assignmentId: string) => void;
  onClose: () => void;
}

export const SlotEditModal: React.FC<SlotEditModalProps> = ({
  dayIndex: initialDayIndex,
  periodIndex,
  existingAssignment,
  initialSpecificDate,
  dataset,
  onSave,
  onDelete,
  onClose,
}) => {
  const [specificDate, setSpecificDate] = useState<string>(
    existingAssignment?.specificDate || initialSpecificDate || ''
  );
  const [dayIndex, setDayIndex] = useState<number>(() => {
    if (existingAssignment?.specificDate) {
      return getDayIndexFromDateString(existingAssignment.specificDate);
    }
    if (initialSpecificDate) {
      return getDayIndexFromDateString(initialSpecificDate);
    }
    return initialDayIndex;
  });

  const dayName = dataset.timeConfig.days[dayIndex] || `Day ${dayIndex + 1}`;
  const period = dataset.timeConfig.periods[periodIndex];

  // Selected values initialization with dataset fallbacks
  const initialCourseId = existingAssignment?.courseId || dataset.courses[0]?.id || '';
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId);

  const initialCourse = dataset.courses.find((c) => c.id === selectedCourseId) || dataset.courses[0];

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => {
    if (existingAssignment?.teacherId && dataset.teachers.some((t) => t.id === existingAssignment.teacherId)) {
      return existingAssignment.teacherId;
    }
    if (initialCourse?.teacherId && dataset.teachers.some((t) => t.id === initialCourse.teacherId)) {
      return initialCourse.teacherId;
    }
    return dataset.teachers[0]?.id || '';
  });

  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => {
    if (existingAssignment?.roomId && dataset.rooms.some((r) => r.id === existingAssignment.roomId)) {
      return existingAssignment.roomId;
    }
    return dataset.rooms[0]?.id || '';
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    if (existingAssignment?.groupId && dataset.groups.some((g) => g.id === existingAssignment.groupId)) {
      return existingAssignment.groupId;
    }
    if (initialCourse?.groupId && dataset.groups.some((g) => g.id === initialCourse.groupId)) {
      return initialCourse.groupId;
    }
    return dataset.groups[0]?.id || '';
  });

  const [studentNames, setStudentNames] = useState<string>(
    existingAssignment?.studentNames || initialCourse?.studentNames || ''
  );

  const [teachingMode, setTeachingMode] = useState<'group' | 'one_on_one' | 'one_on_two' | 'one_on_n'>(() => {
    if (existingAssignment?.teachingMode) return existingAssignment.teachingMode;
    if (initialCourse?.teachingMode) return initialCourse.teachingMode;
    const names = existingAssignment?.studentNames || initialCourse?.studentNames || '';
    if (names.includes('、') || names.includes(',')) return 'one_on_two';
    if (names.trim()) return 'one_on_one';
    return 'group';
  });

  const [isLocked, setIsLocked] = useState<boolean>(existingAssignment?.isLocked || false);
  const [formError, setFormError] = useState<string | null>(null);

  // Extract quick suggestions for student names from classHourAccounts or existing assignments
  const quickStudentSuggestions = Array.from(
    new Set([
      ...(dataset.classHourAccounts || []).map((a) => a.studentName).filter(Boolean),
      ...(dataset.assignments || []).map((a) => a.studentNames).filter(Boolean),
    ])
  ).slice(0, 8);

  // When course selection changes, sync default teacher/group/students/mode if available
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setFormError(null);
    const course = dataset.courses.find((c) => c.id === courseId);
    if (course) {
      if (course.teacherId && dataset.teachers.some((t) => t.id === course.teacherId)) {
        setSelectedTeacherId(course.teacherId);
      }
      if (course.groupId && dataset.groups.some((g) => g.id === course.groupId)) {
        setSelectedGroupId(course.groupId);
      }
      if (course.studentNames && !existingAssignment?.studentNames) {
        setStudentNames(course.studentNames);
      }
      if (course.teachingMode) {
        setTeachingMode(course.teachingMode);
      }
    }
  };

  const handleAddStudentNameSuggestion = (name: string) => {
    if (!name) return;
    if (!studentNames.trim()) {
      setStudentNames(name);
    } else if (!studentNames.includes(name)) {
      setStudentNames(`${studentNames.trim()}、${name}`);
    }
  };

  const handleSave = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (!selectedCourseId) {
      setFormError('请选择课程科目！若无可选项，请先在【课程管理】中创建课程。');
      return;
    }
    if (!selectedTeacherId) {
      setFormError('请选择授课教师！若无可选项，请先在【教师管理】中创建教师。');
      return;
    }
    let targetGroupId = selectedGroupId;
    if (teachingMode === 'group') {
      if (!targetGroupId) {
        setFormError('请选择授课班级！若无可选项，请先在【课程/基础设置】中创建班级。');
        return;
      }
    } else {
      // 1-on-1, 1-on-2, 1-on-N tutoring mode: student names required, class group optional/auto
      if (!studentNames.trim()) {
        setFormError('请输入学员姓名！(一对一/一对二个训模式无需选择班级，但需要绑定学员姓名以扣扣课时)');
        return;
      }
      if (!targetGroupId) {
        targetGroupId = dataset.groups[0]?.id || 'g_individual';
      }
    }

    const assignment: SlotAssignment = {
      id: existingAssignment?.id || `assign_manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      courseId: selectedCourseId,
      teacherId: selectedTeacherId,
      roomId: selectedRoomId,
      groupId: targetGroupId,
      dayIndex,
      periodIndex,
      specificDate: specificDate.trim() || undefined,
      isLocked,
      teachingMode,
      studentNames: studentNames.trim() || undefined,
    };

    onSave(assignment);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-[#FDFCFB] border-2 border-[#1A1A1A] max-w-md w-full p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#1A1A1A] pb-3 mb-5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
              手动排课与调整
            </span>
            <h3 className="text-xl font-serif font-bold text-[#1A1A1A]">
              {dayName} — {period?.name || `第${periodIndex + 1}节`} ({period?.startTime || '08:00'}-{period?.endTime || '10:00'})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#F4F2F0] cursor-pointer text-[#1A1A1A]"
            type="button"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Validation error notice */}
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-600 text-red-900 text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-red-700">error</span>
            <span>{formError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Specific Date Picker (Calendar) */}
          <div className="bg-[#F4F2F0] p-2.5 border border-[#1A1A1A]">
            <label className="block text-[10px] uppercase font-bold tracking-wider text-amber-950 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1 font-bold">
                <span className="material-symbols-outlined text-sm text-amber-800">calendar_month</span>
                排课具体日期 (日历选择)
              </span>
              <span className="text-[10px] font-mono text-amber-900">
                {specificDate ? formatChineseDateShort(specificDate) : `默认按周度重复 (${dayName})`}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={specificDate}
                onChange={(e) => {
                  const dVal = e.target.value;
                  setSpecificDate(dVal);
                  if (dVal) {
                    setDayIndex(getDayIndexFromDateString(dVal));
                  }
                }}
                className="w-full bg-white border border-[#1A1A1A] px-2.5 py-1.5 text-xs font-bold text-[#1A1A1A] focus:outline-none"
              />
              {specificDate && (
                <button
                  type="button"
                  onClick={() => setSpecificDate('')}
                  className="px-2 py-1 bg-white border border-neutral-400 text-[10px] font-bold text-neutral-600 hover:text-red-700 hover:border-red-600 shrink-0 cursor-pointer"
                  title="清除具体日期，恢复每周通用排课"
                >
                  清除具体日期
                </button>
              )}
            </div>
          </div>

          {/* Select Course */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
              选择课程科目 *
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-serif font-bold text-[#1A1A1A] focus:outline-none"
            >
              {dataset.courses.length === 0 ? (
                <option value="">-- 无可用课程 --</option>
              ) : (
                dataset.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Select Teaching/Scheduling Mode */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1 flex justify-between items-center">
              <span className="flex items-center gap-1 font-bold text-[#1A1A1A]">
                <span className="material-symbols-outlined text-sm text-amber-800">tune</span>
                排课/授课模式 *
              </span>
              <span className="text-[10px] text-amber-900 font-mono font-bold">
                {teachingMode === 'group' && '班级团课 (多人常规班)'}
                {teachingMode === 'one_on_one' && '1对1 专属辅导 (消扣1人课时)'}
                {teachingMode === 'one_on_two' && '1对2 双人辅导 (消扣2人课时)'}
                {teachingMode === 'one_on_n' && '1对N 小班辅导 (按人头消课)'}
              </span>
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#F4F2F0] border border-[#1A1A1A]">
              <button
                type="button"
                onClick={() => setTeachingMode('group')}
                className={`py-2 px-1 text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  teachingMode === 'group'
                    ? 'bg-[#1A1A1A] text-white shadow-xs'
                    : 'bg-white text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                <span className="material-symbols-outlined text-base">groups</span>
                <span className="text-[10px]">班级团课</span>
              </button>

              <button
                type="button"
                onClick={() => setTeachingMode('one_on_one')}
                className={`py-2 px-1 text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  teachingMode === 'one_on_one'
                    ? 'bg-amber-900 text-white shadow-xs'
                    : 'bg-white text-amber-900 hover:bg-amber-50'
                }`}
              >
                <span className="material-symbols-outlined text-base">person</span>
                <span className="text-[10px]">1对1辅导</span>
              </button>

              <button
                type="button"
                onClick={() => setTeachingMode('one_on_two')}
                className={`py-2 px-1 text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  teachingMode === 'one_on_two'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'bg-white text-purple-900 hover:bg-purple-50'
                }`}
              >
                <span className="material-symbols-outlined text-base">group</span>
                <span className="text-[10px]">1对2辅导</span>
              </button>

              <button
                type="button"
                onClick={() => setTeachingMode('one_on_n')}
                className={`py-2 px-1 text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  teachingMode === 'one_on_n'
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'bg-white text-emerald-900 hover:bg-emerald-50'
                }`}
              >
                <span className="material-symbols-outlined text-base">diversity_3</span>
                <span className="text-[10px]">1对N小班</span>
              </button>
            </div>
          </div>

          {/* Select Teacher */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
              授课教师 *
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => {
                setSelectedTeacherId(e.target.value);
                setFormError(null);
              }}
              className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none"
            >
              {dataset.teachers.length === 0 ? (
                <option value="">-- 无可用教师 --</option>
              ) : (
                dataset.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Select Classroom */}
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
              上课教室 / 场地 (选填 / 可不指定)
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => {
                setSelectedRoomId(e.target.value);
                setFormError(null);
              }}
              className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none"
            >
              <option value="">-- 不指定教室 / 暂无场地 (选填) --</option>
              {dataset.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} [{r.type}, 容量: {r.capacity}人]
                </option>
              ))}
            </select>
          </div>

          {/* Select Student Group: ONLY required and shown for Group Class mode */}
          {teachingMode === 'group' ? (
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                授课班级 *
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value);
                  setFormError(null);
                }}
                className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none"
              >
                {dataset.groups.length === 0 ? (
                  <option value="">-- 无可用班级 --</option>
                ) : (
                  dataset.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.size}人)
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            /* Student Names Input for 1v1 / 1v2 / 1vN */
            <div className="bg-amber-50 p-3 border border-amber-300">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-amber-950 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-amber-800">person</span>
                  学员/学生姓名 * (免选班级，直接输入)
                </label>
                <span className="text-[10px] text-amber-900 font-mono font-bold">按人消课模式</span>
              </div>
              <input
                type="text"
                placeholder={
                  teachingMode === 'one_on_one'
                    ? '如: 张三'
                    : teachingMode === 'one_on_two'
                    ? '如: 张三、李四'
                    : '如: 张三、李四、王五'
                }
                value={studentNames}
                onChange={(e) => {
                  setStudentNames(e.target.value);
                  setFormError(null);
                }}
                className="w-full bg-white border border-[#1A1A1A] px-3 py-2 text-xs font-bold text-[#1A1A1A] focus:outline-none"
              />
              {quickStudentSuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-amber-900 font-bold">快速选学员:</span>
                  {quickStudentSuggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleAddStudentNameSuggestion(name)}
                      className="px-2 py-0.5 bg-white border border-amber-300 hover:border-[#1A1A1A] text-[10px] font-bold text-amber-950 hover:bg-amber-100 cursor-pointer transition-colors"
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-amber-900 font-bold mt-1.5 flex items-center gap-1 bg-amber-100/70 p-1 border border-amber-300">
                <span className="material-symbols-outlined text-xs text-amber-800">bolt</span>
                <span>保存后后台将依据输入的学员姓名自动划扣 1 节课时。</span>
              </p>
            </div>
          )}

          {/* Student Names Optional (Only for Group Class mode) */}
          {teachingMode === 'group' && (
            <div className="bg-[#F4F2F0] p-3 border border-neutral-300 rounded-none">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-amber-900 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-amber-700">person</span>
                  附加学员姓名 (可选)
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">选填</span>
              </div>
              <input
                type="text"
                placeholder="如: 张三 或 张三、李四"
                value={studentNames}
                onChange={(e) => setStudentNames(e.target.value)}
                className="w-full bg-white border border-[#1A1A1A] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] focus:outline-none placeholder:text-neutral-400 placeholder:font-normal"
              />
              {quickStudentSuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-neutral-500">快速填充:</span>
                  {quickStudentSuggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleAddStudentNameSuggestion(name)}
                      className="px-2 py-0.5 bg-white border border-neutral-300 hover:border-[#1A1A1A] text-[10px] font-bold text-neutral-800 hover:bg-neutral-100 cursor-pointer transition-colors"
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lock / Pin Toggle */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="lockCheck"
              checked={isLocked}
              onChange={(e) => setIsLocked(e.target.checked)}
              className="w-4 h-4 accent-[#1A1A1A] cursor-pointer"
            />
            <label htmlFor="lockCheck" className="text-xs font-bold text-[#1A1A1A] cursor-pointer">
              锁定此课时（算法排课时不会自动变动）
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-[#1A1A1A] mt-6">
            {existingAssignment && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(existingAssignment.id)}
                className="px-3 py-2 bg-red-100 text-red-900 border border-red-300 hover:bg-red-200 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
              >
                删除课时
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#1A1A1A] text-xs font-bold uppercase tracking-wider hover:bg-[#F4F2F0] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 cursor-pointer transition-all active:scale-[0.98]"
              >
                保存课表排期
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

