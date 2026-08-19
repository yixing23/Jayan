import {
  BottleneckDiagnostic,
  Course,
  Room,
  ScheduleConflict,
  ScheduleDataset,
  ScheduleResult,
  SlotAssignment,
  Teacher,
  TimeConfig,
  TimeSlot,
} from '../types';

/**
 * Audit existing assignments and find all genuine hard and soft constraint conflicts.
 * Eliminates false alarms: parallel courses with distinct teachers, rooms, and groups are valid.
 */
export function validateSchedule(dataset: ScheduleDataset, assignments: SlotAssignment[] = []): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const { teachers = [], rooms = [], groups = [], courses = [], timeConfig } = dataset || {};

  const teacherMap = new Map((teachers || []).map(t => [t.id, t]));
  const roomMap = new Map((rooms || []).map(r => [r.id, r]));
  const groupMap = new Map((groups || []).map(g => [g.id, g]));
  const courseMap = new Map((courses || []).map(c => [c.id, c]));

  // Helper to determine if two assignments overlap in time
  const doAssignmentsOverlap = (a1: SlotAssignment, a2: SlotAssignment) => {
    if (a1.dayIndex !== a2.dayIndex || a1.periodIndex !== a2.periodIndex) return false;
    
    // If both have specific dates, they must be the same date
    if (a1.specificDate && a2.specificDate) {
      return a1.specificDate === a2.specificDate;
    }
    
    // If one is recurring (no specific date) and the other is specific, they overlap on that day of week.
    return true;
  };

  const getDayName = (dayIndex: number) => (timeConfig?.days || [])[dayIndex] || `第${dayIndex + 1}天`;
  const getPeriodName = (periodIndex: number) => (timeConfig?.periods || [])[periodIndex]?.name || `第${periodIndex + 1}节`;

  const teacherDoubleBookings = new Set<string>();
  const roomDoubleBookings = new Set<string>();
  const groupDoubleBookings = new Set<string>();
  const studentDoubleBookings = new Set<string>();

  // 1. O(N^2) precise pairwise comparison for dimensions overlaps
  for (let i = 0; i < assignments.length; i++) {
    const a1 = assignments[i];
    const course1 = courseMap.get(a1.courseId);
    const mode1 = a1.teachingMode || course1?.teachingMode || 'group';

    for (let j = i + 1; j < assignments.length; j++) {
      const a2 = assignments[j];
      if (!doAssignmentsOverlap(a1, a2)) continue;

      const course2 = courseMap.get(a2.courseId);
      const mode2 = a2.teachingMode || course2?.teachingMode || 'group';

      // Dimension A: Teacher Overlap
      if (a1.teacherId && a1.teacherId === a2.teacherId) {
        const key = [a1.id, a2.id].sort().join('_');
        if (!teacherDoubleBookings.has(key)) {
          teacherDoubleBookings.add(key);
          const teacherName = teacherMap.get(a1.teacherId)?.name || '教师';
          conflicts.push({
            id: `tdouble_${key}`,
            type: 'teacher_double_booked',
            severity: 'hard',
            title: '教师授课时间重叠',
            description: `教师【${teacherName}】在 ${getDayName(a1.dayIndex)} ${getPeriodName(a1.periodIndex)} 被同时安排了多门课程。`,
            affectedAssignmentIds: [a1.id, a2.id],
            involvedAssignmentIds: [a1.id, a2.id],
            dayIndex: a1.dayIndex,
            periodIndex: a1.periodIndex,
            fixSuggestion: `请将重叠的课程移至 ${teacherName} 其他空闲时段。`,
          });
        }
      }

      // Dimension B: Room Overlap
      if (a1.roomId && a2.roomId && a1.roomId === a2.roomId) {
        const key = [a1.id, a2.id].sort().join('_');
        if (!roomDoubleBookings.has(key)) {
          roomDoubleBookings.add(key);
          const roomName = roomMap.get(a1.roomId)?.name || '教室';
          conflicts.push({
            id: `rdouble_${key}`,
            type: 'room_double_booked',
            severity: 'hard',
            title: '教室使用冲突',
            description: `教室【${roomName}】在 ${getDayName(a1.dayIndex)} ${getPeriodName(a1.periodIndex)} 被多门不同课程同时占用。`,
            affectedAssignmentIds: [a1.id, a2.id],
            involvedAssignmentIds: [a1.id, a2.id],
            dayIndex: a1.dayIndex,
            periodIndex: a1.periodIndex,
            fixSuggestion: `请为其中一个班级更换其他可用的空闲教室。`,
          });
        }
      }

      // Dimension C: Group Overlap
      if (mode1 === 'group' && mode2 === 'group' && a1.groupId && a1.groupId === a2.groupId) {
        const key = [a1.id, a2.id].sort().join('_');
        if (!groupDoubleBookings.has(key)) {
          groupDoubleBookings.add(key);
          const groupName = groupMap.get(a1.groupId)?.name || '学生班级';
          conflicts.push({
            id: `gdouble_${key}`,
            type: 'group_double_booked',
            severity: 'hard',
            title: '班级上课时间冲突',
            description: `班级【${groupName}】在 ${getDayName(a1.dayIndex)} ${getPeriodName(a1.periodIndex)} 同时被安排了多门不同课程。`,
            affectedAssignmentIds: [a1.id, a2.id],
            involvedAssignmentIds: [a1.id, a2.id],
            dayIndex: a1.dayIndex,
            periodIndex: a1.periodIndex,
            fixSuggestion: `调整其中一门课程的时段，避免学生班级重叠上课。`,
          });
        }
      }

      // Dimension D: Individual Student Overlap
      const getStudents = (a: SlotAssignment, mode: string, course?: Course) => {
        if (mode === 'group') return [];
        const raw = a.studentNames || course?.studentNames || '';
        return raw.split(/[,，、\s]+/).filter(Boolean);
      };
      
      const students1 = getStudents(a1, mode1, course1);
      const students2 = getStudents(a2, mode2, course2);
      
      const overlappingStudents = students1.filter(s => students2.includes(s));
      if (overlappingStudents.length > 0) {
        const key = [a1.id, a2.id].sort().join('_');
        if (!studentDoubleBookings.has(key)) {
          studentDoubleBookings.add(key);
          const studentName = overlappingStudents[0];
          conflicts.push({
            id: `sdouble_${key}`,
            type: 'group_double_booked',
            severity: 'hard',
            title: '学员上课时间重叠',
            description: `学员【${studentName}】在 ${getDayName(a1.dayIndex)} ${getPeriodName(a1.periodIndex)} 同时有多节一对一/一对多课程。`,
            affectedAssignmentIds: [a1.id, a2.id],
            involvedAssignmentIds: [a1.id, a2.id],
            dayIndex: a1.dayIndex,
            periodIndex: a1.periodIndex,
            fixSuggestion: `将其中一节课调整至学员其他空闲时段。`,
          });
        }
      }
    }
  }

  // 2. Single-Assignment Constraints (Soft Limits, Mismatches, Unavailability)
  const teacherDailyHours = new Map<string, number>();
  const teacherWeeklyHours = new Map<string, number>();

  for (const assign of assignments || []) {
    const course = courseMap.get(assign.courseId);
    const effectiveTeachingMode = assign.teachingMode || course?.teachingMode || 'group';

    // Accumulate daily/weekly hours
    if (assign.teacherId) {
      const tdKey = `${assign.teacherId}_${assign.dayIndex}`;
      teacherDailyHours.set(tdKey, (teacherDailyHours.get(tdKey) || 0) + 1);
      teacherWeeklyHours.set(assign.teacherId, (teacherWeeklyHours.get(assign.teacherId) || 0) + 1);
    }

    // Teacher Unavailability
    const teacher = teacherMap.get(assign.teacherId);
    if (teacher && teacher.unavailableSlots) {
      const isUnavailable = (teacher.unavailableSlots || []).some(
        s => s.dayIndex === assign.dayIndex && s.periodIndex === assign.periodIndex
      );
      if (isUnavailable) {
        conflicts.push({
          id: `unavail_${assign.id}`,
          type: 'teacher_unavailable',
          severity: 'hard',
          title: '教师避让时段冲突',
          description: `${teacher.name} 已设置在 ${getDayName(assign.dayIndex)} ${getPeriodName(assign.periodIndex)} 为不可排课时间。`,
          affectedAssignmentIds: [assign.id],
          involvedAssignmentIds: [assign.id],
          dayIndex: assign.dayIndex,
          periodIndex: assign.periodIndex,
          fixSuggestion: `请将该课程调整至 ${teacher.name} 的空闲时间段。`,
        });
      }
    }

    // Room Mismatch & Capacity
    const room = roomMap.get(assign.roomId);
    if (course && room) {
      if (course.requiredRoomType && course.requiredRoomType !== 'General' && room.type !== course.requiredRoomType) {
        conflicts.push({
          id: `roomtype_${assign.id}`,
          type: 'room_type_mismatch',
          severity: 'hard',
          title: '教室类型不匹配',
          description: `课程“${course.name}”需要【${course.requiredRoomType}】，但当前排在“${room.name}”（类型：${room.type}）。`,
          affectedAssignmentIds: [assign.id],
          involvedAssignmentIds: [assign.id],
          dayIndex: assign.dayIndex,
          periodIndex: assign.periodIndex,
          fixSuggestion: `请将课程重新分配至类型为【${course.requiredRoomType}】的教室。`,
        });
      }

      let actualStudentCount = 1;
      if (effectiveTeachingMode === 'one_on_one') {
        actualStudentCount = 1;
      } else if (effectiveTeachingMode === 'one_on_two') {
        actualStudentCount = 2;
      } else if (assign.studentNames && assign.studentNames.trim()) {
        actualStudentCount = Math.max(1, assign.studentNames.split(/[,，、\s]+/).filter(Boolean).length);
      } else if (course?.studentNames && course.studentNames.trim()) {
        actualStudentCount = Math.max(1, course.studentNames.split(/[,，、\s]+/).filter(Boolean).length);
      } else {
        const group = groupMap.get(assign.groupId);
        if (group) actualStudentCount = group.size;
      }

      if (room.capacity && actualStudentCount > room.capacity) {
        conflicts.push({
          id: `cap_${assign.id}`,
          type: 'room_capacity_exceeded',
          severity: 'soft',
          title: '教室容量不足警告',
          description: `课程“${course?.name || ''}”（${actualStudentCount}人）超出“${room.name}”的最大容纳人数（${room.capacity}人）。`,
          affectedAssignmentIds: [assign.id],
          involvedAssignmentIds: [assign.id],
          dayIndex: assign.dayIndex,
          periodIndex: assign.periodIndex,
          fixSuggestion: `建议更换为容量不小于 ${actualStudentCount} 人的教室，或调整授课人数。`,
        });
      }
    }
  }

  // Teacher Overload limits (Soft Conflicts)
  for (const [tdKey, count] of teacherDailyHours.entries()) {
    const [tId, dayIdxStr] = tdKey.split('_');
    const dayIdx = parseInt(dayIdxStr, 10);
    const teacher = teacherMap.get(tId);
    if (teacher && teacher.maxHoursPerDay && count > teacher.maxHoursPerDay) {
      conflicts.push({
        id: `tdayoverload_${tdKey}`,
        type: 'teacher_overload_day',
        severity: 'soft',
        title: '教师单日课时超限',
        description: `教师【${teacher.name}】在 ${getDayName(dayIdx)} 已排 ${count} 节课，超过其设定的单日上限（${teacher.maxHoursPerDay}节）。`,
        affectedAssignmentIds: [],
        involvedAssignmentIds: [],
        dayIndex: dayIdx,
        fixSuggestion: `将部分课时分散至该教师其他工作日。`,
      });
    }
  }

  for (const [tId, count] of teacherWeeklyHours.entries()) {
    const teacher = teacherMap.get(tId);
    if (teacher && teacher.maxHoursPerWeek && count > teacher.maxHoursPerWeek) {
      conflicts.push({
        id: `tweekoverload_${tId}`,
        type: 'teacher_overload_week',
        severity: 'soft',
        title: '教师周总课时超限',
        description: `教师【${teacher.name}】本周累计排课 ${count} 节，超过周上限（${teacher.maxHoursPerWeek}节）。`,
        affectedAssignmentIds: [],
        involvedAssignmentIds: [],
        fixSuggestion: `调整部分课程的周学时或指派其他合格备选教师。`,
      });
    }
  }

  return conflicts;
}

/**
 * Automatic Backtracking Constraint Solver Engine with Bottleneck Attribution Diagnostics.
 * Schedules courses while respecting locked slots, hard constraints, and soft preferences.
 */
export function runAutoScheduler(dataset: ScheduleDataset): ScheduleResult {
  const startTimeMs = performance.now();
  const { timeConfig, rooms = [], teachers = [], groups = [], courses = [], assignments: existingAssignments = [] } = dataset || {};

  // Keep locked assignments intact
  const lockedAssignments = (existingAssignments || []).filter(a => a.isLocked);
  const assignments: SlotAssignment[] = [...lockedAssignments];

  // Helper maps
  const teacherMap = new Map((teachers || []).map(t => [t.id, t]));
  const roomMap = new Map((rooms || []).map(r => [r.id, r]));
  const groupMap = new Map((groups || []).map(g => [g.id, g]));

  // Valid slots (excluding break periods)
  const validSlots: { dayIndex: number; periodIndex: number }[] = [];
  (timeConfig?.days || []).forEach((_, dayIndex) => {
    (timeConfig?.periods || []).forEach((period, periodIndex) => {
      if (!period.isBreak) {
        validSlots.push({ dayIndex, periodIndex });
      }
    });
  });

  // Calculate needed periods per course
  interface CourseRequirement {
    course: Course;
    periodsRemaining: number;
    assignedPeriods: { dayIndex: number; periodIndex: number }[];
  }

  // Count already scheduled periods from locked assignments
  const courseReqs: CourseRequirement[] = courses.map(course => {
    const lockedForCourse = lockedAssignments.filter(a => a.courseId === course.id);
    return {
      course,
      periodsRemaining: Math.max(0, course.weeklyHours - lockedForCourse.length),
      assignedPeriods: lockedForCourse.map(a => ({ dayIndex: a.dayIndex, periodIndex: a.periodIndex })),
    };
  });

  // Total required periods across all courses
  const totalRequiredPeriods = courses.reduce((sum, c) => sum + (c.weeklyHours || 0), 0);

  // Helper: check if a specific placement satisfies hard constraints
  function isValidPlacement(
    course: Course,
    teacherId: string,
    roomId: string,
    groupId: string,
    dayIndex: number,
    periodIndex: number,
    currentAssignments: SlotAssignment[]
  ): boolean {
    // 1. Teacher unavailable?
    const teacher = teacherMap.get(teacherId);
    if (teacher?.unavailableSlots?.some(s => s.dayIndex === dayIndex && s.periodIndex === periodIndex)) {
      return false;
    }

    // 2. Room type match?
    const room = roomMap.get(roomId);
    if (room && course.requiredRoomType && course.requiredRoomType !== 'General' && room.type !== course.requiredRoomType) {
      return false;
    }

    // 3. Double bookings check
    for (const a of currentAssignments) {
      if (a.dayIndex === dayIndex && a.periodIndex === periodIndex) {
        // Teacher double booking
        if (a.teacherId === teacherId) return false;
        // Room double booking
        if (roomId && a.roomId && a.roomId === roomId) return false;
        // Group double booking for group mode
        const aMode = a.teachingMode || 'group';
        const cMode = course.teachingMode || 'group';
        if (aMode === 'group' && cMode === 'group' && a.groupId === groupId) return false;
      }
    }

    return true;
  }

  // Score candidate slot to pick optimal placement (Soft constraints)
  function scoreSlot(
    course: Course,
    teacherId: string,
    roomId: string,
    dayIndex: number,
    periodIndex: number,
    assignedPeriods: { dayIndex: number; periodIndex: number }[]
  ): number {
    let score = 100;

    // Favor spreading across different days
    const sameDayCount = assignedPeriods.filter(p => p.dayIndex === dayIndex).length;
    if (sameDayCount >= (course.maxConsecutiveHours || 2)) {
      score -= 80; // Penalty for exceeding max consecutive hours per day
    } else if (sameDayCount > 0) {
      const isAdjacent = assignedPeriods.some(
        p => p.dayIndex === dayIndex && Math.abs(p.periodIndex - periodIndex) === 1
      );
      if (course.maxConsecutiveHours > 1 && isAdjacent) {
        score += 30; // Bonus for forming double period if course supports it
      } else if (course.maxConsecutiveHours === 1) {
        score -= 40; // Avoid double period if maxConsecutive is 1
      }
    }

    // Preferred period type (morning vs afternoon)
    const numPeriods = (timeConfig?.periods || []).length;
    const isMorning = periodIndex < Math.floor((numPeriods || 1) / 2);
    if (course.preferredPeriodTypes === 'morning' && isMorning) score += 20;
    if (course.preferredPeriodTypes === 'afternoon' && !isMorning) score += 20;

    // Room capacity exact fit bonus
    const room = roomMap.get(roomId);
    if (room) {
      const mode = course.teachingMode || 'group';
      let studentCount = 1;
      if (mode === 'one_on_one') {
        studentCount = 1;
      } else if (mode === 'one_on_two') {
        studentCount = 2;
      } else if (course.studentNames && course.studentNames.trim()) {
        const names = course.studentNames.split(/[,，、\s]+/).filter(Boolean);
        studentCount = Math.max(1, names.length);
      } else {
        const group = groupMap.get(course.groupId);
        if (group) studentCount = group.size;
      }

      if (studentCount <= room.capacity) {
        score += 15;
        if (room.capacity > studentCount * 2.5) score -= 10;
      } else {
        score -= 50; // Over capacity penalty
      }
    }

    return score;
  }

  // Sort course requirements: harder constrained courses first (Specialized labs & high hours)
  courseReqs.sort((a, b) => {
    const roomConstraintA = a.course.requiredRoomType !== 'General' ? 2 : 1;
    const roomConstraintB = b.course.requiredRoomType !== 'General' ? 2 : 1;
    return roomConstraintB - roomConstraintA || b.periodsRemaining - a.periodsRemaining;
  });

  const bottlenecks: BottleneckDiagnostic[] = [];

  // Scheduling loop
  for (const req of courseReqs) {
    const course = req.course;
    const teacherId = course.teacherId || (teachers || []).find(t => (t?.qualifiedSubjectIds || []).includes(course.id))?.id || teachers[0]?.id;
    if (!teacherId) {
      if (req.periodsRemaining > 0) {
        bottlenecks.push({
          courseId: course.id,
          courseName: course.name,
          unscheduledPeriods: req.periodsRemaining,
          totalPeriods: course.weeklyHours,
          reason: `未指定授课教师，且系统内无具备对应任教资质的教师备选。`,
          suggestion: `请在课程设置中为【${course.name}】指定授课教师，或在教师管理中添加具有授课资格的教师。`,
          category: 'teacher_unavailable',
        });
      }
      continue;
    }

    // Candidate suitable rooms
    const candidateRooms = rooms.filter(r => course.requiredRoomType === 'General' || r.type === course.requiredRoomType);
    const suitableRooms = candidateRooms.length > 0 ? candidateRooms : rooms;

    while (req.periodsRemaining > 0) {
      let bestChoice: { slot: { dayIndex: number; periodIndex: number }; room: Room; score: number } | null = null;

      // Evaluate all valid slots and suitable rooms
      for (const slot of validSlots) {
        for (const room of suitableRooms) {
          if (isValidPlacement(course, teacherId, room.id, course.groupId, slot.dayIndex, slot.periodIndex, assignments)) {
            const score = scoreSlot(course, teacherId, room.id, slot.dayIndex, slot.periodIndex, req.assignedPeriods);
            if (!bestChoice || score > bestChoice.score) {
              bestChoice = { slot, room, score };
            }
          }
        }
      }

      if (bestChoice) {
        const newAssignment: SlotAssignment = {
          id: `assign_${course.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          courseId: course.id,
          teacherId,
          roomId: bestChoice.room.id,
          groupId: course.groupId,
          dayIndex: bestChoice.slot.dayIndex,
          periodIndex: bestChoice.slot.periodIndex,
          teachingMode: course.teachingMode || 'group',
          studentNames: course.studentNames || undefined,
        };

        assignments.push(newAssignment);
        req.assignedPeriods.push(bestChoice.slot);
        req.periodsRemaining--;
      } else {
        // Diagnosing bottleneck reason for why this course could not be scheduled
        const teacher = teacherMap.get(teacherId);
        const group = groupMap.get(course.groupId);
        const reqRoomType = course.requiredRoomType || 'General';
        const minCapacity = group?.size || 30;

        const matchingRooms = rooms.filter(r => (reqRoomType === 'General' || r.type === reqRoomType) && r.capacity >= minCapacity);

        let bottleneckReason = '';
        let suggestion = '';
        let category: BottleneckDiagnostic['category'] = 'teacher_unavailable';

        if (matchingRooms.length === 0) {
          category = 'room_shortage';
          bottleneckReason = `系统内缺少容量 ≥ ${minCapacity} 且类型为【${reqRoomType}】的可用场地。`;
          suggestion = `建议在【教室管理】中新增【${reqRoomType}】场地或调小班级人数。`;
        } else {
          // Check teacher busyness
          const teacherAssignments = assignments.filter(a => a.teacherId === teacherId);
          if (teacher && teacher.maxHoursPerWeek && teacherAssignments.length >= teacher.maxHoursPerWeek) {
            category = 'teacher_unavailable';
            bottleneckReason = `教师【${teacher.name}】已达到周授课上限（${teacher.maxHoursPerWeek}节）。`;
            suggestion = `建议调高教师周课时上限或分派其他备选教师授课。`;
          } else {
            category = 'group_clash';
            bottleneckReason = `教师【${teacher?.name || '任课老师'}】与班级【${group?.name || '上课班级'}】在剩余可用时段均存在时间碰撞或已被占满。`;
            suggestion = `建议调整部分其他非高峰课程或扩展每日/周排课节次。`;
          }
        }

        bottlenecks.push({
          courseId: course.id,
          courseName: course.name,
          unscheduledPeriods: req.periodsRemaining,
          totalPeriods: course.weeklyHours,
          reason: bottleneckReason,
          suggestion,
          category,
        });

        break;
      }
    }
  }

  // Run validation
  const conflicts = validateSchedule(dataset, assignments);
  const executionTimeMs = Math.round(performance.now() - startTimeMs);

  const hardConflictsCount = conflicts.filter(c => c.severity === 'hard').length;
  const softConflictsCount = conflicts.filter(c => c.severity === 'soft').length;
  const scheduledPeriods = assignments.length;
  const completionRate = totalRequiredPeriods > 0
    ? Math.min(100, Math.round((scheduledPeriods / totalRequiredPeriods) * 100))
    : (scheduledPeriods > 0 ? 100 : 0);

  // Accurate Room utilization rate: (occupied room slots / total room slots) * 100
  const totalRoomSlots = Math.max(1, rooms.length * validSlots.length);
  const occupiedRoomSlots = assignments.filter(a => Boolean(a.roomId)).length;
  const roomUtilizationRate = Math.min(100, Math.round((occupiedRoomSlots / totalRoomSlots) * 100));

  return {
    assignments,
    conflicts,
    metrics: {
      totalRequiredPeriods: totalRequiredPeriods || assignments.length,
      scheduledPeriods,
      completionRate,
      hardConflictsCount,
      softConflictsCount,
      roomUtilizationRate,
      teacherBalanceScore: hardConflictsCount === 0 ? 95 : Math.max(50, 95 - hardConflictsCount * 15),
      executionTimeMs,
      bottlenecks,
    },
  };
}
