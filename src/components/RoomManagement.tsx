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
      <div className="mb-6 flex items-center justify-between border-b border-[#1A1A1A] pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block mb-0.5">
            Step 2 • Room Roster
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A]">
            场地管理
          </h2>
        </div>
        <span className="text-xs font-bold font-mono text-neutral-500">
          共 {dataset.rooms.length} 间场地
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form: Add Room */}
        <div className="lg:col-span-1 border border-neutral-200 rounded-lg bg-white p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 mb-6">添加场地</h3>
            <form onSubmit={handleAddRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">场地名称</label>
                <input
                  type="text"
                  required
                  placeholder="如: 101多媒体教室"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">所在区域 (选填)</label>
                <input
                  type="text"
                  placeholder="如: 第一教学楼"
                  value={form.building}
                  onChange={(e) => setForm({ ...form, building: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">场地类型</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as RoomType })}
                  className="w-full border border-neutral-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:border-neutral-500 bg-white"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">座位容量</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                />
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

        {/* Right List: Rooms Directory */}
        <div className="lg:col-span-2 border border-neutral-200 rounded-lg bg-white overflow-hidden shadow-sm">
          {dataset.rooms.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 text-sm">
              暂无数据
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 max-h-[600px] overflow-y-auto">
              {dataset.rooms.map((room) => (
                <div key={room.id} className="p-5 hover:bg-neutral-50 transition-colors flex justify-between items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="font-bold text-base text-neutral-900">{room.name}</h4>
                      <span className="px-2 py-0.5 border border-neutral-200 rounded text-xs text-neutral-600 bg-white">
                        {roomTypes.find(t => t.value === room.type)?.label.split(' ')[0] || room.type}
                      </span>
                    </div>
                    <div className="text-sm text-neutral-500 flex gap-4">
                      <span>{room.building || '主校区'}</span>
                      <span>可容纳 {room.capacity} 人</span>
                    </div>
                  </div>

                  {confirmDeleteId === room.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 font-medium">确认删除?</span>
                      <button onClick={() => handleDeleteRoom(room.id)} className="text-xs text-red-600 font-bold hover:underline">删除</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-neutral-500 hover:underline">取消</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingRoom(room)}
                        className="p-1.5 text-neutral-400 hover:text-blue-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(room.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Room Modal */}
      {editingRoom && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingRoom(null);
          }}
          className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-neutral-100">
              <h3 className="font-bold text-lg text-neutral-900">
                编辑场地
              </h3>
              <button
                onClick={() => setEditingRoom(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateRoom(editingRoom);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">场地名称</label>
                <input
                  type="text"
                  required
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">所在区域</label>
                <input
                  type="text"
                  value={editingRoom.building || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, building: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">场地类型</label>
                <select
                  value={editingRoom.type}
                  onChange={(e) => setEditingRoom({ ...editingRoom, type: e.target.value as RoomType })}
                  className="w-full border border-neutral-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:border-neutral-500 bg-white"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5">座位容量</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={editingRoom.capacity}
                  onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 rounded text-sm font-medium text-neutral-600 hover:bg-neutral-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
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
