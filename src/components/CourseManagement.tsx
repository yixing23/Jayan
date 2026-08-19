import React, { useState } from 'react';
import { Course, RoomType, ScheduleDataset, StudentGroup } from '../types';

interface CourseManagementProps {
  dataset: ScheduleDataset;
  onUpdateDataset: (updated: ScheduleDataset) => void;
}

export const CourseManagement: React.FC<CourseManagementProps> = ({ dataset, onUpdateDataset }) => {
  // Course Form
  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    grade: '',
    groupId: dataset.groups[0]?.id || '',
    teacherId: dataset.teachers[0]?.id || '',
    studentNames: '',
    teachingMode: 'group' as 'group' | 'one_on_one' | 'one_on_two' | 'one_on_n',
    weeklyHours: 4,
    maxConsecutiveHours: 1,
    requiredRoomType: 'General' as RoomType,
  });

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Group Form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSize, setNewGroupSize] = useState(40);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);

  const roomTypes: { value: RoomType; label: string }[] = [
    { value: 'General', label: '普通教室' },
    { value: 'Science Lab', label: '理科实验室' },
    { value: 'Computer Lab', label: '计算机机房' },
    { value: 'Auditorium', label: '阶梯报告厅' },
    { value: 'Gymnasium', label: '体育场馆' },
    { value: 'Workshop', label: '创客/实训室' },
    { value: 'Art Studio', label: '美术画室' },
  ];

  const getRandomColor = () => {
    const palette = ['#2563eb', '#059669', '#7c3aed', '#d97706', '#dc2626', '#db2777', '#0284c7', '#4f46e5', '#0d9488'];
    return palette[Math.floor(Math.random() * palette.length)];
  };

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newGroup: StudentGroup = {
      id: `g_${Date.now()}`,
      name: newGroupName.trim(),
      size: Number(newGroupSize) || 40,
      color: getRandomColor(),
    };

    const updatedDataset = {
      ...dataset,
      groups: [...dataset.groups, newGroup],
    };

    onUpdateDataset(updatedDataset);
    setCourseForm((prev) => ({ ...prev, groupId: newGroup.id }));
    setNewGroupName('');
    setShowAddGroupModal(false);
  };

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();

    let targetGroupId = courseForm.groupId;
    if (courseForm.teachingMode === 'group') {
      if (!targetGroupId && dataset.groups.length > 0) {
        targetGroupId = dataset.groups[0].id;
      }
      if (!targetGroupId && dataset.groups.length === 0) {
        // Auto create a default group if user hasn't created one
        const defaultGroup = { id: `g_default_${Date.now()}`, name: '通用班级', size: 30, color: getRandomColor() };
        onUpdateDataset({
          ...dataset,
          groups: [defaultGroup],
        });
        targetGroupId = defaultGroup.id;
      }
    }

    const selectedGroup = dataset.groups.find((g) => g.id === targetGroupId);

    // Auto-generate course name if left blank
    let baseName = courseForm.name.trim();
    if (!baseName) {
      if (courseForm.teachingMode === 'group') {
        baseName = selectedGroup ? selectedGroup.name : '综合课程';
      } else {
        const modeLabel =
          courseForm.teachingMode === 'one_on_one'
            ? '1对1'
            : courseForm.teachingMode === 'one_on_two'
            ? '1对2'
            : '1对N';
        baseName = courseForm.studentNames.trim()
          ? `${courseForm.studentNames.trim()} (${modeLabel})`
          : `${modeLabel}辅导课`;
      }
    }

    // Add grade prefix if specified and not already in baseName
    const gradePrefix =
      courseForm.grade && courseForm.grade !== 'none' && !baseName.includes(courseForm.grade)
        ? `[${courseForm.grade}] `
        : '';

    const finalName = `${gradePrefix}${baseName}`;
    const codeGenerated = courseForm.code.trim() || `C-${Math.floor(100 + Math.random() * 900)}`;

    const newCourse: Course = {
      id: `c_${Date.now()}`,
      code: codeGenerated.toUpperCase(),
      name: finalName,
      groupId: targetGroupId || '',
      teacherId: courseForm.teacherId || '',
      studentNames: courseForm.studentNames.trim() || undefined,
      teachingMode: courseForm.teachingMode,
      weeklyHours: Number(courseForm.weeklyHours) || 3,
      maxConsecutiveHours: Number(courseForm.maxConsecutiveHours) || 1,
      requiredRoomType: courseForm.requiredRoomType,
      color: getRandomColor(),
    };

    onUpdateDataset({
      ...dataset,
      courses: [...dataset.courses, newCourse],
    });

    setCourseForm({
      code: '',
      name: '',
      grade: '',
      groupId: targetGroupId || '',
      teacherId: dataset.teachers[0]?.id || '',
      studentNames: '',
      teachingMode: 'group',
      weeklyHours: 4,
      maxConsecutiveHours: 1,
      requiredRoomType: 'General',
    });
  };

  const handleSaveEditedCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    onUpdateDataset({
      ...dataset,
      courses: dataset.courses.map((c) => (c.id === editingCourse.id ? editingCourse : c)),
    });
    setEditingCourse(null);
  };

  const handleDeleteGroup = (groupId: string) => {
    onUpdateDataset({
      ...dataset,
      groups: dataset.groups.filter((g) => g.id !== groupId),
      courses: dataset.courses.filter((c) => c.groupId !== groupId),
      assignments: dataset.assignments.filter((a) => a.groupId !== groupId),
    });
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteCourse = (id: string) => {
    onUpdateDataset({
      ...dataset,
      courses: dataset.courses.filter((c) => c.id !== id),
      assignments: dataset.assignments.filter((a) => a.courseId !== id),
    });
    setConfirmDeleteId(null);
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
      {/* Step Header */}
      <div className="mb-6 border-b border-[#1A1A1A] pb-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
            Step 4 • Curriculum & Subject Planning
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A] flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-[#1A1A1A]">menu_book</span>
            课程计划管理
          </h2>
          <p className="text-xs text-neutral-600 mt-1">
            设置各年级班级的开设课程，绑定负责教师，设定每周计划课时节数与场地需求。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddGroupModal(true)}
            className="px-3 py-1 bg-white border border-[#1A1A1A] text-xs font-bold hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">group_add</span>
            管理班级 ({dataset.groups.length})
          </button>
          <span className="px-3 py-1 bg-[#1A1A1A] text-white text-xs font-mono font-bold">
            已有课程: {dataset.courses.length} 门
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form: Add Course */}
        <div className="lg:col-span-1 border border-[#1A1A1A] p-6 bg-[#FDFCFB] flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-serif italic font-bold text-[#1A1A1A] border-b border-[#1A1A1A] pb-3 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">post_add</span>
              添加课程计划
            </h3>

            <form onSubmit={handleAddCourse} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    年级 (选填)
                  </label>
                  <select
                    value={courseForm.grade}
                    onChange={(e) => setCourseForm({ ...courseForm, grade: e.target.value })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2 py-2 text-xs font-medium focus:outline-none"
                  >
                    <option value="">-- 不指定 / 自动识别 --</option>
                    <option value="高一">高一</option>
                    <option value="高二">高二</option>
                    <option value="高三">高三</option>
                    <option value="初一">初一</option>
                    <option value="初二">初二</option>
                    <option value="初三">初三</option>
                    <option value="大一">大一</option>
                    <option value="大二">大二</option>
                    <option value="通用">通用</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    课程名称 (选填 / 可不指定)
                  </label>
                  <input
                    type="text"
                    placeholder="留空则自动使用班级/学员名称"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-serif italic font-bold focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  课程代码 (选填)
                </label>
                <input
                  type="text"
                  placeholder="如: MATH-101 (留空自动生成)"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                />
              </div>

              {/* 授课模式选择 */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1 flex justify-between items-center">
                  <span>授课模式 *</span>
                  <span className="text-[10px] text-amber-900 font-bold">
                    {courseForm.teachingMode === 'group' && '班级团课 (需要组班)'}
                    {courseForm.teachingMode === 'one_on_one' && '1对1辅导 (只需选学员)'}
                    {courseForm.teachingMode === 'one_on_two' && '1对2辅导 (只需选学员)'}
                    {courseForm.teachingMode === 'one_on_n' && '1对N小班 (只需选学员)'}
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-[#F4F2F0] border border-[#1A1A1A]">
                  <button
                    type="button"
                    onClick={() => setCourseForm({ ...courseForm, teachingMode: 'group' })}
                    className={`py-1.5 px-1 text-[11px] font-bold transition-all flex flex-col items-center cursor-pointer ${
                      courseForm.teachingMode === 'group'
                        ? 'bg-[#1A1A1A] text-white shadow-xs'
                        : 'bg-white text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    <span>班级团课</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseForm({ ...courseForm, teachingMode: 'one_on_one' })}
                    className={`py-1.5 px-1 text-[11px] font-bold transition-all flex flex-col items-center cursor-pointer ${
                      courseForm.teachingMode === 'one_on_one'
                        ? 'bg-amber-900 text-white shadow-xs'
                        : 'bg-white text-amber-950 hover:bg-amber-50'
                    }`}
                  >
                    <span>1对1辅导</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseForm({ ...courseForm, teachingMode: 'one_on_two' })}
                    className={`py-1.5 px-1 text-[11px] font-bold transition-all flex flex-col items-center cursor-pointer ${
                      courseForm.teachingMode === 'one_on_two'
                        ? 'bg-purple-900 text-white shadow-xs'
                        : 'bg-white text-purple-950 hover:bg-purple-50'
                    }`}
                  >
                    <span>1对2辅导</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseForm({ ...courseForm, teachingMode: 'one_on_n' })}
                    className={`py-1.5 px-1 text-[11px] font-bold transition-all flex flex-col items-center cursor-pointer ${
                      courseForm.teachingMode === 'one_on_n'
                        ? 'bg-emerald-900 text-white shadow-xs'
                        : 'bg-white text-emerald-950 hover:bg-emerald-50'
                    }`}
                  >
                    <span>1对N小班</span>
                  </button>
                </div>
              </div>

              {/* 只有选择班级团课时，才需要选择/新建上课班级 */}
              {courseForm.teachingMode === 'group' ? (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600">
                      上课班级 *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddGroupModal(true)}
                      className="text-[10px] text-blue-700 underline font-bold cursor-pointer"
                    >
                      + 新建班级
                    </button>
                  </div>
                  <select
                    value={courseForm.groupId}
                    onChange={(e) => setCourseForm({ ...courseForm, groupId: e.target.value })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2.5 py-2 text-xs font-medium focus:outline-none"
                  >
                    {dataset.groups.length === 0 && <option value="">(尚未录入班级，请先点击新建)</option>}
                    {dataset.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.size}人)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* 1对1 / 1对2 / 1对N 模式直接设置学员姓名 */
                <div className="p-2.5 bg-amber-50 border border-amber-300">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-amber-950 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-amber-800">person</span>
                      绑定的学员姓名 *
                    </span>
                    <span className="text-[10px] text-amber-800 font-mono">无需选班级，输入学员即可消课</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      courseForm.teachingMode === 'one_on_one'
                        ? '例如: 张三'
                        : courseForm.teachingMode === 'one_on_two'
                        ? '例如: 张三、李四'
                        : '例如: 张三、李四、王五'
                    }
                    value={courseForm.studentNames}
                    onChange={(e) => setCourseForm({ ...courseForm, studentNames: e.target.value })}
                    className="w-full bg-white border border-[#1A1A1A] px-3 py-2 text-xs font-bold text-[#1A1A1A] focus:outline-none"
                  />
                  <p className="text-[10px] text-amber-800 mt-1">
                    ⚡ 提示：排课后，系统后台将按输入的学员姓名自动划扣课时。
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  指定授课教师
                </label>
                <select
                  value={courseForm.teacherId}
                  onChange={(e) => setCourseForm({ ...courseForm, teacherId: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2.5 py-2 text-xs font-medium focus:outline-none"
                >
                  <option value="">待指定 / 自动匹配</option>
                  {dataset.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.qualifiedSubjectIds[0] || '老师'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    每周计划课时 (节)
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
                    单日最大连课 (节)
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
                  场地设施要求
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
                className="w-full py-3 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors cursor-pointer mt-4 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">check</span>
                保存课程计划
              </button>
            </form>
          </div>
        </div>

        {/* Right List: Courses Directory */}
        <div className="lg:col-span-2 border border-[#1A1A1A] bg-[#FDFCFB] flex flex-col justify-between">
          <div>
            <div className="p-4 bg-[#F4F2F0] border-b border-[#1A1A1A] flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">auto_stories</span>
                开设课程与授课绑定清单
              </span>
            </div>

            {dataset.courses.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 text-xs font-mono">
                暂无课程计划。请在左侧填写并添加课程。
              </div>
            ) : (
              <div className="divide-y divide-[#1A1A1A] max-h-[560px] overflow-y-auto">
                {dataset.courses.map((course) => {
                  const group = dataset.groups.find((g) => g.id === course.groupId);
                  const teacher = dataset.teachers.find((t) => t.id === course.teacherId);
                  return (
                    <div key={course.id} className="p-4 hover:bg-[#F4F2F0]/60 transition-colors flex justify-between items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 bg-[#1A1A1A] text-white text-[10px] font-mono font-bold">
                            {course.code}
                          </span>
                          <h4 className="font-serif italic font-bold text-lg text-[#1A1A1A]">{course.name}</h4>
                          {course.studentNames && (
                            <span className="px-2 py-0.5 bg-amber-100 border border-amber-400 text-amber-900 text-[10px] font-bold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-xs">person</span>
                              学员: {course.studentNames}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-600 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                          <span>班级: <strong>{group?.name || '所有班级'}</strong></span>
                          <span>教师: <strong>{teacher?.name || '待分配'}</strong></span>
                          <span>场地: <strong>{course.requiredRoomType}</strong></span>
                          <span>计划周课时: <strong>{course.weeklyHours} 节/周</strong></span>
                        </div>
                      </div>

                      {confirmDeleteId === course.id ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 border border-red-600">
                          <span className="text-[10px] font-bold text-red-700 px-1">确定删除?</span>
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 cursor-pointer"
                          >
                            删除
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-1 text-neutral-600 text-[10px] hover:bg-neutral-200 cursor-pointer"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingCourse({ ...course })}
                            className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-200 rounded cursor-pointer transition-colors"
                            title="编辑课程信息"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(course.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-700 cursor-pointer transition-colors"
                            title="删除课程"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Group Modal */}
      {showAddGroupModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddGroupModal(false);
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FDFCFB] border-2 border-[#1A1A1A] max-w-lg w-full p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-[#1A1A1A] pb-2 mb-4">
              <h3 className="text-xl font-serif italic font-bold">
                班级管理
              </h3>
              <button onClick={() => setShowAddGroupModal(false)} className="text-neutral-500 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Existing Groups List */}
            <div className="mb-4">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                已有班级 ({dataset.groups.length})
              </label>
              <div className="max-h-36 overflow-y-auto border border-[#1A1A1A] bg-[#F4F2F0] divide-y divide-neutral-300">
                {dataset.groups.length === 0 ? (
                  <div className="p-3 text-[11px] text-neutral-500 italic text-center">暂无班级</div>
                ) : (
                  dataset.groups.map((g) => (
                    <div key={g.id} className="p-2 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-[#1A1A1A]">{g.name}</span>
                        <span className="text-[10px] text-neutral-500 ml-2">({g.size}人)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(g.id)}
                        className="px-2 py-0.5 text-red-600 hover:bg-red-100 rounded text-[10px] font-bold cursor-pointer"
                      >
                        删除班级
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* New Group Form */}
            <form onSubmit={handleAddGroup} className="space-y-4 border-t border-neutral-300 pt-4">
              <h4 className="text-xs font-bold uppercase text-[#1A1A1A]">添加新班级</h4>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  班级名称 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="如: 高一(1)班 / 计算机2401班"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-bold focus:outline-none"
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
                  value={newGroupSize}
                  onChange={(e) => setNewGroupSize(Number(e.target.value))}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="px-4 py-2 border border-[#1A1A1A] text-xs font-bold hover:bg-neutral-200 cursor-pointer"
                >
                  关闭
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1A1A1A] text-white text-xs font-bold uppercase hover:bg-neutral-800 cursor-pointer"
                >
                  确认保存班级
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Course Modal */}
      {editingCourse && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingCourse(null);
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FDFCFB] border-2 border-[#1A1A1A] max-w-lg w-full p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-[#1A1A1A] pb-2 mb-4">
              <h3 className="text-xl font-serif italic font-bold">
                编辑课程计划
              </h3>
              <button onClick={() => setEditingCourse(null)} className="text-neutral-500 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditedCourse} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  课程名称
                </label>
                <input
                  type="text"
                  required
                  value={editingCourse.name}
                  onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-serif italic font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    课程代码
                  </label>
                  <input
                    type="text"
                    value={editingCourse.code}
                    onChange={(e) => setEditingCourse({ ...editingCourse, code: e.target.value })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    计划周课时 (节)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editingCourse.weeklyHours}
                    onChange={(e) => setEditingCourse({ ...editingCourse, weeklyHours: Number(e.target.value) })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  授课教师
                </label>
                <select
                  value={editingCourse.teacherId || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, teacherId: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2.5 py-2 text-xs font-medium focus:outline-none"
                >
                  <option value="">待指定 / 自动匹配</option>
                  {dataset.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  上课班级
                </label>
                <select
                  value={editingCourse.groupId || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, groupId: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2.5 py-2 text-xs font-medium focus:outline-none"
                >
                  {dataset.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.size}人)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 border border-[#1A1A1A] text-xs font-bold hover:bg-neutral-200 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1A1A1A] text-white text-xs font-bold uppercase hover:bg-neutral-800 cursor-pointer"
                >
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
