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
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#1A1A1A] pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block mb-0.5">
            Step 4 • Course Planning
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A]">
            课程计划管理
          </h2>
        </div>
        <div className="text-xs font-bold font-mono text-neutral-500 self-end">
            共 {dataset.courses.length} 门课程
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddGroupModal(true)}
            className="px-4 py-2 bg-white border border-neutral-300 rounded text-sm font-medium hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            管理班级 ({dataset.groups.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form: Add Course */}
        <div className="lg:col-span-1 bg-white border border-neutral-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 mb-6">
              添加课程计划
            </h3>

            <form onSubmit={handleAddCourse} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                    年级 (选填)
                  </label>
                  <select
                    value={courseForm.grade}
                    onChange={(e) => setCourseForm({ ...courseForm, grade: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-2 py-2 text-sm focus:outline-none focus:border-neutral-500 bg-white"
                  >
                    <option value="">不指定</option>
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
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                    课程名称 (选填)
                  </label>
                  <input
                    type="text"
                    placeholder="留空自动生成"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                  课程代码 (选填)
                </label>
                <input
                  type="text"
                  placeholder="如: MATH-101"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                />
              </div>

              {/* 授课模式选择 */}
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                  授课模式
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-100 rounded border border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setCourseForm({ ...courseForm, teachingMode: 'group' })}
                    className={`py-1.5 px-1 text-xs font-medium rounded transition-all cursor-pointer ${
                      courseForm.teachingMode === 'group'
                        ? 'bg-white shadow-sm text-neutral-900'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    班级团课
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseForm({ ...courseForm, teachingMode: 'one_on_one' })}
                    className={`py-1.5 px-1 text-xs font-medium rounded transition-all cursor-pointer ${
                      courseForm.teachingMode === 'one_on_one'
                        ? 'bg-white shadow-sm text-neutral-900'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    1对1
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseForm({ ...courseForm, teachingMode: 'one_on_two' })}
                    className={`py-1.5 px-1 text-xs font-medium rounded transition-all cursor-pointer ${
                      courseForm.teachingMode === 'one_on_two'
                        ? 'bg-white shadow-sm text-neutral-900'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    1对2
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseForm({ ...courseForm, teachingMode: 'one_on_n' })}
                    className={`py-1.5 px-1 text-xs font-medium rounded transition-all cursor-pointer ${
                      courseForm.teachingMode === 'one_on_n'
                        ? 'bg-white shadow-sm text-neutral-900'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    1对N
                  </button>
                </div>
              </div>

              {/* 只有选择班级团课时，才需要选择/新建上课班级 */}
              {courseForm.teachingMode === 'group' ? (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-neutral-600">
                      上课班级 *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddGroupModal(true)}
                      className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                    >
                      新建班级
                    </button>
                  </div>
                  <select
                    value={courseForm.groupId}
                    onChange={(e) => setCourseForm({ ...courseForm, groupId: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:border-neutral-500 bg-white"
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
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded">
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">person</span>
                    绑定的学员姓名 *
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
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                  指定授课教师
                </label>
                <select
                  value={courseForm.teacherId}
                  onChange={(e) => setCourseForm({ ...courseForm, teacherId: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:border-neutral-500 bg-white"
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
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                    每周计划课时 (节)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={courseForm.weeklyHours}
                    onChange={(e) => setCourseForm({ ...courseForm, weeklyHours: Number(e.target.value) })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                    单日最大连课 (节)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={courseForm.maxConsecutiveHours}
                    onChange={(e) => setCourseForm({ ...courseForm, maxConsecutiveHours: Number(e.target.value) })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                  场地设施要求
                </label>
                <select
                  value={courseForm.requiredRoomType}
                  onChange={(e) => setCourseForm({ ...courseForm, requiredRoomType: e.target.value as RoomType })}
                  className="w-full border border-neutral-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:border-neutral-500 bg-white"
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
                className="w-full mt-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded shadow-sm transition-colors cursor-pointer"
              >
                保存课程计划
              </button>
            </form>
          </div>
        </div>

        {/* Right List: Courses Directory */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          {dataset.courses.length === 0 ? (
            <div className="flex-1 p-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-neutral-400">auto_stories</span>
              </div>
              <p className="font-medium text-neutral-900">暂无课程计划</p>
              <p className="text-sm text-neutral-500 mt-1">请在左侧填写并添加课程</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 max-h-[750px] overflow-y-auto">
              {dataset.courses.map((course) => {
                const group = dataset.groups.find((g) => g.id === course.groupId);
                const teacher = dataset.teachers.find((t) => t.id === course.teacherId);
                return (
                  <div key={course.id} className="p-5 hover:bg-neutral-50 transition-colors flex justify-between items-start gap-4 group">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-neutral-100 rounded text-xs font-medium text-neutral-600">
                          {course.code}
                        </span>
                        <h4 className="font-bold text-base text-neutral-900">{course.name}</h4>
                        {course.studentNames && (
                          <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium rounded flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            学员: {course.studentNames}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-neutral-500 flex flex-wrap gap-x-6 gap-y-1">
                        <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-neutral-400">groups</span>{group?.name || '所有班级'}</span>
                        <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-neutral-400">person</span>{teacher?.name || '待分配'}</span>
                        <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-neutral-400">meeting_room</span>{roomTypes.find(r => r.value === course.requiredRoomType)?.label.split(' ')[0]}</span>
                        <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-neutral-400">schedule</span>{course.weeklyHours} 节/周</span>
                      </div>
                    </div>

                    {confirmDeleteId === course.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-red-600 font-medium">确认删除?</span>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-bold hover:bg-red-100 cursor-pointer"
                        >
                          删除
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-neutral-500 text-xs hover:bg-neutral-100 rounded cursor-pointer"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingCourse({ ...course })}
                          className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                          title="编辑"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(course.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                          title="删除"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
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

      {/* Quick Add Group Modal */}
      {showAddGroupModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddGroupModal(false);
          }}
          className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-center border-b border-neutral-100 p-4">
              <h3 className="text-lg font-bold text-neutral-900">
                管理班级
              </h3>
              <button onClick={() => setShowAddGroupModal(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Existing Groups List */}
            <div className="p-6">
              <label className="block text-xs font-bold text-neutral-600 mb-2">
                已有班级 ({dataset.groups.length})
              </label>
              <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded-lg bg-neutral-50 divide-y divide-neutral-100 mb-6">
                {dataset.groups.length === 0 ? (
                  <div className="p-4 text-sm text-neutral-500 text-center">暂无班级</div>
                ) : (
                  dataset.groups.map((g) => (
                    <div key={g.id} className="p-3 flex justify-between items-center bg-white hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-neutral-900">{g.name}</span>
                        <span className="text-xs text-neutral-500">({g.size}人)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(g.id)}
                        className="text-xs font-medium text-red-600 hover:underline cursor-pointer"
                      >
                        删除
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* New Group Form */}
              <form onSubmit={handleAddGroup} className="space-y-4 border-t border-neutral-100 pt-6">
                <h4 className="text-sm font-bold text-neutral-900">添加新班级</h4>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                    班级名称
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如: 高一(1)班"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                    班级人数
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={newGroupSize}
                    onChange={(e) => setNewGroupSize(Number(e.target.value))}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddGroupModal(false)}
                    className="px-4 py-2 rounded text-sm font-medium text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                  >
                    关闭
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 cursor-pointer"
                  >
                    保存班级
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Edit Course Modal */}
      {editingCourse && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingCourse(null);
          }}
          className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-center border-b border-neutral-100 p-4">
              <h3 className="text-lg font-bold text-neutral-900">
                编辑课程
              </h3>
              <button onClick={() => setEditingCourse(null)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditedCourse} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                  课程名称
                </label>
                <input
                  type="text"
                  required
                  value={editingCourse.name}
                  onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                    课程代码
                  </label>
                  <input
                    type="text"
                    value={editingCourse.code}
                    onChange={(e) => setEditingCourse({ ...editingCourse, code: e.target.value })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                    周课时 (节)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editingCourse.weeklyHours}
                    onChange={(e) => setEditingCourse({ ...editingCourse, weeklyHours: Number(e.target.value) })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                  授课教师
                </label>
                <select
                  value={editingCourse.teacherId || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, teacherId: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:border-neutral-500 bg-white"
                >
                  <option value="">待指定</option>
                  {dataset.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                  上课班级
                </label>
                <select
                  value={editingCourse.groupId || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, groupId: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:border-neutral-500 bg-white"
                >
                  {dataset.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.size}人)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 rounded text-sm font-medium text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 cursor-pointer"
                >
                  保存更新
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
