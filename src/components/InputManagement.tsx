import React, { useState } from 'react';
import { Course, PeriodConfig, Room, RoomType, ScheduleDataset, StudentGroup, Teacher, TimeConfig, TimeSlot } from '../types';
import { PRESET_TIME_CONFIG_GROUP, PRESET_TIME_CONFIG_VIP_INTEGER, PRESET_TIME_CONFIG_VIP_HALF, SAMPLE_INSTITUTION_DATASET } from '../data/samplePresets';

interface InputManagementProps {
  dataset: ScheduleDataset;
  onUpdateDataset: (updated: ScheduleDataset) => void;
}

export const InputManagement: React.FC<InputManagementProps> = ({ dataset, onUpdateDataset }) => {
  const [activeSubTab, setActiveSubTab] = useState<'courses' | 'teachers' | 'rooms' | 'groups' | 'time' | 'tools'>('courses');

  // Edit State
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);

  // Forms for adding
  const [courseForm, setCourseForm] = useState<Partial<Course>>({
    code: '',
    name: '',
    groupId: dataset.groups[0]?.id || '',
    teacherId: dataset.teachers[0]?.id || '',
    weeklyHours: 3,
    maxConsecutiveHours: 1,
    requiredRoomType: 'General',
  });

  const [teacherForm, setTeacherForm] = useState<Partial<Teacher>>({
    name: '',
    email: '',
    maxHoursPerWeek: 20,
    maxHoursPerDay: 5,
    unavailableSlots: [],
  });

  const [roomForm, setRoomForm] = useState<Partial<Room>>({
    name: '',
    building: '教学楼',
    type: 'General',
    capacity: 40,
  });

  const [groupForm, setGroupForm] = useState<Partial<StudentGroup>>({
    name: '',
    size: 40,
  });

  // Time config addition state
  const [newDayName, setNewDayName] = useState('');
  const [newPeriod, setNewPeriod] = useState<{ name: string; startTime: string; endTime: string; isBreak: boolean }>({
    name: '',
    startTime: '08:00',
    endTime: '08:45',
    isBreak: false,
  });

  // JSON Import
  const [jsonInput, setJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const roomTypes: { value: RoomType; label: string }[] = [
    { value: 'General', label: '普通教室 (General)' },
    { value: 'Science Lab', label: '理科实验室 (Science Lab)' },
    { value: 'Computer Lab', label: '计算机机房 (Computer Lab)' },
    { value: 'Auditorium', label: '阶梯报告厅 (Auditorium)' },
    { value: 'Gymnasium', label: '体育场馆 (Gymnasium)' },
    { value: 'Workshop', label: '创客/实训室 (Workshop)' },
    { value: 'Art Studio', label: '美术音乐画室 (Art Studio)' },
  ];

  // Helper colors
  const getRandomColor = () => {
    const palette = ['#2563eb', '#059669', '#7c3aed', '#d97706', '#dc2626', '#db2777', '#0284c7', '#4f46e5', '#0d9488'];
    return palette[Math.floor(Math.random() * palette.length)];
  };

  // --- Handlers: Courses ---
  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.name || !courseForm.code) return;

    const newCourse: Course = {
      id: `c_${Date.now()}`,
      code: courseForm.code.trim().toUpperCase(),
      name: courseForm.name.trim(),
      groupId: courseForm.groupId || dataset.groups[0]?.id || '',
      teacherId: courseForm.teacherId || '',
      weeklyHours: Number(courseForm.weeklyHours) || 3,
      maxConsecutiveHours: Number(courseForm.maxConsecutiveHours) || 1,
      requiredRoomType: (courseForm.requiredRoomType as RoomType) || 'General',
      color: getRandomColor(),
    };

    onUpdateDataset({
      ...dataset,
      courses: [...dataset.courses, newCourse],
    });

    setCourseForm({
      code: '',
      name: '',
      groupId: dataset.groups[0]?.id || '',
      teacherId: dataset.teachers[0]?.id || '',
      weeklyHours: 3,
      maxConsecutiveHours: 1,
      requiredRoomType: 'General',
    });
  };

  const handleUpdateCourse = (updated: Course) => {
    onUpdateDataset({
      ...dataset,
      courses: dataset.courses.map((c) => (c.id === updated.id ? updated : c)),
    });
    setEditingCourse(null);
  };

  const handleDeleteCourse = (id: string) => {
    onUpdateDataset({
      ...dataset,
      courses: dataset.courses.filter((c) => c.id !== id),
      assignments: dataset.assignments.filter((a) => a.courseId !== id),
    });
  };

  // --- Handlers: Teachers ---
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name) return;

    const newTeacher: Teacher = {
      id: `t_${Date.now()}`,
      name: teacherForm.name.trim(),
      email: teacherForm.email?.trim() || '',
      color: getRandomColor(),
      qualifiedSubjectIds: [],
      maxHoursPerWeek: Number(teacherForm.maxHoursPerWeek) || 20,
      maxHoursPerDay: Number(teacherForm.maxHoursPerDay) || 5,
      unavailableSlots: teacherForm.unavailableSlots || [],
    };

    onUpdateDataset({
      ...dataset,
      teachers: [...dataset.teachers, newTeacher],
    });

    setTeacherForm({
      name: '',
      email: '',
      maxHoursPerWeek: 20,
      maxHoursPerDay: 5,
      unavailableSlots: [],
    });
  };

  const handleUpdateTeacher = (updated: Teacher) => {
    onUpdateDataset({
      ...dataset,
      teachers: dataset.teachers.map((t) => (t.id === updated.id ? updated : t)),
    });
    setEditingTeacher(null);
  };

  const handleDeleteTeacher = (id: string) => {
    onUpdateDataset({
      ...dataset,
      teachers: dataset.teachers.filter((t) => t.id !== id),
    });
  };

  const toggleTeacherUnavailableSlot = (teacher: Teacher, dayIndex: number, periodIndex: number) => {
    const exists = teacher.unavailableSlots.some((s) => s.dayIndex === dayIndex && s.periodIndex === periodIndex);
    let updatedSlots: TimeSlot[];
    if (exists) {
      updatedSlots = teacher.unavailableSlots.filter((s) => !(s.dayIndex === dayIndex && s.periodIndex === periodIndex));
    } else {
      updatedSlots = [...teacher.unavailableSlots, { dayIndex, periodIndex }];
    }

    const updatedTeacher = { ...teacher, unavailableSlots: updatedSlots };
    if (editingTeacher && editingTeacher.id === teacher.id) {
      setEditingTeacher(updatedTeacher);
    } else {
      handleUpdateTeacher(updatedTeacher);
    }
  };

  // --- Handlers: Rooms ---
  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.name) return;

    const newRoom: Room = {
      id: `r_${Date.now()}`,
      name: roomForm.name.trim(),
      building: roomForm.building?.trim() || '教学楼',
      type: (roomForm.type as RoomType) || 'General',
      capacity: Number(roomForm.capacity) || 40,
    };

    onUpdateDataset({
      ...dataset,
      rooms: [...dataset.rooms, newRoom],
    });

    setRoomForm({
      name: '',
      building: '教学楼',
      type: 'General',
      capacity: 40,
    });
  };

  const handleUpdateRoom = (updated: Room) => {
    onUpdateDataset({
      ...dataset,
      rooms: dataset.rooms.map((r) => (r.id === updated.id ? updated : r)),
    });
    setEditingRoom(null);
  };

  const handleDeleteRoom = (id: string) => {
    onUpdateDataset({
      ...dataset,
      rooms: dataset.rooms.filter((r) => r.id !== id),
    });
  };

  // --- Handlers: Student Groups ---
  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name) return;

    const newGroup: StudentGroup = {
      id: `g_${Date.now()}`,
      name: groupForm.name.trim(),
      size: Number(groupForm.size) || 40,
      color: getRandomColor(),
    };

    onUpdateDataset({
      ...dataset,
      groups: [...dataset.groups, newGroup],
    });

    setGroupForm({ name: '', size: 40 });
  };

  const handleUpdateGroup = (updated: StudentGroup) => {
    onUpdateDataset({
      ...dataset,
      groups: dataset.groups.map((g) => (g.id === updated.id ? updated : g)),
    });
    setEditingGroup(null);
  };

  const handleDeleteGroup = (id: string) => {
    onUpdateDataset({
      ...dataset,
      groups: dataset.groups.filter((g) => g.id !== id),
    });
  };

  // --- Handlers: Schedule Time Config ---
  const handleApplyTimeConfig = (config: TimeConfig) => {
    onUpdateDataset({
      ...dataset,
      timeConfig: config,
    });
  };

  const handleAddDay = () => {
    if (!newDayName.trim()) return;
    if (dataset.timeConfig.days.includes(newDayName.trim())) return;

    onUpdateDataset({
      ...dataset,
      timeConfig: {
        ...dataset.timeConfig,
        days: [...dataset.timeConfig.days, newDayName.trim()],
      },
    });
    setNewDayName('');
  };

  const handleRemoveDay = (dayIndex: number) => {
    if (dataset.timeConfig.days.length <= 1) return;
    const updatedDays = dataset.timeConfig.days.filter((_, idx) => idx !== dayIndex);
    onUpdateDataset({
      ...dataset,
      timeConfig: {
        ...dataset.timeConfig,
        days: updatedDays,
      },
    });
  };

  const handleAddPeriod = () => {
    if (!newPeriod.name?.trim()) return;

    const nextIndex = dataset.timeConfig.periods.length;
    const periodObj: PeriodConfig = {
      index: nextIndex,
      name: newPeriod.name.trim(),
      startTime: newPeriod.startTime || '08:00',
      endTime: newPeriod.endTime || '08:45',
      isBreak: newPeriod.isBreak,
    };

    onUpdateDataset({
      ...dataset,
      timeConfig: {
        ...dataset.timeConfig,
        periods: [...dataset.timeConfig.periods, periodObj],
      },
    });

    setNewPeriod({ name: '', startTime: '08:00', endTime: '08:45', isBreak: false });
  };

  const handleRemovePeriod = (periodIndex: number) => {
    if (dataset.timeConfig.periods.length <= 1) return;
    const updatedPeriods = dataset.timeConfig.periods
      .filter((_, idx) => idx !== periodIndex)
      .map((p, idx) => ({ ...p, index: idx }));

    onUpdateDataset({
      ...dataset,
      timeConfig: {
        ...dataset.timeConfig,
        periods: updatedPeriods,
      },
    });
  };

  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // --- Handlers: Data Actions ---
  const handleClearAllData = () => {
    onUpdateDataset({
      id: 'custom-edu-org',
      name: '新知学堂（新教务方案）',
      description: '机构自定义排课方案，包含完整的教师、课程、教室及班级配置。',
      timeConfig: dataset.timeConfig,
      rooms: [],
      teachers: [],
      groups: [],
      courses: [],
      assignments: [],
    });
    setConfirmClearAll(false);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${dataset.name || 'schedule-config'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = () => {
    setImportStatus(null);
    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.timeConfig || !Array.isArray(parsed.courses) || !Array.isArray(parsed.teachers)) {
        setImportStatus('错误: JSON数据格式不符合标准排课方案规范！');
        return;
      }
      onUpdateDataset(parsed);
      setImportStatus('成功: 机构排课方案已成功导入！');
      setJsonInput('');
    } catch (e) {
      setImportStatus('错误: JSON语法不正确，请检查粘贴的内容。');
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
      {/* Quick Toolbar for fast sample loading and institution management */}
      <div className="mb-4 bg-[#F4F2F0] border border-[#1A1A1A] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-700 text-base">auto_fix_high</span>
          <span className="font-serif font-bold text-xs text-[#1A1A1A]">快捷教务数据操作：</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onUpdateDataset(SAMPLE_INSTITUTION_DATASET)}
            className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            title="一键加载配套的全套标准教务示例数据 (包含教师、教室、班级及课程)"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            一键加载示例数据
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('tools')}
            className="px-3 py-1 bg-white hover:bg-neutral-100 text-[#1A1A1A] border border-[#1A1A1A] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">swap_vert</span>
            导入/导出JSON方案
          </button>
          <button
            type="button"
            onClick={() => setConfirmClearAll(true)}
            className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-700 border border-red-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">delete_sweep</span>
            一键清空重置
          </button>
        </div>
      </div>

      {/* Top Section */}
      <div className="mb-6 border-b border-[#1A1A1A] pb-4 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
            Educational Entity Directory & Rules
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A]">
            教务基础参数与自定义配置
          </h2>
          <p className="text-xs text-neutral-600 mt-1">
            自定义教育机构的教师、课程、班级及教室场地；可灵活设置节次时间，支持一键清空或导入导出。
          </p>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex flex-wrap border border-[#1A1A1A] text-xs font-bold uppercase tracking-wider bg-[#F4F2F0]">
          <button
            onClick={() => setActiveSubTab('courses')}
            className={`px-3 py-2 cursor-pointer transition-colors ${
              activeSubTab === 'courses' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
            }`}
          >
            课程计划 ({dataset.courses.length})
          </button>
          <button
            onClick={() => setActiveSubTab('teachers')}
            className={`px-3 py-2 cursor-pointer transition-colors ${
              activeSubTab === 'teachers' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
            }`}
          >
            教师团队 ({dataset.teachers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('rooms')}
            className={`px-3 py-2 cursor-pointer transition-colors ${
              activeSubTab === 'rooms' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
            }`}
          >
            教室场地 ({dataset.rooms.length})
          </button>
          <button
            onClick={() => setActiveSubTab('groups')}
            className={`px-3 py-2 cursor-pointer transition-colors ${
              activeSubTab === 'groups' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
            }`}
          >
            班级学员 ({dataset.groups.length})
          </button>
          <button
            onClick={() => setActiveSubTab('time')}
            className={`px-3 py-2 cursor-pointer transition-colors ${
              activeSubTab === 'time' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
            }`}
          >
            授课时段
          </button>
          <button
            onClick={() => setActiveSubTab('tools')}
            className={`px-3 py-2 cursor-pointer transition-colors ${
              activeSubTab === 'tools' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
            }`}
          >
            方案管理
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form / Action Column */}
        <div className="lg:col-span-1 border border-[#1A1A1A] p-6 bg-[#FDFCFB] flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-serif italic font-bold text-[#1A1A1A] border-b border-[#1A1A1A] pb-3 mb-6">
              {activeSubTab === 'courses' && '添加新课程计划'}
              {activeSubTab === 'teachers' && '录入教职工成员'}
              {activeSubTab === 'rooms' && '录入教室/教学场地'}
              {activeSubTab === 'groups' && '创建班级/教学班'}
              {activeSubTab === 'time' && '配置授课时间段与节次'}
              {activeSubTab === 'tools' && '机构方案管理与导入导出'}
            </h3>

            {/* Courses Form */}
            {activeSubTab === 'courses' && (
              <form onSubmit={handleAddCourse} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    课程代码 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如: MATH-101 或 ENG-202"
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    课程名称 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如: 高等数学 (代数与几何)"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-serif italic font-bold focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                      上课班级 *
                    </label>
                    <select
                      value={courseForm.groupId}
                      onChange={(e) => setCourseForm({ ...courseForm, groupId: e.target.value })}
                      className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2.5 py-2 text-xs font-medium focus:outline-none"
                    >
                      {dataset.groups.length === 0 && <option value="">(请先创建班级)</option>}
                      {dataset.groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                      授课教师
                    </label>
                    <select
                      value={courseForm.teacherId}
                      onChange={(e) => setCourseForm({ ...courseForm, teacherId: e.target.value })}
                      className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2.5 py-2 text-xs font-medium focus:outline-none"
                    >
                      <option value="">待定 / 待分配</option>
                      {dataset.teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                      周课时节数
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={courseForm.weeklyHours}
                      onChange={(e) => setCourseForm({ ...courseForm, weeklyHours: Number(e.target.value) })}
                      className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                      单日最大连课节数
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={courseForm.maxConsecutiveHours}
                      onChange={(e) => setCourseForm({ ...courseForm, maxConsecutiveHours: Number(e.target.value) })}
                      className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    指定教室场地要求
                  </label>
                  <select
                    value={courseForm.requiredRoomType}
                    onChange={(e) => setCourseForm({ ...courseForm, requiredRoomType: e.target.value as RoomType })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2.5 py-2 text-xs font-medium focus:outline-none"
                  >
                    {roomTypes.map((rt) => (
                      <option key={rt.value} value={rt.value}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors cursor-pointer mt-4"
                >
                  保存并添加课程
                </button>
              </form>
            )}

            {/* Teachers Form */}
            {activeSubTab === 'teachers' && (
              <form onSubmit={handleAddTeacher} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    教师姓名 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如: 张伟 老师"
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-serif italic font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    联系邮箱 / 账号
                  </label>
                  <input
                    type="text"
                    placeholder="如: zhangwei@school.edu.cn"
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                      周最大工作课时
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={teacherForm.maxHoursPerWeek}
                      onChange={(e) => setTeacherForm({ ...teacherForm, maxHoursPerWeek: Number(e.target.value) })}
                      className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                      日最大授课节数
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={teacherForm.maxHoursPerDay}
                      onChange={(e) => setTeacherForm({ ...teacherForm, maxHoursPerDay: Number(e.target.value) })}
                      className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors cursor-pointer mt-4"
                >
                  录入教师档案
                </button>
              </form>
            )}

            {/* Rooms Form */}
            {activeSubTab === 'rooms' && (
              <form onSubmit={handleAddRoom} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    教室/场地名称 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如: 教学楼 101教室"
                    value={roomForm.name}
                    onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-serif italic font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    所在楼宇/区域
                  </label>
                  <input
                    type="text"
                    placeholder="如: 主教学楼 / 实验楼"
                    value={roomForm.building}
                    onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                      场地设施类型
                    </label>
                    <select
                      value={roomForm.type}
                      onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value as RoomType })}
                      className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2 py-2 text-xs focus:outline-none"
                    >
                      {roomTypes.map((rt) => (
                        <option key={rt.value} value={rt.value}>
                          {rt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                      容纳人数 (座位)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={roomForm.capacity}
                      onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                      className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors cursor-pointer mt-4"
                >
                  保存教室场地
                </button>
              </form>
            )}

            {/* Groups Form */}
            {activeSubTab === 'groups' && (
              <form onSubmit={handleAddGroup} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    班级/班别名称 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如: 高一 (1) 班 / 2024级集训班"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-serif italic font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    班级学生人数
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={groupForm.size}
                    onChange={(e) => setGroupForm({ ...groupForm, size: Number(e.target.value) })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors cursor-pointer mt-4"
                >
                  添加班级
                </button>
              </form>
            )}

            {/* Time Settings Form */}
            {activeSubTab === 'time' && (
              <div className="space-y-6 text-xs">
                {/* Add Day */}
                <div>
                  <h4 className="font-bold text-[#1A1A1A] mb-2 uppercase tracking-wider text-[11px]">添加上课星期天数</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="如: 星期六 或 周日"
                      value={newDayName}
                      onChange={(e) => setNewDayName(e.target.value)}
                      className="flex-1 bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddDay}
                      className="px-4 py-2 bg-[#1A1A1A] text-white font-bold uppercase hover:bg-neutral-800 cursor-pointer"
                    >
                      添加
                    </button>
                  </div>
                </div>

                {/* Add Period Slot */}
                <div className="border-t border-[#1A1A1A] pt-4">
                  <h4 className="font-bold text-[#1A1A1A] mb-2 uppercase tracking-wider text-[11px]">新增单日节次</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5">节次名称</label>
                      <input
                        type="text"
                        placeholder="如: 晚自习第一节 / 课间休息"
                        value={newPeriod.name}
                        onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                        className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs focus:outline-none font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5">开始时间</label>
                        <input
                          type="time"
                          value={newPeriod.startTime}
                          onChange={(e) => setNewPeriod({ ...newPeriod, startTime: e.target.value })}
                          className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2 py-1.5 text-xs font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5">结束时间</label>
                        <input
                          type="time"
                          value={newPeriod.endTime}
                          onChange={(e) => setNewPeriod({ ...newPeriod, endTime: e.target.value })}
                          className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2 py-1.5 text-xs font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="isBreakCheck"
                        checked={newPeriod.isBreak}
                        onChange={(e) => setNewPeriod({ ...newPeriod, isBreak: e.target.checked })}
                        className="cursor-pointer"
                      />
                      <label htmlFor="isBreakCheck" className="text-xs cursor-pointer select-none">
                        设为非授课休息/午休时段
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPeriod}
                      className="w-full py-2.5 bg-[#1A1A1A] text-white font-bold uppercase tracking-wider hover:bg-neutral-800 cursor-pointer"
                    >
                      追加该节次
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tools & Preset Actions */}
            {activeSubTab === 'tools' && (
              <div className="space-y-6 text-xs">
                {/* Wipe Data */}
                <div className="p-4 border border-red-800 bg-red-50/50">
                  <h4 className="font-bold text-red-950 uppercase tracking-wider mb-1">一键清空预设数据</h4>
                  <p className="text-[11px] text-red-800 mb-3 leading-relaxed">
                    移除所有预设的教师、课程、教室与班级，开启全新自定义机构排课库。
                  </p>
                  {confirmClearAll ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearAllData}
                        className="flex-1 py-2 bg-red-700 text-white font-bold uppercase tracking-wider hover:bg-red-800 transition-colors cursor-pointer"
                      >
                        确定清空所有数据
                      </button>
                      <button
                        onClick={() => setConfirmClearAll(false)}
                        className="py-2 px-3 border border-red-800 text-red-900 font-bold hover:bg-red-100 cursor-pointer"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClearAll(true)}
                      className="w-full py-2 bg-red-700 text-white font-bold uppercase tracking-wider hover:bg-red-800 transition-colors cursor-pointer"
                    >
                      一键清空并重新建库
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Directory List / Data Management Column */}
        <div className="lg:col-span-2 border border-[#1A1A1A] bg-[#FDFCFB] flex flex-col justify-between">
          <div>
            <div className="p-4 bg-[#F4F2F0] border-b border-[#1A1A1A] flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]">
                {activeSubTab === 'courses' && '课程计划清单'}
                {activeSubTab === 'teachers' && '教师团队名录'}
                {activeSubTab === 'rooms' && '教室与场馆清单'}
                {activeSubTab === 'groups' && '班级学员名录'}
                {activeSubTab === 'time' && '授课时间与节次规则配置'}
                {activeSubTab === 'tools' && '机构方案 JSON 备份与恢复'}
              </span>
              {activeSubTab !== 'time' && activeSubTab !== 'tools' && (
                <span className="text-xs font-mono opacity-60">
                  当前数量: {dataset[activeSubTab]?.length || 0}
                </span>
              )}
            </div>

            <div className="divide-y divide-[#1A1A1A] max-h-[620px] overflow-y-auto">
              {/* --- Courses List --- */}
              {activeSubTab === 'courses' && (
                <>
                  {dataset.courses.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 text-xs font-mono">
                      暂无课程计划。请在左侧填写并添加自定义课程。
                    </div>
                  ) : (
                    dataset.courses.map((c) => {
                      const group = dataset.groups.find((g) => g.id === c.groupId);
                      const teacher = dataset.teachers.find((t) => t.id === c.teacherId);
                      return (
                        <div key={c.id} className="p-4 hover:bg-[#F4F2F0] transition-colors flex justify-between items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-1.5 py-0.5 bg-[#1A1A1A] text-white text-[10px] font-mono font-bold">
                                {c.code}
                              </span>
                              <h4 className="font-serif italic font-bold text-base text-[#1A1A1A] truncate">{c.name}</h4>
                            </div>
                            <div className="text-xs text-neutral-600 flex flex-wrap gap-x-4 gap-y-1">
                              <span>班级: <strong>{group?.name || '未指定'}</strong></span>
                              <span>任课教师: <strong>{teacher?.name || '待指定'}</strong></span>
                              <span>要求场地: <strong>{c.requiredRoomType}</strong></span>
                              <span>周课时: <strong>{c.weeklyHours}节/周</strong></span>
                              <span>连课限制: <strong>{c.maxConsecutiveHours}节</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingCourse(c)}
                              className="px-2.5 py-1 border border-[#1A1A1A] bg-white text-xs font-bold hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(c.id)}
                              className="p-1.5 text-neutral-400 hover:text-red-700 cursor-pointer transition-colors"
                              title="删除课程"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* --- Teachers List --- */}
              {activeSubTab === 'teachers' && (
                <>
                  {dataset.teachers.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 text-xs font-mono">
                      暂无教师数据。请在左侧录入教育机构的任课教师。
                    </div>
                  ) : (
                    dataset.teachers.map((t) => (
                      <div key={t.id} className="p-4 hover:bg-[#F4F2F0] transition-colors flex justify-between items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color || '#1A1A1A' }}></div>
                            <h4 className="font-serif italic font-bold text-base text-[#1A1A1A] truncate">{t.name}</h4>
                          </div>
                          <div className="text-xs text-neutral-600 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                            <span>邮箱: {t.email || '未填'}</span>
                            <span>周最大课时: {t.maxHoursPerWeek} 节</span>
                            <span>日最大课时: {t.maxHoursPerDay} 节</span>
                            {t.unavailableSlots.length > 0 && (
                              <span className="text-amber-800 font-bold">已禁排时段: {t.unavailableSlots.length} 处</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingTeacher(t)}
                            className="px-2.5 py-1 border border-[#1A1A1A] bg-white text-xs font-bold hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer"
                          >
                            编辑/避让
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(t.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-700 cursor-pointer transition-colors"
                            title="删除教师"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* --- Rooms List --- */}
              {activeSubTab === 'rooms' && (
                <>
                  {dataset.rooms.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 text-xs font-mono">
                      暂无教室场地数据。请在左侧录入教室信息。
                    </div>
                  ) : (
                    dataset.rooms.map((r) => (
                      <div key={r.id} className="p-4 hover:bg-[#F4F2F0] transition-colors flex justify-between items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-serif italic font-bold text-base text-[#1A1A1A] truncate">{r.name}</h4>
                            <span className="px-2 py-0.5 border border-[#1A1A1A] text-[9px] uppercase font-bold">
                              {r.type}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-600 flex gap-4">
                            <span>所属楼宇: {r.building || '主楼'}</span>
                            <span>座位容量: <strong>{r.capacity} 人</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingRoom(r)}
                            className="px-2.5 py-1 border border-[#1A1A1A] bg-white text-xs font-bold hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(r.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-700 cursor-pointer transition-colors"
                            title="删除教室"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* --- Groups List --- */}
              {activeSubTab === 'groups' && (
                <>
                  {dataset.groups.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 text-xs font-mono">
                      暂无班级数据。请在左侧创建上课班级。
                    </div>
                  ) : (
                    dataset.groups.map((g) => (
                      <div key={g.id} className="p-4 hover:bg-[#F4F2F0] transition-colors flex justify-between items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif italic font-bold text-base text-[#1A1A1A] mb-1 truncate">{g.name}</h4>
                          <div className="text-xs text-neutral-600 font-mono">
                            <span>班级规模: <strong>{g.size} 名学生</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingGroup(g)}
                            className="px-2.5 py-1 border border-[#1A1A1A] bg-white text-xs font-bold hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(g.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-700 cursor-pointer transition-colors"
                            title="删除班级"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* --- Time Config List --- */}
              {activeSubTab === 'time' && (
                <div className="p-6 space-y-6">
                  {/* Preset Quick Select Banner */}
                  <div className="bg-[#F4F2F0] border border-[#1A1A1A] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-700 text-base">schedule</span>
                      <span className="font-serif font-bold text-xs text-[#1A1A1A]">快速应用预置时段表 (周一至周日)：</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyTimeConfig(PRESET_TIME_CONFIG_GROUP)}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-[#1A1A1A] border border-[#1A1A1A] text-xs font-bold transition-colors cursor-pointer"
                      >
                        班课方案 (8:30-10:10...)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTimeConfig(PRESET_TIME_CONFIG_VIP_INTEGER)}
                        className="px-2.5 py-1 bg-white hover:bg-blue-100 text-[#1A1A1A] border border-[#1A1A1A] text-xs font-bold transition-colors cursor-pointer"
                      >
                        一对一/二 (整点)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTimeConfig(PRESET_TIME_CONFIG_VIP_HALF)}
                        className="px-2.5 py-1 bg-purple-900 text-white border border-purple-950 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                      >
                        一对一/二 (半点)
                      </button>
                    </div>
                  </div>

                  {/* Working Days */}
                  <div>
                    <h4 className="font-bold text-[#1A1A1A] text-sm mb-2">1. 每周授课工作日 ({dataset.timeConfig.days.length} 天)</h4>
                    <div className="flex flex-wrap gap-2">
                      {dataset.timeConfig.days.map((day, idx) => (
                        <div key={day} className="px-3 py-1.5 border border-[#1A1A1A] bg-[#F4F2F0] flex items-center gap-2 text-xs font-bold">
                          <span>{day}</span>
                          <button
                            onClick={() => handleRemoveDay(idx)}
                            className="text-neutral-400 hover:text-red-700 font-bold ml-1 cursor-pointer"
                            title="移除该日"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily Periods Table */}
                  <div className="border-t border-[#1A1A1A] pt-4">
                    <h4 className="font-bold text-[#1A1A1A] text-sm mb-2">2. 单日课时节次表 ({dataset.timeConfig.periods.length} 节)</h4>
                    <div className="border border-[#1A1A1A]">
                      <div className="grid grid-cols-12 bg-[#F4F2F0] p-2 text-[10px] font-bold uppercase tracking-wider border-b border-[#1A1A1A]">
                        <div className="col-span-1">序号</div>
                        <div className="col-span-4">节次名称</div>
                        <div className="col-span-3">起止时间</div>
                        <div className="col-span-3">属性</div>
                        <div className="col-span-1 text-right">操作</div>
                      </div>

                      {dataset.timeConfig.periods.map((p, pIdx) => (
                        <div key={pIdx} className="grid grid-cols-12 p-2.5 text-xs items-center border-b border-neutral-200 last:border-0 hover:bg-[#F4F2F0]">
                          <div className="col-span-1 font-mono font-bold">{pIdx + 1}</div>
                          <div className="col-span-4 font-bold text-[#1A1A1A]">{p.name}</div>
                          <div className="col-span-3 font-mono">{p.startTime} - {p.endTime}</div>
                          <div className="col-span-3">
                            {p.isBreak ? (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                                休息/午休
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold">
                                正式课时
                              </span>
                            )}
                          </div>
                          <div className="col-span-1 text-right">
                            <button
                              onClick={() => handleRemovePeriod(pIdx)}
                              className="text-neutral-400 hover:text-red-700 cursor-pointer font-bold"
                              title="删除节次"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* --- Tools: JSON Import / Export --- */}
              {activeSubTab === 'tools' && (
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="font-bold text-[#1A1A1A] text-sm mb-1">导出当前机构配置 (JSON)</h4>
                    <p className="text-xs text-neutral-600 mb-3">将当前教师、课程、教室及时间规则导出保存为配置文件。</p>
                    <button
                      onClick={handleExportJson}
                      className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      下载当前 JSON 配置文件
                    </button>
                  </div>

                  <div className="border-t border-[#1A1A1A] pt-4">
                    <h4 className="font-bold text-[#1A1A1A] text-sm mb-1">导入机构排课方案 (JSON)</h4>
                    <p className="text-xs text-neutral-600 mb-3">粘贴已有的 JSON 方案数据直接进行同步与载入：</p>
                    <textarea
                      rows={6}
                      placeholder="在此粘贴 JSON 文本数据..."
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      className="w-full p-3 border border-[#1A1A1A] bg-[#F4F2F0] text-xs font-mono focus:outline-none focus:bg-white mb-2"
                    />
                    {importStatus && (
                      <div className={`text-xs font-bold mb-3 ${importStatus.startsWith('成功') ? 'text-emerald-700' : 'text-red-700'}`}>
                        {importStatus}
                      </div>
                    )}
                    <button
                      onClick={handleImportJson}
                      className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      导入并应用方案
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- Edit Modals --- */}
      {/* Edit Course Modal */}
      {editingCourse && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingCourse(null);
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FDFCFB] border-2 border-[#1A1A1A] max-w-lg w-full p-6 shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-serif italic font-bold mb-4 border-b border-[#1A1A1A] pb-2">
              编辑课程信息: {editingCourse.name}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">课程代码</label>
                <input
                  type="text"
                  value={editingCourse.code}
                  onChange={(e) => setEditingCourse({ ...editingCourse, code: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">课程名称</label>
                <input
                  type="text"
                  value={editingCourse.name}
                  onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-1.5 font-serif italic font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">上课班级</label>
                  <select
                    value={editingCourse.groupId}
                    onChange={(e) => setEditingCourse({ ...editingCourse, groupId: e.target.value })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2 py-1.5"
                  >
                    {dataset.groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">任课教师</label>
                  <select
                    value={editingCourse.teacherId || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, teacherId: e.target.value })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2 py-1.5"
                  >
                    <option value="">未分配</option>
                    {dataset.teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">周课时节数</label>
                  <input
                    type="number"
                    min={1}
                    value={editingCourse.weeklyHours}
                    onChange={(e) => setEditingCourse({ ...editingCourse, weeklyHours: Number(e.target.value) })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">单日最大连课</label>
                  <input
                    type="number"
                    min={1}
                    value={editingCourse.maxConsecutiveHours}
                    onChange={(e) => setEditingCourse({ ...editingCourse, maxConsecutiveHours: Number(e.target.value) })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-1.5 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">教室场地需求</label>
                <select
                  value={editingCourse.requiredRoomType}
                  onChange={(e) => setEditingCourse({ ...editingCourse, requiredRoomType: e.target.value as RoomType })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2 py-1.5"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingCourse(null)}
                className="px-4 py-2 border border-[#1A1A1A] text-xs font-bold uppercase hover:bg-neutral-100"
              >
                取消
              </button>
              <button
                onClick={() => handleUpdateCourse(editingCourse)}
                className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-bold uppercase hover:bg-neutral-800"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal (Includes Unavailable Slots Grid) */}
      {editingTeacher && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingTeacher(null);
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FDFCFB] border-2 border-[#1A1A1A] max-w-xl w-full p-6 shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-serif italic font-bold mb-4 border-b border-[#1A1A1A] pb-2">
              编辑教师档案与不可排课时间: {editingTeacher.name}
            </h3>
            <div className="space-y-3 text-xs mb-6">
              <div>
                <label className="block font-bold mb-1">教师姓名</label>
                <input
                  type="text"
                  value={editingTeacher.name}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-1.5 font-serif italic font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">电子邮箱</label>
                <input
                  type="text"
                  value={editingTeacher.email || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-1.5 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">周最大工作课时</label>
                  <input
                    type="number"
                    min={1}
                    value={editingTeacher.maxHoursPerWeek}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, maxHoursPerWeek: Number(e.target.value) })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">日最大授课节数</label>
                  <input
                    type="number"
                    min={1}
                    value={editingTeacher.maxHoursPerDay}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, maxHoursPerDay: Number(e.target.value) })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Unavailable slots grid */}
              <div className="pt-3 border-t border-[#1A1A1A]">
                <label className="block font-bold mb-1">教师不排课 / 避让时间网格 (点击切换红黑禁排状态)</label>
                <div className="border border-[#1A1A1A] overflow-x-auto text-[10px]">
                  <div className="grid grid-cols-6 border-b border-[#1A1A1A] bg-[#F4F2F0] font-bold p-1 text-center">
                    <div>节次</div>
                    {dataset.timeConfig.days.map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>
                  {dataset.timeConfig.periods.map((p, pIdx) => {
                    if (p.isBreak) return null;
                    return (
                      <div key={pIdx} className="grid grid-cols-6 border-b border-neutral-200 last:border-0 text-center items-center">
                        <div className="p-1 font-mono font-bold bg-[#F4F2F0]">{p.name}</div>
                        {dataset.timeConfig.days.map((_, dIdx) => {
                          const isOff = editingTeacher.unavailableSlots.some(
                            (s) => s.dayIndex === dIdx && s.periodIndex === pIdx
                          );
                          return (
                            <button
                              key={dIdx}
                              type="button"
                              onClick={() => toggleTeacherUnavailableSlot(editingTeacher, dIdx, pIdx)}
                              className={`p-2 transition-colors cursor-pointer font-bold ${
                                isOff ? 'bg-red-700 text-white' : 'hover:bg-neutral-200 text-neutral-400'
                              }`}
                            >
                              {isOff ? '禁排' : '可排'}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingTeacher(null)}
                className="px-4 py-2 border border-[#1A1A1A] text-xs font-bold uppercase hover:bg-neutral-100"
              >
                取消
              </button>
              <button
                onClick={() => handleUpdateTeacher(editingTeacher)}
                className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-bold uppercase hover:bg-neutral-800"
              >
                保存教师资料
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {editingRoom && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingRoom(null);
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FDFCFB] border-2 border-[#1A1A1A] max-w-lg w-full p-6 shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-serif italic font-bold mb-4 border-b border-[#1A1A1A] pb-2">
              编辑教室: {editingRoom.name}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">教室名称</label>
                <input
                  type="text"
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-1.5 font-serif italic font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">所属楼宇/区域</label>
                <input
                  type="text"
                  value={editingRoom.building || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, building: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-1.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">场地类型</label>
                  <select
                    value={editingRoom.type}
                    onChange={(e) => setEditingRoom({ ...editingRoom, type: e.target.value as RoomType })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2 py-1.5"
                  >
                    {roomTypes.map((rt) => (
                      <option key={rt.value} value={rt.value}>{rt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">容纳人数</label>
                  <input
                    type="number"
                    min={1}
                    value={editingRoom.capacity}
                    onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-1.5 font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingRoom(null)}
                className="px-4 py-2 border border-[#1A1A1A] text-xs font-bold uppercase hover:bg-neutral-100"
              >
                取消
              </button>
              <button
                onClick={() => handleUpdateRoom(editingRoom)}
                className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-bold uppercase hover:bg-neutral-800"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingGroup(null);
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FDFCFB] border-2 border-[#1A1A1A] max-w-lg w-full p-6 shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-serif italic font-bold mb-4 border-b border-[#1A1A1A] pb-2">
              编辑班级: {editingGroup.name}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">班级名称</label>
                <input
                  type="text"
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-1.5 font-serif italic font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">班级学生人数</label>
                <input
                  type="number"
                  min={1}
                  value={editingGroup.size}
                  onChange={(e) => setEditingGroup({ ...editingGroup, size: Number(e.target.value) })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-1.5 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingGroup(null)}
                className="px-4 py-2 border border-[#1A1A1A] text-xs font-bold uppercase hover:bg-neutral-100"
              >
                取消
              </button>
              <button
                onClick={() => handleUpdateGroup(editingGroup)}
                className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-bold uppercase hover:bg-neutral-800"
              >
                保存班级修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
