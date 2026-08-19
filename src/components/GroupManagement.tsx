import React, { useState } from 'react';
import { Room, ScheduleDataset, StudentGroup } from '../types';

interface GroupManagementProps {
  dataset: ScheduleDataset;
  onUpdateDataset: (updated: ScheduleDataset) => void;
  onNavigateToCourses?: () => void;
}

export const GroupManagement: React.FC<GroupManagementProps> = ({
  dataset,
  onUpdateDataset,
  onNavigateToCourses,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupSize, setGroupSize] = useState(40);
  const [homeRoomId, setHomeRoomId] = useState('');
  const [groupColor, setGroupColor] = useState('#2563eb');
  const [searchTerm, setSearchTerm] = useState('');

  const palette = [
    '#2563eb', '#059669', '#7c3aed', '#d97706', '#dc2626',
    '#db2777', '#0284c7', '#4f46e5', '#0d9488', '#ea580c'
  ];

  const handleOpenAdd = () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupSize(40);
    setHomeRoomId(dataset.rooms[0]?.id || '');
    setGroupColor(palette[Math.floor(Math.random() * palette.length)]);
    setShowModal(true);
  };

  const handleOpenEdit = (g: StudentGroup) => {
    setEditingGroup(g);
    setGroupName(g.name);
    setGroupSize(g.size);
    setHomeRoomId(g.homeRoomId || '');
    setGroupColor(g.color || palette[0]);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    if (editingGroup) {
      const updated = dataset.groups.map(g =>
        g.id === editingGroup.id
          ? {
              ...g,
              name: groupName.trim(),
              size: Number(groupSize) || 40,
              homeRoomId: homeRoomId || undefined,
              color: groupColor,
            }
          : g
      );
      onUpdateDataset({ ...dataset, groups: updated });
    } else {
      const newGroup: StudentGroup = {
        id: `g_${Date.now()}`,
        name: groupName.trim(),
        size: Number(groupSize) || 40,
        homeRoomId: homeRoomId || undefined,
        color: groupColor,
      };
      onUpdateDataset({ ...dataset, groups: [...dataset.groups, newGroup] });
    }

    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该班级吗？相关课程也将失去班级绑定。')) {
      const updated = dataset.groups.filter(g => g.id !== id);
      onUpdateDataset({ ...dataset, groups: updated });
    }
  };

  const filteredGroups = dataset.groups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#1A1A1A] pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
            Step 3 • Student Groups & Classes Management
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A] flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl">groups</span>
            班级管理
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs uppercase font-bold tracking-wider cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-base">group_add</span>
            新增班级/年级
          </button>
          {onNavigateToCourses && (
            <button
              onClick={onNavigateToCourses}
              className="px-4 py-2 border border-[#1A1A1A] bg-white hover:bg-neutral-100 text-xs font-bold tracking-wider cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <span>前往课程计划</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          )}
        </div>
      </div>

      {/* Guide Card */}
      <div className="bg-[#F4F2F0] border border-[#1A1A1A] p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-800 text-lg">info</span>
          <span className="font-bold text-[#1A1A1A]">
            推荐基础建档顺序：教师管理 → 教室管理 → 班级管理 → 课程计划 → 智能排课
          </span>
        </div>
        <span className="text-[11px] text-neutral-600 font-mono">
          当前已建档 {dataset.groups.length} 个班级
        </span>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-2 max-w-md bg-white border border-[#1A1A1A] px-3 py-1.5">
        <span className="material-symbols-outlined text-neutral-500 text-sm">search</span>
        <input
          type="text"
          placeholder="搜索班级名称..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs font-bold focus:outline-none bg-transparent"
        />
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map(group => {
          const homeroom = dataset.rooms.find(r => r.id === group.homeRoomId);
          const relatedCourses = dataset.courses.filter(c => c.groupId === group.id);
          const scheduledPeriods = dataset.assignments?.filter(a => a.groupId === group.id).length || 0;

          return (
            <div
              key={group.id}
              className="border-2 border-[#1A1A1A] bg-[#FDFCFB] p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: group.color || '#2563eb' }}
              />

              <div className="space-y-3 mt-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: group.color || '#2563eb' }}
                    />
                    <h3 className="font-serif italic font-bold text-lg text-[#1A1A1A]">
                      {group.name}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-300 font-mono text-[10px] font-bold">
                    {group.size} 人
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-700 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">固定班级教室:</span>
                    <span className="font-bold">{homeroom ? homeroom.name : '未绑定 (使用公共教室)'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">开设课程门数:</span>
                    <span className="font-bold text-[#1A1A1A]">{relatedCourses.length} 门</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">已排课时数:</span>
                    <span className="font-bold text-emerald-800">{scheduledPeriods} 节</span>
                  </div>
                </div>

                {relatedCourses.length > 0 && (
                  <div className="pt-2 border-t border-neutral-200">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                      包含课程:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {relatedCourses.map(c => (
                        <span
                          key={c.id}
                          className="px-1.5 py-0.5 bg-[#F4F2F0] border border-neutral-300 text-[10px] font-medium truncate max-w-[120px]"
                          title={c.name}
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-neutral-200">
                <button
                  onClick={() => handleOpenEdit(group)}
                  className="px-2.5 py-1 border border-[#1A1A1A] hover:bg-neutral-100 text-xs font-bold cursor-pointer transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(group.id)}
                  className="px-2.5 py-1 text-red-700 hover:bg-red-50 text-xs font-bold cursor-pointer transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <div className="border border-[#1A1A1A] p-12 text-center bg-[#FDFCFB]">
          <span className="material-symbols-outlined text-4xl text-neutral-400 mb-2">groups</span>
          <p className="font-serif italic font-bold text-neutral-700">暂无班级数据</p>
          <p className="text-xs text-neutral-500 mt-1">点击右上角「新增班级/年级」快速建档</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-[#FDFCFB] border-2 border-[#1A1A1A] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#1A1A1A] pb-3">
              <h3 className="text-xl font-serif italic font-bold text-[#1A1A1A]">
                {editingGroup ? '编辑班级信息' : '新增班级 / 年级'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-500 hover:text-[#1A1A1A] text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  班级名称:
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="例如: 高一(1)班 或 初三强化A班"
                  className="w-full bg-white border border-[#1A1A1A] p-2 text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  班级人数:
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  required
                  value={groupSize}
                  onChange={(e) => setGroupSize(Number(e.target.value) || 40)}
                  className="w-full bg-white border border-[#1A1A1A] p-2 text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  默认固定教室 (选填):
                </label>
                <select
                  value={homeRoomId}
                  onChange={(e) => setHomeRoomId(e.target.value)}
                  className="w-full bg-white border border-[#1A1A1A] p-2 text-xs font-bold focus:outline-none"
                >
                  <option value="">-- 无固定教室 (由排课算法动态分配) --</option>
                  {dataset.rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.type}, 容量: {r.capacity}人)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  课表标识色彩:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {palette.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setGroupColor(c)}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                        groupColor === c ? 'scale-125 ring-2 ring-[#1A1A1A] ring-offset-1' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#1A1A1A] text-xs font-bold hover:bg-neutral-100 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer"
                >
                  保存班级
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
