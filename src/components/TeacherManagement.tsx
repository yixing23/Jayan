import React, { useState } from 'react';
import { ScheduleDataset, Teacher, TimeSlot } from '../types';

interface TeacherManagementProps {
  dataset: ScheduleDataset;
  onUpdateDataset: (updated: ScheduleDataset) => void;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({ dataset, onUpdateDataset }) => {
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState({
    name: '',
    subject: '数学',
    email: '',
    maxHoursPerWeek: 20,
    maxHoursPerDay: 5,
  });

  const subjects = ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '计算机/信息技术', '体育', '美术', '音乐', '通用技术'];

  const getRandomColor = () => {
    const palette = ['#2563eb', '#059669', '#7c3aed', '#d97706', '#dc2626', '#db2777', '#0284c7', '#4f46e5', '#0d9488'];
    return palette[Math.floor(Math.random() * palette.length)];
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const newTeacher: Teacher = {
      id: `t_${Date.now()}`,
      name: form.name.trim(),
      email: form.email.trim(),
      color: getRandomColor(),
      qualifiedSubjectIds: [form.subject],
      maxHoursPerWeek: Number(form.maxHoursPerWeek) || 20,
      maxHoursPerDay: Number(form.maxHoursPerDay) || 5,
      unavailableSlots: [],
    };

    onUpdateDataset({
      ...dataset,
      teachers: [...dataset.teachers, newTeacher],
    });

    setForm({
      name: '',
      subject: '数学',
      email: '',
      maxHoursPerWeek: 20,
      maxHoursPerDay: 5,
    });
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteTeacher = (id: string) => {
    onUpdateDataset({
      ...dataset,
      teachers: dataset.teachers.filter((t) => t.id !== id),
      courses: dataset.courses.map((c) => (c.teacherId === id ? { ...c, teacherId: '' } : c)),
      assignments: dataset.assignments.filter((a) => a.teacherId !== id),
    });
    if (editingTeacher?.id === id) setEditingTeacher(null);
    setConfirmDeleteId(null);
  };

  const toggleUnavailableSlot = (teacher: Teacher, dayIndex: number, periodIndex: number) => {
    const exists = teacher.unavailableSlots.some((s) => s.dayIndex === dayIndex && s.periodIndex === periodIndex);
    let updatedSlots: TimeSlot[];
    if (exists) {
      updatedSlots = teacher.unavailableSlots.filter((s) => !(s.dayIndex === dayIndex && s.periodIndex === periodIndex));
    } else {
      updatedSlots = [...teacher.unavailableSlots, { dayIndex, periodIndex }];
    }

    const updatedTeacher = { ...teacher, unavailableSlots: updatedSlots };
    onUpdateDataset({
      ...dataset,
      teachers: dataset.teachers.map((t) => (t.id === teacher.id ? updatedTeacher : t)),
    });

    if (editingTeacher && editingTeacher.id === teacher.id) {
      setEditingTeacher(updatedTeacher);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
      {/* Step Header */}
      <div className="mb-6 border-b border-[#1A1A1A] pb-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
            Step 1 & Step 3 • Faculty & Availability
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A] flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-[#1A1A1A]">person_add</span>
            教师管理 & 可用时段设置
          </h2>
          <p className="text-xs text-neutral-600 mt-1">
            新增/维护机构教师团队名单，指定擅长科目，并可通过直观课时表设置教师的不空闲/禁排时间段。
          </p>
        </div>
        <span className="px-3 py-1 bg-[#1A1A1A] text-white text-xs font-mono font-bold">
          已有教师: {dataset.teachers.length} 人
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form: Add Teacher */}
        <div className="lg:col-span-1 border border-[#1A1A1A] p-6 bg-[#FDFCFB] flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-serif italic font-bold text-[#1A1A1A] border-b border-[#1A1A1A] pb-3 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">add_circle</span>
              添加新教师
            </h3>

            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  教师姓名 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="如: 张伟 老师"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-serif italic font-bold focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  授课科目/主要专业 *
                </label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2.5 py-2 text-xs font-medium focus:outline-none focus:bg-white cursor-pointer"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  联系邮箱 / 手机号 (选填)
                </label>
                <input
                  type="text"
                  placeholder="如: zhangwei@edu.org"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    周最大课时
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={form.maxHoursPerWeek}
                    onChange={(e) => setForm({ ...form, maxHoursPerWeek: Number(e.target.value) })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                    日最大课时
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.maxHoursPerDay}
                    onChange={(e) => setForm({ ...form, maxHoursPerDay: Number(e.target.value) })}
                    className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors cursor-pointer mt-4 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">check</span>
                保存并录入教师
              </button>
            </form>
          </div>
        </div>

        {/* Right List & Availability Panel */}
        <div className="lg:col-span-2 border border-[#1A1A1A] bg-[#FDFCFB] flex flex-col justify-between">
          <div>
            <div className="p-4 bg-[#F4F2F0] border-b border-[#1A1A1A] flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">groups</span>
                教师团队名录与可用时间设定
              </span>
              <span className="text-[10px] text-neutral-500">点击【可用时段】按钮快捷勾选避让时间</span>
            </div>

            {dataset.teachers.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 text-xs font-mono">
                暂无教师数据。请在左侧填写并添加机构教师。
              </div>
            ) : (
              <div className="divide-y divide-[#1A1A1A] max-h-[560px] overflow-y-auto">
                {dataset.teachers.map((teacher) => {
                  const isSettingAvailability = editingTeacher?.id === teacher.id;
                  return (
                    <div key={teacher.id} className="p-4 hover:bg-[#F4F2F0]/60 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: teacher.color || '#1A1A1A' }}></div>
                            <h4 className="font-serif italic font-bold text-lg text-[#1A1A1A]">{teacher.name}</h4>
                            <span className="px-2 py-0.5 border border-[#1A1A1A] text-[10px] font-bold bg-white">
                              {teacher.qualifiedSubjectIds[0] || '综合科目'}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-600 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                            <span>邮箱: {teacher.email || '未填'}</span>
                            <span>周限额: {teacher.maxHoursPerWeek} 节</span>
                            <span>日限额: {teacher.maxHoursPerDay} 节</span>
                            <span className={teacher.unavailableSlots.length > 0 ? 'text-red-700 font-bold' : 'text-emerald-700'}>
                              {teacher.unavailableSlots.length > 0 ? `已设置禁排: ${teacher.unavailableSlots.length} 处` : '全时段空闲可用'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingTeacher(isSettingAvailability ? null : teacher)}
                            className={`px-3 py-1.5 border border-[#1A1A1A] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                              isSettingAvailability ? 'bg-[#1A1A1A] text-white' : 'bg-white hover:bg-[#1A1A1A] hover:text-white'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">edit_calendar</span>
                            {isSettingAvailability ? '完成可用时段设置' : '设置可用/禁排时段'}
                          </button>

                          {confirmDeleteId === teacher.id ? (
                            <div className="flex items-center gap-1 bg-red-50 p-1 border border-red-600">
                              <span className="text-[10px] font-bold text-red-700 px-1">确定删除?</span>
                              <button
                                onClick={() => handleDeleteTeacher(teacher.id)}
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
                            <button
                              onClick={() => setConfirmDeleteId(teacher.id)}
                              className="p-1.5 text-neutral-400 hover:text-red-700 cursor-pointer transition-colors"
                              title="删除教师"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Availability Grid */}
                      {isSettingAvailability && (
                        <div className="mt-4 p-4 border border-[#1A1A1A] bg-white">
                          <div className="flex items-center justify-between mb-3 border-b border-neutral-200 pb-2">
                            <h5 className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1">
                              <span className="material-symbols-outlined text-amber-600 text-sm">schedule</span>
                              {teacher.name} 老师的单周时间意向设置
                            </h5>
                            <div className="flex items-center gap-3 text-[10px] font-bold">
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-emerald-100 border border-emerald-600 inline-block"></span>
                                绿格: 可上课
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-red-100 border border-red-600 inline-block"></span>
                                红格: 禁排/不方便
                              </span>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-[10px] font-mono">
                              <thead>
                                <tr className="bg-[#F4F2F0]">
                                  <th className="p-1 border border-neutral-300 w-16">节次</th>
                                  {dataset.timeConfig.days.map((day) => (
                                    <th key={day} className="p-1 border border-neutral-300 text-center font-bold">
                                      {day}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {dataset.timeConfig.periods.map((period, pIdx) => {
                                  if (period.isBreak) {
                                    return (
                                      <tr key={period.index} className="bg-neutral-100 text-neutral-400 text-center">
                                        <td className="p-1 border border-neutral-300 font-bold">{period.name}</td>
                                        <td colSpan={dataset.timeConfig.days.length} className="p-1 border border-neutral-300 italic">
                                          — {period.name} —
                                        </td>
                                      </tr>
                                    );
                                  }
                                  return (
                                    <tr key={period.index}>
                                      <td className="p-1 border border-neutral-300 bg-[#F4F2F0] font-bold text-neutral-700 text-center">
                                        {period.name}
                                      </td>
                                      {dataset.timeConfig.days.map((_, dIdx) => {
                                        const isUnavailable = teacher.unavailableSlots.some(
                                          (s) => s.dayIndex === dIdx && s.periodIndex === pIdx
                                        );
                                        return (
                                          <td
                                            key={dIdx}
                                            onClick={() => toggleUnavailableSlot(teacher, dIdx, pIdx)}
                                            className={`p-2 border border-neutral-300 text-center cursor-pointer transition-colors select-none font-bold ${
                                              isUnavailable
                                                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                            }`}
                                          >
                                            {isUnavailable ? '✕ 禁排' : '✓ 空闲'}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
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
    </div>
  );
};
