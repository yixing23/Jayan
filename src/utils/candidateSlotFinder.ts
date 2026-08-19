import { ScheduleDataset, SlotAssignment } from '../types';

export interface CandidateSlot {
  dayIndex: number;
  periodIndex: number;
  score: number;
  label: string; // e.g. "推荐 1: 周三 第2节"
  assignmentId: string;
}

export function findTop3CandidateSlots(
  assignment: SlotAssignment,
  dataset: ScheduleDataset,
  assignments: SlotAssignment[]
): CandidateSlot[] {
  const days = dataset.timeConfig?.days || ['星期一', '星期二', '星期三', '星期四', '星期五'];
  const periods = dataset.timeConfig?.periods || [];

  const candidates: CandidateSlot[] = [];

  days.forEach((dayName, dIdx) => {
    periods.forEach((p, pIdx) => {
      if (p.isBreak) return;
      if (assignment.dayIndex === dIdx && assignment.periodIndex === pIdx) return; // Skip current slot

      // Check teacher conflict
      const teacherBusy = assignments.some(
        (a) => a.id !== assignment.id && a.teacherId === assignment.teacherId && a.dayIndex === dIdx && a.periodIndex === pIdx
      );
      if (teacherBusy) return;

      // Check room conflict
      if (assignment.roomId) {
        const roomBusy = assignments.some(
          (a) => a.id !== assignment.id && a.roomId && a.roomId === assignment.roomId && a.dayIndex === dIdx && a.periodIndex === pIdx
        );
        if (roomBusy) return;
      }

      // Check group conflict
      if (assignment.groupId) {
        const groupBusy = assignments.some(
          (a) => a.id !== assignment.id && a.groupId === assignment.groupId && a.dayIndex === dIdx && a.periodIndex === pIdx
        );
        if (groupBusy) return;
      }

      // Calculate simple score: earlier days and periods preferred, plus balance
      const teacherDayCount = assignments.filter((a) => a.teacherId === assignment.teacherId && a.dayIndex === dIdx).length;
      const score = 100 - (teacherDayCount * 10 + dIdx * 2 + pIdx);

      const dayShort = dayName.replace('星期', '周');
      candidates.push({
        dayIndex: dIdx,
        periodIndex: pIdx,
        score,
        label: `${dayShort}${p.name}`,
        assignmentId: assignment.id,
      });
    });
  });

  // Sort descending by score and pick top 3
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 3).map((c, i) => ({
    ...c,
    label: `推荐 ${i + 1}: ${c.label}`,
  }));
}
