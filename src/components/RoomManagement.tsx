import React, { useState } from 'react';
import { Room, RoomType, ScheduleDataset } from '../types';

interface RoomManagementProps {
  dataset: ScheduleDataset;
  onUpdateDataset: (updated: ScheduleDataset) => void;
}

export const RoomManagement: React.FC<RoomManagementProps> = ({ dataset, onUpdateDataset }) => {
  const [form, setForm] = useState({
    name: '',
    building: '教学楼',
    type: 'General' as RoomType,
    capacity: 40,
  });

  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const roomTypes: { value: RoomType; label: string }[] = [
    { value: 'General', label: '普通教室 (General)' },
    { value: 'Science Lab', label: '理科实验室 (Science Lab)' },
    { value: 'Computer Lab', label: '计算机机房 (Computer Lab)' },
    { value: 'Auditorium', label: '阶梯报告厅 (Auditorium)' },
    { value: 'Gymnasium', label: '体育场馆 (Gymnasium)' },
    { value: 'Workshop', label: '创客/实训室 (Workshop)' },
    { value: 'Art Studio', label: '美术音乐画室 (Art Studio)' },
  ];

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const newRoom: Room = {
      id: `r_${Date.now()}`,
      name: form.name.trim(),
      building: form.building.trim() || '教学楼',
      type: form.type,
      capacity: Number(form.capacity) || 40,
    };

    onUpdateDataset({
      ...dataset,
      rooms: [...dataset.rooms, newRoom],
    });

    setForm({
      name: '',
      building: '教学楼',
      type: 'General',
      capacity: 40,
    });
  };

  const handleUpdateRoom = (updatedRoom: Room) => {
    onUpdateDataset({
      ...dataset,
      rooms: dataset.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
    });
    setEditingRoom(null);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteRoom = (id: string) => {
    onUpdateDataset({
      ...dataset,
      rooms: dataset.rooms.filter((r) => r.id !== id),
      assignments: dataset.assignments.filter((a) => a.roomId !== id),
    });
    setConfirmDeleteId(null);
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
      {/* Step Header */}
      <div className="mb-6 border-b border-[#1A1A1A] pb-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
            Step 2 • Rooms & Venues
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A] flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-[#1A1A1A]">meeting_room</span>
            教室管理与教学场地录入
          </h2>
          <p className="text-xs text-neutral-600 mt-1">
            录入各楼宇教室、多媒体机房、实验室及报告厅场地，设置标准座位容量与类型分类。
          </p>
        </div>
        <span className="px-3 py-1 bg-[#1A1A1A] text-white text-xs font-mono font-bold">
          已有教室: {dataset.rooms.length} 间
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form: Add Room */}
        <div className="lg:col-span-1 border border-[#1A1A1A] p-6 bg-[#FDFCFB] flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-serif italic font-bold text-[#1A1A1A] border-b border-[#1A1A1A] pb-3 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">domain_add</span>
              添加教室场地
            </h3>

            <form onSubmit={handleAddRoom} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  教室/场地名称 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="如: 101多媒体教室 / 302机房"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-serif italic font-bold focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  所在楼宇/区域
                </label>
                <input
                  type="text"
                  placeholder="如: 第一教学楼 / 实验楼"
                  value={form.building}
                  onChange={(e) => setForm({ ...form, building: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  场地类型 *
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as RoomType })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2.5 py-2 text-xs font-medium focus:outline-none focus:bg-white cursor-pointer"
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
                  座位容量 (可纳学员数)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors cursor-pointer mt-4 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">check</span>
                保存教室档案
              </button>
            </form>
          </div>
        </div>

        {/* Right List: Rooms Directory */}
        <div className="lg:col-span-2 border border-[#1A1A1A] bg-[#FDFCFB] flex flex-col justify-between">
          <div>
            <div className="p-4 bg-[#F4F2F0] border-b border-[#1A1A1A] flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">deck</span>
                现有教室与教学场地清单
              </span>
            </div>

            {dataset.rooms.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 text-xs font-mono">
                暂无教室数据。请在左侧添加机构教室与场地。
              </div>
            ) : (
              <div className="divide-y divide-[#1A1A1A] max-h-[560px] overflow-y-auto">
                {dataset.rooms.map((room) => (
                  <div key={room.id} className="p-4 hover:bg-[#F4F2F0]/60 transition-colors flex justify-between items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-serif italic font-bold text-lg text-[#1A1A1A]">{room.name}</h4>
                        <span className="px-2 py-0.5 border border-[#1A1A1A] text-[9px] uppercase font-bold bg-white">
                          {room.type}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-600 flex gap-4 font-mono">
                        <span>所属区域: {room.building || '主校区'}</span>
                        <span>最大容纳: <strong>{room.capacity} 人</strong></span>
                      </div>
                    </div>

                    {confirmDeleteId === room.id ? (
                      <div className="flex items-center gap-1 bg-red-50 p-1 border border-red-600">
                        <span className="text-[10px] font-bold text-red-700 px-1">确定删除?</span>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
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
                          onClick={() => setEditingRoom(room)}
                          className="p-1.5 text-neutral-500 hover:text-blue-700 cursor-pointer transition-colors"
                          title="编辑教室信息"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(room.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-700 cursor-pointer transition-colors"
                          title="删除教室"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Room Modal */}
      {editingRoom && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingRoom(null);
          }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FDFCFB] border border-[#1A1A1A] max-w-md w-full p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#1A1A1A] pb-3 mb-4">
              <h3 className="font-serif italic font-bold text-xl text-[#1A1A1A]">
                编辑教室: {editingRoom.name}
              </h3>
              <button
                onClick={() => setEditingRoom(null)}
                className="p-1 text-neutral-500 hover:text-black cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateRoom(editingRoom);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  教室/场地名称 *
                </label>
                <input
                  type="text"
                  required
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-bold focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  所在楼宇/区域
                </label>
                <input
                  type="text"
                  value={editingRoom.building || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, building: e.target.value })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  场地类型 *
                </label>
                <select
                  value={editingRoom.type}
                  onChange={(e) => setEditingRoom({ ...editingRoom, type: e.target.value as RoomType })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-2.5 py-2 text-xs font-medium focus:outline-none focus:bg-white cursor-pointer"
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
                  座位容量 (可纳学员数)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={editingRoom.capacity}
                  onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 border border-[#1A1A1A] text-xs font-bold hover:bg-neutral-100 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer"
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
