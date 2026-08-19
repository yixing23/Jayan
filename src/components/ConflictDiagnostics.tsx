import React from 'react';
import { BottleneckDiagnostic, ScheduleConflict, ScheduleDataset, SchedulerMetrics, SlotAssignment } from '../types';
import { findTop3CandidateSlots } from '../utils/candidateSlotFinder';

interface ConflictDiagnosticsProps {
  conflicts: ScheduleConflict[];
  metrics: SchedulerMetrics;
  dataset: ScheduleDataset;
  assignments?: SlotAssignment[];
  onAutoFixConflict: (conflict: ScheduleConflict) => void;
  onRunAutoSchedule: () => void;
  onMoveAssignmentToSlot?: (assignmentId: string, dayIndex: number, periodIndex: number) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const ConflictDiagnostics: React.FC<ConflictDiagnosticsProps> = ({
  conflicts,
  metrics,
  dataset,
  assignments = [],
  onAutoFixConflict,
  onRunAutoSchedule,
  onMoveAssignmentToSlot,
  onNavigateToTab,
}) => {
  const hardConflicts = conflicts.filter((c) => c.severity === 'hard');
  const softConflicts = conflicts.filter((c) => c.severity === 'soft');
  const bottlenecks: BottleneckDiagnostic[] = metrics.bottlenecks || [];

  const getTypeName = (type: string) => {
    switch (type) {
      case 'teacher_double_booked': return '教师冲突';
      case 'room_double_booked': return '教室冲突';
      case 'group_double_booked': return '班级冲突';
      case 'teacher_unavailable': return '禁排时段';
      case 'room_type_mismatch': return '场地不符';
      case 'room_capacity_exceeded': return '容量不足';
      case 'teacher_overload_day': return '单日超载';
      case 'teacher_overload_week': return '周课时超限';
      default: return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="border-b border-[#1A1A1A] pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
            排课约束审计、失败归因与实时诊断
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A] flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-emerald-800">health_and_safety</span>
            课表健康与瓶颈诊断
          </h2>
        </div>

        <button
          onClick={onRunAutoSchedule}
          className="px-5 py-2.5 bg-[#1A1A1A] text-white text-xs uppercase font-bold tracking-[0.2em] hover:bg-neutral-800 transition-colors cursor-pointer border border-[#1A1A1A] flex items-center gap-2 shadow-sm active:scale-98"
        >
          <span className="material-symbols-outlined text-sm text-amber-400">auto_fix_high</span>
          重新运行智能排课引擎
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-[#1A1A1A] p-4 bg-[#FDFCFB]">
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
            硬性规则冲突
          </span>
          <p className="text-3xl font-serif italic font-bold text-red-700 mt-1">
            {metrics.hardConflictsCount}
          </p>
          <p className="text-[10px] text-neutral-500 mt-1">时间重叠与禁排冲突</p>
        </div>

        <div className="border border-[#1A1A1A] p-4 bg-[#FDFCFB]">
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
            软性规则预警
          </span>
          <p className="text-3xl font-serif italic font-bold text-amber-700 mt-1">
            {metrics.softConflictsCount}
          </p>
          <p className="text-[10px] text-neutral-500 mt-1">容量与工作量上限</p>
        </div>

        <div className="border border-[#1A1A1A] p-4 bg-[#FDFCFB]">
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
            排课完成度
          </span>
          <p className="text-3xl font-serif italic font-bold text-[#1A1A1A] mt-1">
            {metrics.completionRate}%
          </p>
          <p className="text-[10px] text-neutral-500 mt-1">
            已安排 {metrics.scheduledPeriods} / {metrics.totalRequiredPeriods} 节课
          </p>
        </div>

        <div className="border border-[#1A1A1A] p-4 bg-[#FDFCFB]">
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
            教室平均利用率
          </span>
          <p className="text-3xl font-serif italic font-bold text-[#1A1A1A] mt-1">
            {metrics.roomUtilizationRate}%
          </p>
          <p className="text-[10px] text-neutral-500 mt-1">全校场地时段使用密度</p>
        </div>
      </div>

      {/* Bottlenecks Attribution Section (When courses failed to be scheduled 100%) */}
      {bottlenecks.length > 0 && (
        <div className="border-2 border-amber-800 bg-[#FDFCFB] overflow-hidden shadow-sm">
          <div className="p-4 bg-amber-900 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-amber-300">troubleshoot</span>
              排课未满瓶颈归因诊断 ({bottlenecks.length} 门课程受限)
            </span>
            <span className="text-[10px] font-mono opacity-90">算法归因分析</span>
          </div>

          <div className="p-4 bg-amber-50/50 border-b border-amber-200 text-xs text-amber-950 font-serif leading-relaxed">
            系统智能分析了未排满课程的约束瓶颈。通常由于<b>专用教室短缺</b>、<b>教师可用时间耗尽</b>或<b>班级时间重叠</b>引起。请参考以下建议快速调整：
          </div>

          <div className="divide-y divide-amber-200">
            {bottlenecks.map((b) => (
              <div key={b.courseId} className="p-4 hover:bg-amber-50/40 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-800 text-white text-[10px] font-mono font-bold">
                      {b.category === 'room_shortage'
                        ? '场地资源不足'
                        : b.category === 'teacher_unavailable'
                        ? '教师负荷/时段受限'
                        : '班级时间冲突'}
                    </span>
                    <h4 className="font-serif italic font-bold text-base text-[#1A1A1A]">
                      {b.courseName}
                    </h4>
                    <span className="text-xs font-mono text-red-700 font-bold">
                      (剩余 {b.unscheduledPeriods}/{b.totalPeriods} 节未排)
                    </span>
                  </div>

                  <p className="text-xs text-neutral-800 font-serif">
                    <b>受阻原因：</b>{b.reason}
                  </p>

                  <p className="text-xs text-emerald-800 font-mono flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">lightbulb</span>
                    <b>破局建议：</b>{b.suggestion}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {b.category === 'room_shortage' && onNavigateToTab && (
                    <button
                      onClick={() => onNavigateToTab('rooms')}
                      className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer border border-[#1A1A1A]"
                    >
                      前往教室管理增加场地
                    </button>
                  )}
                  {b.category === 'teacher_unavailable' && onNavigateToTab && (
                    <button
                      onClick={() => onNavigateToTab('teachers')}
                      className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer border border-[#1A1A1A]"
                    >
                      前往教师管理调整时间
                    </button>
                  )}
                  {b.category === 'group_clash' && onNavigateToTab && (
                    <button
                      onClick={() => onNavigateToTab('courses')}
                      className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer border border-[#1A1A1A]"
                    >
                      前往课程管理微调设置
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflicts List */}
      {conflicts.length === 0 ? (
        <div className="border-2 border-[#1A1A1A] p-12 bg-[#FDFCFB] text-center shadow-xs">
          <span className="material-symbols-outlined text-5xl text-emerald-700 mb-3">
            verified
          </span>
          <h3 className="text-2xl font-serif italic font-bold text-[#1A1A1A]">
            未检测到任何规则冲突！
          </h3>
          <p className="text-xs text-neutral-600 mt-2 max-w-md mx-auto leading-relaxed">
            当前课表完全满足所有教师、教室及班级的硬性排课规则。无教师分身、无教室重复占用、无班级时段重叠。
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hard Conflicts */}
          {hardConflicts.length > 0 && (
            <div className="border border-[#1A1A1A] bg-[#FDFCFB]">
              <div className="p-4 bg-red-900 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  硬性冲突 ({hardConflicts.length}) — 需及时调整
                </span>
                <span className="text-[10px] opacity-80 font-mono">必须消除</span>
              </div>

              <div className="divide-y divide-[#1A1A1A]">
                {hardConflicts.map((c) => {
                  const targetAssignment = assignments.find((a) => (c.involvedAssignmentIds || c.affectedAssignmentIds)?.includes(a.id));
                  const candidateSlots = targetAssignment ? findTop3CandidateSlots(targetAssignment, dataset, assignments) : [];

                  return (
                    <div key={c.id} className="p-4 hover:bg-[#F4F2F0] transition-colors flex flex-col gap-3">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-red-800 text-white text-[9px] font-mono font-bold uppercase">
                              {getTypeName(c.type)}
                            </span>
                            <h4 className="font-serif italic font-bold text-base text-[#1A1A1A]">
                              {c.title}
                            </h4>
                          </div>
                          <p className="text-xs text-neutral-700 font-serif">{c.description}</p>
                          {c.fixSuggestion && (
                            <p className="text-xs font-mono text-emerald-800 mt-1.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">lightbulb</span>
                              排课建议：{c.fixSuggestion}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => onAutoFixConflict(c)}
                          className="px-4 py-2 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs uppercase font-bold tracking-wider cursor-pointer whitespace-nowrap transition-colors border border-[#1A1A1A] shadow-2xs"
                        >
                          智能自动调换
                        </button>
                      </div>

                      {/* Candidate Slots Recommendations */}
                      {candidateSlots.length > 0 && onMoveAssignmentToSlot && (
                        <div className="bg-amber-50/80 border border-amber-300 p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                            <span className="material-symbols-outlined text-sm text-amber-700">auto_awesome</span>
                            <span>推荐最佳解冲突空闲槽位:</span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {candidateSlots.map((slot) => (
                              <button
                                key={`${slot.dayIndex}_${slot.periodIndex}`}
                                onClick={() => onMoveAssignmentToSlot(slot.assignmentId, slot.dayIndex, slot.periodIndex)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-mono text-[11px] font-bold border border-amber-800 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <span>{slot.label}</span>
                                <span className="material-symbols-outlined text-xs">arrow_forward</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Soft Conflicts */}
          {softConflicts.length > 0 && (
            <div className="border border-[#1A1A1A] bg-[#FDFCFB]">
              <div className="p-4 bg-amber-800 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">warning</span>
                  软性规则 ({softConflicts.length}) — 偏好优化预警
                </span>
                <span className="text-[10px] opacity-80 font-mono">非阻断提示</span>
              </div>

              <div className="divide-y divide-[#1A1A1A]">
                {softConflicts.map((c) => (
                  <div key={c.id} className="p-4 hover:bg-[#F4F2F0] transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-400 text-[9px] font-mono font-bold uppercase">
                        {getTypeName(c.type)}
                      </span>
                      <h4 className="font-serif italic font-bold text-base text-[#1A1A1A]">
                        {c.title}
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-700 font-serif">{c.description}</p>
                    {c.fixSuggestion && (
                      <p className="text-xs font-mono text-neutral-600 mt-1">
                        优化建议：{c.fixSuggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
