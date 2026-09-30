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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#1A1A1A] pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block mb-0.5">
            Step 3 • Group Directory
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A]">
            班级管理
          </h2>
        </div>
        <div className="text-xs font-bold font-mono text-neutral-500 self-end">
            共 {dataset.groups.length} 个班级
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 max-w-md bg-white border border-neutral-300 rounded px-3 py-2 shadow-sm">
            <span className="material-symbols-outlined text-neutral-400 text-sm">search</span>
            <input
              type="text"
              placeholder="搜索班级..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm focus:outline-none bg-transparent"
            />
          </div>
          
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded shadow-sm transition-colors cursor-pointer"
          >
            新增班级
          </button>
        </div>
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredGroups.map(group => {
          const homeroom = dataset.rooms.find(r => r.id === group.homeRoomId);
          const relatedCourses = dataset.courses.filter(c => c.groupId === group.id);
          const scheduledPeriods = dataset.assignments?.filter(a => a.groupId === group.id).length || 0;

          return (
            <div
              key={group.id}
              className="bg-white border border-neutral-200 rounded-lg p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: group.color || '#2563eb' }}
              />

              <div className="space-y-4 mt-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-lg text-neutral-900 truncate" title={group.name}>
                    {group.name}
                  </h3>
                  <span className="px-2 py-0.5 bg-neutral-50 border border-neutral-200 rounded text-xs font-medium text-neutral-600 whitespace-nowrap">
                    {group.size} 人
                  </span>
                </div>

                <div className="space-y-2 text-sm text-neutral-500">
                  <div className="flex items-center justify-between">
                    <span>固定教室:</span>
                    <span className="font-medium text-neutral-700 truncate max-w-[120px]">{homeroom ? homeroom.name : '未绑定'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>开设课程:</span>
                    <span className="font-medium text-neutral-700">{relatedCourses.length} 门</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>已排课时:</span>
                    <span className="font-medium text-emerald-600">{scheduledPeriods} 节</span>
                  </div>
                </div>

                {relatedCourses.length > 0 && (
                  <div className="pt-3 border-t border-neutral-100">
                    <span className="text-xs font-medium text-neutral-400 block mb-2">
                      包含课程
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {relatedCourses.slice(0, 5).map(c => (
                        <span
                          key={c.id}
                          className="px-2 py-1 bg-neutral-50 border border-neutral-200 rounded text-xs font-medium text-neutral-600 truncate max-w-[120px]"
                          title={c.name}
                        >
                          {c.name}
                        </span>
                      ))}
                      {relatedCourses.length > 5 && (
                        <span className="px-2 py-1 bg-neutral-50 border border-neutral-200 rounded text-xs font-medium text-neutral-500">
                          +{relatedCourses.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4">
                <button
                  onClick={() => handleOpenEdit(group)}
                  className="px-3 py-1.5 rounded text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(group.id)}
                  className="px-3 py-1.5 rounded text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <div className="border border-neutral-200 rounded-lg p-12 text-center bg-white shadow-sm">
          <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-neutral-400">groups</span>
          </div>
          <p className="font-medium text-neutral-900">暂无班级数据</p>
          <p className="text-sm text-neutral-500 mt-1">点击右上角「新增班级」开始建档</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-900">
                {editingGroup ? '编辑班级' : '新增班级'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                  班级名称
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="例如: 高一(1)班"
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
                  max={200}
                  required
                  value={groupSize}
                  onChange={(e) => setGroupSize(Number(e.target.value) || 40)}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                  固定教室 (选填)
                </label>
                <select
                  value={homeRoomId}
                  onChange={(e) => setHomeRoomId(e.target.value)}
                  className="w-full border border-neutral-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:border-neutral-500 bg-white"
                >
                  <option value="">-- 无固定教室 --</option>
                  {dataset.rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.capacity}人)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">
                  课表主题色
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  {palette.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setGroupColor(c)}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                        groupColor === c ? 'scale-110 ring-2 ring-neutral-900 ring-offset-2' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded text-sm font-medium text-neutral-600 hover:bg-neutral-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
