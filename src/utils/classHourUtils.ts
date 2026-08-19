import { ClassDeductionLog, ClassHourAccount, Course, ScheduleDataset, SlotAssignment } from '../types';

/**
 * Helper to parse multiple student names from strings like "张三、李四", "张三, 李四", "张三 李四"
 */
export function parseStudentNames(studentNamesStr?: string): string[] {
  if (!studentNamesStr || !studentNamesStr.trim()) return [];
  return studentNamesStr
    .split(/[、、,，;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Calculates updated dataset with automatic class-hour account deductions when assignments change.
 */
export function processClassHourDeductions(
  dataset: ScheduleDataset,
  newAssignments: SlotAssignment[],
  prevAssignments: SlotAssignment[] = []
): { updatedDataset: ScheduleDataset; noticeMessages: string[] } {
  const accounts: ClassHourAccount[] = [...(dataset.classHourAccounts || [])];
  const logs: ClassDeductionLog[] = [...(dataset.deductionLogs || [])];
  const noticeMessages: string[] = [];

  const courseObjMap = new Map<string, Course>(dataset.courses.map((c) => [c.id, c]));
  const teacherMap = new Map<string, string>(dataset.teachers.map((t) => [t.id, t.name]));

  const calcStatus = (remaining: number): 'active' | 'expiring_soon' | 'exhausted' => {
    if (remaining <= 0) return 'exhausted';
    if (remaining <= 5) return 'expiring_soon';
    return 'active';
  };

  const newAssignmentMap = new Map<string, SlotAssignment>(newAssignments.map((a) => [a.id, a]));
  const prevAssignmentMap = new Map<string, SlotAssignment>(prevAssignments.map((a) => [a.id, a]));

  // 1. Handle deleted assignments: Revert deducted class hours
  const deletedAssignments = prevAssignments.filter((a) => !newAssignmentMap.has(a.id));
  deletedAssignments.forEach((deleted) => {
    // Find any logs linked to this assignment
    const relatedLogs = logs.filter((l) => l.assignmentId === deleted.id);
    relatedLogs.forEach((log) => {
      const accIdx = accounts.findIndex((acc) => acc.id === log.accountId);
      if (accIdx >= 0) {
        const acc = { ...accounts[accIdx] };
        acc.consumedHours = Math.max(0, acc.consumedHours - log.deductedHours);
        acc.remainingHours = Math.max(0, acc.totalHours - acc.consumedHours);
        acc.status = calcStatus(acc.remainingHours);
        accounts[accIdx] = acc;
        noticeMessages.push(`[消课退回] 删除排课，已退回学员【${acc.studentName}】${log.deductedHours}课时 (剩余: ${acc.remainingHours}节)`);
      }
    });

    // Remove these logs from deductionLogs
    const logIdsToRemove = new Set(relatedLogs.map((l) => l.id));
    if (logIdsToRemove.size > 0) {
      const remainingLogs = logs.filter((l) => !logIdsToRemove.has(l.id));
      logs.length = 0;
      logs.push(...remainingLogs);
    }
  });

  // 2. Handle new or updated assignments: Perform deduction
  newAssignments.forEach((assignment) => {
    const course = courseObjMap.get(assignment.courseId);
    const studentNameStr = assignment.studentNames || course?.studentNames || '';
    const studentList = parseStudentNames(studentNameStr);

    if (studentList.length === 0) return;

    // Check if students for this assignment were already processed
    studentList.forEach((name) => {
      const existingLog = logs.find((l) => l.assignmentId === assignment.id && l.studentName.includes(name));

      if (!existingLog) {
        // Find existing account by studentName & optional course
        let accIdx = accounts.findIndex(
          (acc) =>
            acc.studentName.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(acc.studentName.toLowerCase())
        );

        if (accIdx < 0) {
          // Auto-create new account for student if not existing
          const newAccId = `cha_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const newAccount: ClassHourAccount = {
            id: newAccId,
            studentName: name,
            groupId: assignment.groupId,
            courseId: assignment.courseId,
            totalHours: 20, // default package
            singleLessonDurationMinutes: 120,
            consumedHours: 1, // first class deducted
            remainingHours: 19,
            status: 'active',
            enrollmentDate: new Date().toISOString().slice(0, 10),
            note: '排课自动建立课时账户',
          };
          accounts.push(newAccount);
          accIdx = accounts.length - 1;

          noticeMessages.push(`[自动建账与扣减] 已自动为学员【${name}】建立20课时账户并扣减1节排课 (剩余: 19节)`);
        } else {
          // Deduct from existing account
          const acc = { ...accounts[accIdx] };
          acc.consumedHours += 1;
          acc.remainingHours = Math.max(0, acc.totalHours - acc.consumedHours);
          acc.status = calcStatus(acc.remainingHours);
          accounts[accIdx] = acc;

          noticeMessages.push(
            `[后台自动消课] 排课成功！已扣减学员【${acc.studentName}】1节课时 (剩余: ${acc.remainingHours}/${acc.totalHours}节)`
          );
        }

        // Add Deduction Log
        const targetAcc = accounts[accIdx];
        const newLog: ClassDeductionLog = {
          id: `log_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          accountId: targetAcc.id,
          studentName: targetAcc.studentName,
          courseName: course?.name || assignment.courseId,
          deductedHours: 1,
          singleLessonDurationMinutes: targetAcc.singleLessonDurationMinutes || 120,
          attendedAt: `${new Date().toISOString().slice(0, 10)} (星期${['一','二','三','四','五','六','日'][assignment.dayIndex] || assignment.dayIndex + 1} 第${assignment.periodIndex + 1}节)`,
          teacherName: teacherMap.get(assignment.teacherId) || assignment.teacherId || '',
          assignmentId: assignment.id,
          note: `排课表后台自动扣减 (星期${['一','二','三','四','五','六','日'][assignment.dayIndex] || assignment.dayIndex + 1} 第${assignment.periodIndex + 1}节)`,
        };
        logs.unshift(newLog);
      }
    });
  });

  return {
    updatedDataset: {
      ...dataset,
      classHourAccounts: accounts,
      deductionLogs: logs,
    },
    noticeMessages,
  };
}
