import React, { useState } from 'react';
import { ScheduleConflict, ScheduleDataset, ScheduleVersion, SlotAssignment } from '../types';
import { validateSchedule } from '../utils/schedulerEngine';
import { ScheduleGrid } from './ScheduleGrid';
import { exportTimetable, ExportOptions } from '../utils/exportUtils';

interface TimetableManagementProps {
  dataset: ScheduleDataset;
  assignments: SlotAssignment[];
  conflicts?: ScheduleConflict[];
  onUpdateAssignments: (assignments: SlotAssignment[]) => void;
  onUpdateDataset: (updated: ScheduleDataset) => void;
  onSelectAssignment: (assignment: SlotAssignment) => void;
  onSlotClick?: (dayIndex: number, periodIndex: number, existingAssignment?: SlotAssignment, specificDate?: string) => void;
  onClearAssignment: (id: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const TimetableManagement: React.FC<TimetableManagementProps> = ({
  dataset,
  assignments = [],
  conflicts = [],
  onUpdateAssignments,
  onUpdateDataset,
  onSelectAssignment,
  onSlotClick,
  onClearAssignment,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');
  const [selectedSemester, setSelectedSemester] = useState<string>(dataset.semester || '2026年春季学期');
  const [versions, setVersions] = useState<ScheduleVersion[]>(() => {
    if (dataset.versions && dataset.versions.length > 0) return dataset.versions;
    return [
      {
        id: 'v_default',
        name: '排课初始主方案',
        semester: '2026年春季学期',
        createdAt: new Date().toLocaleDateString(),
        assignments: assignments,
      },
    ];
  });

  // Compare mode selections (select 2 versions to compare)
  const [compareVersionAId, setCompareVersionAId] = useState<string>('v_default');
  const [compareVersionBId, setCompareVersionBId] = useState<string>('v_default');

  // Rename state
  const [renamingVersionId, setRenamingVersionId] = useState<string | null>(null);
  const [newVersionName, setNewVersionName] = useState<string>('');

  // Modal for new version
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [newVersionInputName, setNewVersionInputName] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [exportScope, setExportScope] = useState<'master' | 'by_group' | 'by_teacher' | 'details'>('master');
  const [exportTargetEntityId, setExportTargetEntityId] = useState<string>('all');

  const handleExecuteExport = () => {
    try {
      exportTimetable(dataset, assignments, {
        format: exportFormat,
        scope: exportScope,
        selectedEntityId: exportTargetEntityId,
        versionName: '当前排课方案',
      });
      setShowExportModal(false);
      showToast(`已成功导出 ${exportFormat.toUpperCase()} 文件！`);
    } catch (err: any) {
      console.error(err);
      alert('导出失败: ' + (err?.message || '未知错误'));
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Save current active schedule as new version
  const handleSaveNewVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionInputName.trim()) return;

    const newVer: ScheduleVersion = {
      id: `ver_${Date.now()}`,
      name: newVersionInputName.trim(),
      semester: selectedSemester,
      createdAt: new Date().toLocaleDateString(),
      assignments: [...assignments],
    };

    const updatedVersions = [...versions, newVer];
    setVersions(updatedVersions);
    onUpdateDataset({ ...dataset, versions: updatedVersions });
    setShowSaveVersionModal(false);
    setNewVersionInputName('');
    showToast(`已成功保存为新课表版本《${newVer.name}》！`);
  };

  const handleRenameVersion = (verId: string) => {
    if (!newVersionName.trim()) return;
    const updated = versions.map((v) => (v.id === verId ? { ...v, name: newVersionName.trim() } : v));
    setVersions(updated);
    onUpdateDataset({ ...dataset, versions: updated });
    setRenamingVersionId(null);
    setNewVersionName('');
  };

  const versionA = versions.find((v) => v.id === compareVersionAId) || versions[0];
  const versionB = versions.find((v) => v.id === compareVersionBId) || versions[1] || versions[0];

  return (
    <div className="flex-1 flex flex-col w-full">
      {/* Top Controls Header */}
      <div className="bg-[#FDFCFB] border-b border-[#1A1A1A] p-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#1A1A1A] pb-4">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
              Step 6 • Timetable Viewing & Multi-Version Comparison
            </span>
            <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A] flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-[#1A1A1A]">table_chart</span>
              课表管理与对比
            </h2>
          </div>

          {/* Mode Switcher & Semester Selector */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Semester selector */}
            <div className="flex items-center gap-2 text-xs border border-[#1A1A1A] px-2.5 py-1.5 bg-[#F4F2F0]">
              <span className="text-[10px] uppercase font-bold text-neutral-500">学期筛选:</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-transparent font-bold text-xs text-[#1A1A1A] focus:outline-none cursor-pointer"
              >
                <option value="2026年春季学期">2026年春季学期</option>
                <option value="2026年秋季学期">2026年秋季学期</option>
                <option value="暑期集训班">暑期集训班</option>
              </select>
            </div>

            {/* Mode Switch Button */}
            <div className="flex border border-[#1A1A1A] text-xs font-bold uppercase tracking-wider bg-[#F4F2F0]">
              <button
                onClick={() => setViewMode('single')}
                className={`px-3.5 py-1.5 cursor-pointer transition-colors flex items-center gap-1 ${
                  viewMode === 'single' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">grid_on</span>
                一周排课详情
              </button>
              <button
                onClick={() => setViewMode('compare')}
                className={`px-3.5 py-1.5 cursor-pointer transition-colors flex items-center gap-1 ${
                  viewMode === 'compare' ? 'bg-[#1A1A1A] text-white' : 'text-neutral-700 hover:text-[#1A1A1A]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">compare</span>
                双课表勾选对比 ({versions.length}个版本)
              </button>
            </div>

            {/* Export & Save Version Actions */}
            <div className="flex items-center gap-2">
              {/* Undo / Redo Buttons */}
              {onUndo && onRedo && (
                <div className="no-print flex items-center gap-1 border border-[#1A1A1A] bg-[#FDFCFB] p-0.5 shadow-2xs mr-1">
                  <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`px-2.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1 border border-transparent ${
                      canUndo
                        ? 'hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] cursor-pointer active:scale-95'
                        : 'text-neutral-300 cursor-not-allowed opacity-40'
                    }`}
                    title={canUndo ? '撤销上一步排课 (Ctrl+Z)' : '无更早历史可撤销'}
                  >
                    <span className="material-symbols-outlined text-sm">undo</span>
                    <span>撤销</span>
                  </button>
                  <div className="w-[1px] h-4 bg-neutral-300"></div>
                  <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className={`px-2.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1 border border-transparent ${
                      canRedo
                        ? 'hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] cursor-pointer active:scale-95'
                        : 'text-neutral-300 cursor-not-allowed opacity-40'
                    }`}
                    title={canRedo ? '重做排课 (Ctrl+Y / Cmd+Shift+Z)' : '无重做历史'}
                  >
                    <span className="material-symbols-outlined text-sm">redo</span>
                    <span>重做</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => window.print()}
                className="no-print px-3.5 py-1.5 bg-[#1A1A1A] text-white text-xs font-bold uppercase hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm border border-[#1A1A1A]"
                title="直接触发 A4 纸排版标准打印与保存 PDF"
              >
                <span className="material-symbols-outlined text-sm text-amber-400">print</span>
                <span>A4 网页打印/PDF</span>
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                className="no-print px-3.5 py-1.5 bg-emerald-800 text-white text-xs font-bold uppercase hover:bg-emerald-900 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                批量导出 (Excel/CSV)
              </button>

              <button
                onClick={() => {
                  setNewVersionInputName(`2026春季微调版_${versions.length + 1}`);
                  setShowSaveVersionModal(true);
                }}
                className="no-print px-3.5 py-1.5 bg-[#1A1A1A] text-white text-xs font-bold uppercase hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">bookmark_add</span>
                备份为新课表版本
              </button>
            </div>
          </div>
        </div>

        {/* Version List Toolbar */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
          <span className="text-[10px] font-bold text-neutral-500 uppercase mr-1">已存在课表版本:</span>
          {versions.map((v) => (
            <div
              key={v.id}
              className="px-2.5 py-1 border border-[#1A1A1A] bg-[#F4F2F0] flex items-center gap-2 whitespace-nowrap"
            >
              {renamingVersionId === v.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    className="bg-white border border-[#1A1A1A] px-1 py-0.5 text-xs font-bold"
                  />
                  <button
                    onClick={() => handleRenameVersion(v.id)}
                    className="text-emerald-800 font-bold px-1"
                  >
                    保存
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-bold text-[#1A1A1A]">{v.name}</span>
                  <span className="text-[9px] text-neutral-500">({v.assignments?.length || 0}节)</span>
                  <button
                    onClick={() => {
                      setRenamingVersionId(v.id);
                      setNewVersionName(v.name);
                    }}
                    className="text-neutral-400 hover:text-[#1A1A1A]"
                    title="重命名版本"
                  >
                    ✎
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Mode View */}
      {viewMode === 'single' ? (
        /* Single Weekly Master Timetable Grid */
        <ScheduleGrid
          dataset={dataset}
          assignments={assignments}
          conflicts={conflicts.length > 0 ? conflicts : validateSchedule(dataset, assignments)}
          onSelectAssignment={onSelectAssignment}
          onSlotClick={onSlotClick}
          onClearAssignment={onClearAssignment}
          onClearAll={() => onUpdateAssignments([])}
          onUpdateAssignments={onUpdateAssignments}
        />
      ) : (
        /* Dual Timetable Comparison View */
        <div className="p-6 max-w-7xl mx-auto w-full flex-1">
          {/* Comparison Controls */}
          <div className="p-4 border border-[#1A1A1A] bg-[#F4F2F0] mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="material-symbols-outlined text-amber-700">compare_arrows</span>
              <span>勾选并对比 2 个课表版本的差异变动：</span>
            </div>

            <div className="flex items-center gap-6 text-xs">
              {/* Version A Dropdown */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-900 bg-blue-100 px-1.5 py-0.5 border border-blue-400">课表 A:</span>
                <select
                  value={compareVersionAId}
                  onChange={(e) => setCompareVersionAId(e.target.value)}
                  className="bg-white border border-[#1A1A1A] px-2 py-1 font-bold text-xs focus:outline-none"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.assignments?.length || 0}节)
                    </option>
                  ))}
                </select>
              </div>

              <span className="font-bold text-neutral-400">VS</span>

              {/* Version B Dropdown */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-900 bg-purple-100 px-1.5 py-0.5 border border-purple-400">课表 B:</span>
                <select
                  value={compareVersionBId}
                  onChange={(e) => setCompareVersionBId(e.target.value)}
                  className="bg-white border border-[#1A1A1A] px-2 py-1 font-bold text-xs focus:outline-none"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.assignments?.length || 0}节)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dual Side-by-Side Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Version A */}
            <div className="border border-blue-600 bg-[#FDFCFB] p-4">
              <h4 className="text-base font-serif italic font-bold border-b border-blue-600 pb-2 mb-4 text-blue-900 flex justify-between">
                <span>方案 A: {versionA?.name || '默认版本'}</span>
                <span className="text-xs font-mono font-normal">共 {versionA?.assignments?.length || 0} 节课时</span>
              </h4>
              <ScheduleGrid
                dataset={dataset}
                assignments={versionA?.assignments || []}
                conflicts={validateSchedule(dataset, versionA?.assignments || [])}
                onSelectAssignment={onSelectAssignment}
                onClearAssignment={onClearAssignment}
                onClearAll={() => {}}
              />
            </div>

            {/* Right: Version B */}
            <div className="border border-purple-600 bg-[#FDFCFB] p-4">
              <h4 className="text-base font-serif italic font-bold border-b border-purple-600 pb-2 mb-4 text-purple-900 flex justify-between">
                <span>方案 B: {versionB?.name || '默认版本'}</span>
                <span className="text-xs font-mono font-normal">共 {versionB?.assignments?.length || 0} 节课时</span>
              </h4>
              <ScheduleGrid
                dataset={dataset}
                assignments={versionB?.assignments || []}
                conflicts={validateSchedule(dataset, versionB?.assignments || [])}
                onSelectAssignment={onSelectAssignment}
                onClearAssignment={onClearAssignment}
                onClearAll={() => {}}
              />
            </div>
          </div>
        </div>
      )}
      {/* Save Version Modal */}
      {showSaveVersionModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSaveVersionModal(false);
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FDFCFB] border-2 border-[#1A1A1A] max-w-md w-full p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-serif italic font-bold border-b border-[#1A1A1A] pb-2 mb-4">
              备份保存当前课表为新版本
            </h3>
            <form onSubmit={handleSaveNewVersion} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-1">
                  新课表版本名称 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: 2026春季开学微调版B"
                  value={newVersionInputName}
                  onChange={(e) => setNewVersionInputName(e.target.value)}
                  className="w-full bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveVersionModal(false)}
                  className="px-4 py-2 border border-[#1A1A1A] text-xs font-bold hover:bg-neutral-200 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1A1A1A] text-white text-xs font-bold uppercase hover:bg-neutral-800 cursor-pointer"
                >
                  保存新版本
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Timetable Modal */}
      {showExportModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExportModal(false);
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FDFCFB] border-2 border-[#1A1A1A] max-w-xl w-full p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#1A1A1A] pb-3 mb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
                  Export & Print Archiving
                </span>
                <h3 className="text-2xl font-serif italic font-bold text-[#1A1A1A] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#1A1A1A]">download</span>
                  课表导出与打印存档
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-neutral-500 hover:text-[#1A1A1A] text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              {/* 1. Format Selection */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-2">
                  1. 选择导出文件格式
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExportFormat('excel')}
                    className={`p-3 border text-left transition-all cursor-pointer ${
                      exportFormat === 'excel'
                        ? 'border-emerald-800 bg-emerald-50/50 shadow-xs'
                        : 'border-[#1A1A1A] bg-[#F4F2F0] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-[#1A1A1A]">
                      <span className="material-symbols-outlined text-emerald-800 text-base">table_view</span>
                      <span>Excel 工作簿 (.xlsx)</span>
                    </div>
                    <p className="text-[10px] text-neutral-600 mt-1 leading-tight">
                      原生二进制 XLSX 封装，彻底解决乱码问题，支持分Sheet归档。
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`p-3 border text-left transition-all cursor-pointer ${
                      exportFormat === 'pdf'
                        ? 'border-red-800 bg-red-50/50 shadow-xs'
                        : 'border-[#1A1A1A] bg-[#F4F2F0] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-[#1A1A1A]">
                      <span className="material-symbols-outlined text-red-800 text-base">picture_as_pdf</span>
                      <span>PDF 打印文档 (.pdf)</span>
                    </div>
                    <p className="text-[10px] text-neutral-600 mt-1 leading-tight">
                      矢量高清排版排版，可直接下载 PDF 或送打印机输出。
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 border text-left transition-all cursor-pointer ${
                      exportFormat === 'csv'
                        ? 'border-blue-800 bg-blue-50/50 shadow-xs'
                        : 'border-[#1A1A1A] bg-[#F4F2F0] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-[#1A1A1A]">
                      <span className="material-symbols-outlined text-blue-800 text-base">csv</span>
                      <span>CSV 通用表 (.csv)</span>
                    </div>
                    <p className="text-[10px] text-neutral-600 mt-1 leading-tight">
                      带 UTF-8 BOM 签名的纯文本，适合其他教务系统二次导入。
                    </p>
                  </button>
                </div>
              </div>

              {/* 2. Scope Selection */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-600 mb-2">
                  2. 选择导出视图维度
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'master',
                      title: '全校班级总表',
                      desc: '全校班级一排到底的大课表，方便教务处统览',
                      icon: 'border_all',
                    },
                    {
                      id: 'by_group',
                      title: '班级一周排课表',
                      desc: '按班级生成标准单周课表（可导出所有或单班）',
                      icon: 'groups',
                    },
                    {
                      id: 'by_teacher',
                      title: '教师授课表',
                      desc: '按教师生成个人授课表（可导出所有或单教师）',
                      icon: 'person',
                    },
                    {
                      id: 'details',
                      title: '完整排课明细清单',
                      desc: '平铺的所有课程安排清单，包含教师/教室/节次',
                      icon: 'list_alt',
                    },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setExportScope(s.id as any);
                        setExportTargetEntityId('all');
                      }}
                      className={`p-2.5 border text-left cursor-pointer transition-all ${
                        exportScope === s.id
                          ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                          : 'border-[#1A1A1A] bg-[#F4F2F0] hover:bg-white text-[#1A1A1A]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                        <span className="material-symbols-outlined text-sm">{s.icon}</span>
                        <span>{s.title}</span>
                      </div>
                      <p
                        className={`text-[10px] leading-tight ${
                          exportScope === s.id ? 'text-neutral-300' : 'text-neutral-500'
                        }`}
                      >
                        {s.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Entity Filter (if by_group or by_teacher) */}
              {exportScope === 'by_group' && (
                <div className="bg-[#F4F2F0] p-3 border border-[#1A1A1A]">
                  <label className="block text-[10px] uppercase font-bold text-neutral-600 mb-1">
                    指定班级筛选:
                  </label>
                  <select
                    value={exportTargetEntityId}
                    onChange={(e) => setExportTargetEntityId(e.target.value)}
                    className="w-full bg-white border border-[#1A1A1A] px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                  >
                    <option value="all">导出全校所有班级 ({dataset.groups.length}个班级，分Sheet/块)</option>
                    {dataset.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        【{g.name}】 ({g.size}名学生)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {exportScope === 'by_teacher' && (
                <div className="bg-[#F4F2F0] p-3 border border-[#1A1A1A]">
                  <label className="block text-[10px] uppercase font-bold text-neutral-600 mb-1">
                    指定教师筛选:
                  </label>
                  <select
                    value={exportTargetEntityId}
                    onChange={(e) => setExportTargetEntityId(e.target.value)}
                    className="w-full bg-white border border-[#1A1A1A] px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                  >
                    <option value="all">导出全校所有教师 ({dataset.teachers.length}名教师，分Sheet/块)</option>
                    {dataset.teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        【{t.name}】 ({t.subject})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Summary Bar */}
              <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between font-mono">
                <span>包含排课数据: <b>{assignments.length}</b> 节课时安排</span>
                <span>目标学期: <b>{selectedSemester}</b></span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1A1A1A]">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 border border-[#1A1A1A] text-xs font-bold hover:bg-neutral-200 cursor-pointer flex items-center gap-1.5 text-neutral-800"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  网页快捷打印 / 预览
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 border border-[#1A1A1A] text-xs font-bold hover:bg-neutral-200 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteExport}
                    className="px-5 py-2 bg-emerald-800 text-white text-xs font-bold uppercase hover:bg-emerald-900 transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    导出并下载文件
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1A1A1A] text-white px-4 py-3 border border-white/20 shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
