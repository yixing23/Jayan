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
      <div className="mb-6 flex items-center justify-between border-b border-[#1A1A1A] pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block mb-0.5">
            Step 1 • Teacher Roster
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A]">
            教师管理
          </h2>
        </div>
        <span className="text-xs font-bold font-mono text-neutral-500">
          共 {dataset.teachers.length} 名教师
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form: Add Teacher */}
        <div className="lg:col-span-1 border border-neutral-200 rounded-lg bg-white p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 mb-6">添加教师</h3>
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">教师姓名</label>
                <input
                  type="text"
                  required
                  placeholder="如: 张伟"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">主授科目</label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:border-neutral-500 bg-white"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">联系方式 (选填)</label>
                <input
                  type="text"
                  placeholder="邮箱或手机号"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5">周最高课时</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={form.maxHoursPerWeek}
                    onChange={(e) => setForm({ ...form, maxHoursPerWeek: Number(e.target.value) })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5">日最高课时</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.maxHoursPerDay}
                    onChange={(e) => setForm({ ...form, maxHoursPerDay: Number(e.target.value) })}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-6 py-2.5 bg-neutral-900 text-white rounded text-sm font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                保存
              </button>
            </form>
          </div>
        </div>

        {/* Right List & Availability Panel */}
        <div className="lg:col-span-2 border border-neutral-200 rounded-lg bg-white overflow-hidden shadow-sm">
          {dataset.teachers.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 text-sm">
              暂无数据
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 max-h-[600px] overflow-y-auto">
              {dataset.teachers.map((teacher) => {
                const isSettingAvailability = editingTeacher?.id === teacher.id;
                return (
                  <div key={teacher.id} className="p-5 hover:bg-neutral-50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: teacher.color || '#1A1A1A' }}></div>
                          <h4 className="font-bold text-base text-neutral-900">{teacher.name}</h4>
                          <span className="px-2 py-0.5 border border-neutral-200 rounded text-xs text-neutral-600 bg-white">
                            {teacher.qualifiedSubjectIds[0] || '综合科目'}
                          </span>
                        </div>
                        <div className="text-sm text-neutral-500 flex flex-wrap gap-x-4 gap-y-1">
                          <span>{teacher.email || '未填联系方式'}</span>
                          <span>上限: {teacher.maxHoursPerWeek}节/周, {teacher.maxHoursPerDay}节/日</span>
                          <span className={teacher.unavailableSlots.length > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                            {teacher.unavailableSlots.length > 0 ? `禁排: ${teacher.unavailableSlots.length} 处` : '全时段空闲'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingTeacher(isSettingAvailability ? null : teacher)}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer ${
                            isSettingAvailability ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-100'
                          }`}
                        >
                          可用时段
                        </button>

                        {confirmDeleteId === teacher.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-600 font-medium">确认删除?</span>
                            <button onClick={() => handleDeleteTeacher(teacher.id)} className="text-xs text-red-600 font-bold hover:underline">删除</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-neutral-500 hover:underline">取消</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(teacher.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {isSettingAvailability && (
                      <div className="mt-4 p-4 border border-neutral-200 rounded-lg bg-neutral-50/50">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-bold text-neutral-900">时段意向设置</h5>
                          <div className="flex items-center gap-4 text-xs font-medium text-neutral-600">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300"></span>可排课</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-300"></span>禁排</span>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr>
                                <th className="p-2 border border-neutral-200 bg-white font-medium text-neutral-500 w-16">节次</th>
                                {dataset.timeConfig.days.map((day) => (
                                  <th key={day} className="p-2 border border-neutral-200 bg-white font-medium text-neutral-900">{day}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {dataset.timeConfig.periods.map((period, pIdx) => {
                                if (period.isBreak) {
                                  return (
                                    <tr key={period.index} className="bg-neutral-50">
                                      <td className="p-2 border border-neutral-200 text-center text-neutral-500">{period.name}</td>
                                      <td colSpan={dataset.timeConfig.days.length} className="p-2 border border-neutral-200 text-center text-neutral-400">休息</td>
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={period.index}>
                                    <td className="p-2 border border-neutral-200 bg-white text-center text-neutral-700">{period.name}</td>
                                    {dataset.timeConfig.days.map((_, dIdx) => {
                                      const isUnavailable = teacher.unavailableSlots.some((s) => s.dayIndex === dIdx && s.periodIndex === pIdx);
                                      return (
                                        <td
                                          key={dIdx}
                                          onClick={() => toggleUnavailableSlot(teacher, dIdx, pIdx)}
                                          className={`p-2 border border-neutral-200 text-center cursor-pointer transition-colors ${
                                            isUnavailable ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100'
                                          }`}
                                        >
                                          {isUnavailable ? '禁排' : '空闲'}
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
  );
};
