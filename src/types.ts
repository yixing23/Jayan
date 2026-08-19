export type RoomType = 'General' | 'Science Lab' | 'Computer Lab' | 'Auditorium' | 'Gymnasium' | 'Workshop' | 'Art Studio';

export interface TimeSlot {
  dayIndex: number; // 0 = Monday, 1 = Tuesday, etc.
  periodIndex: number; // 0 = Period 1, 1 = Period 2, etc.
}

export interface PeriodConfig {
  index: number;
  name: string; // e.g. "Period 1", "Morning Session 1", "Lunch Break"
  startTime: string; // "08:00"
  endTime: string; // "08:50"
  isBreak?: boolean;
}

export interface TimeConfig {
  days: string[]; // ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  periods: PeriodConfig[];
}

export interface Room {
  id: string;
  name: string; // e.g. "Room 101", "Lab A"
  building?: string;
  type: RoomType;
  capacity: number;
  availableDays?: number[]; // indices of days available
}

export interface Teacher {
  id: string;
  name: string;
  email?: string;
  color?: string; // hex color code for visual identification
  qualifiedSubjectIds: string[]; // Subject/Course IDs this teacher can teach
  maxHoursPerWeek: number;
  maxHoursPerDay: number;
  unavailableSlots: TimeSlot[]; // Slots when teacher is busy/off
}

export interface StudentGroup {
  id: string;
  name: string; // e.g. "Grade 10-A", "CS Year 1"
  size: number;
  homeRoomId?: string; // preferred default classroom
  color?: string;
}

export interface Course {
  id: string;
  code: string; // e.g. "MATH101"
  name: string; // e.g. "Algebra & Trigonometry"
  groupId: string; // Which student group attends this course
  teacherId?: string; // Assigned primary teacher ID (optional, or engine can assign)
  weeklyHours: number; // Number of periods per week needed
  maxConsecutiveHours: number; // Default 1 or 2
  requiredRoomType: RoomType;
  minRoomCapacity?: number;
  color?: string;
  preferredPeriodTypes?: 'morning' | 'afternoon' | 'any';
  studentNames?: string; // e.g. "张三" for 1-on-1, "张三, 李四" for 1-on-2
  teachingMode?: 'group' | 'one_on_one' | 'one_on_two' | 'one_on_n'; // 授课排课模式: 团课, 1v1, 1v2, 1vN
}

export interface SlotAssignment {
  id: string;
  courseId: string;
  teacherId: string;
  roomId: string;
  groupId: string;
  dayIndex: number;
  periodIndex: number;
  specificDate?: string; // Specific date YYYY-MM-DD
  isLocked?: boolean; // User manual pin
  studentNames?: string; // Student name(s) for 1-on-1 or 1-on-2 tutoring slots
  teachingMode?: 'group' | 'one_on_one' | 'one_on_two' | 'one_on_n'; // 授课排课模式
}

export interface ScheduleConflict {
  id: string;
  type: 'teacher_double_booked' | 'room_double_booked' | 'group_double_booked' | 'teacher_unavailable' | 'room_type_mismatch' | 'room_capacity_exceeded' | 'teacher_overload_day' | 'teacher_overload_week';
  severity: 'hard' | 'soft';
  title: string;
  description: string;
  affectedAssignmentIds: string[];
  involvedAssignmentIds?: string[];
  dayIndex?: number;
  periodIndex?: number;
  fixSuggestion?: string;
}

export interface BottleneckDiagnostic {
  courseId: string;
  courseName: string;
  unscheduledPeriods: number;
  totalPeriods: number;
  reason: string;
  suggestion: string;
  category: 'room_shortage' | 'teacher_unavailable' | 'group_clash' | 'capacity_insufficient';
}

export interface SchedulerMetrics {
  totalRequiredPeriods: number;
  scheduledPeriods: number;
  completionRate: number; // percentage 0-100
  hardConflictsCount: number;
  softConflictsCount: number;
  roomUtilizationRate: number; // percentage 0-100
  teacherBalanceScore: number; // percentage 0-100
  executionTimeMs: number;
  bottlenecks?: BottleneckDiagnostic[];
}

export interface ScheduleResult {
  assignments: SlotAssignment[];
  conflicts: ScheduleConflict[];
  metrics: SchedulerMetrics;
}

export interface ScheduleVersion {
  id: string;
  name: string; // e.g. "2026春季开学课表"
  semester: string; // e.g. "2026春季学期"
  createdAt: string;
  assignments: SlotAssignment[];
}

export interface ClassHourAccount {
  id: string;
  studentName: string; // e.g. "张伟" or "高一(1)班"
  groupId?: string; // Optional link to StudentGroup
  courseId: string; // Associated Course ID
  totalHours: number; // e.g. 40 节
  singleLessonDurationMinutes: number; // e.g. 120 (2小时) or 45
  consumedHours: number; // e.g. 8
  remainingHours: number; // totalHours - consumedHours
  status: 'active' | 'expiring_soon' | 'exhausted';
  enrollmentDate?: string;
  note?: string;
}

export interface ClassDeductionLog {
  id: string;
  accountId: string;
  studentName: string;
  courseName: string;
  deductedHours: number; // e.g. 1
  singleLessonDurationMinutes: number; // e.g. 120
  attendedAt: string; // e.g. "2026-08-01 10:00"
  teacherName?: string;
  assignmentId?: string;
  note?: string;
}

export interface ScheduleDataset {
  id: string;
  name: string;
  description: string;
  semester?: string;
  versions?: ScheduleVersion[];
  timeConfig: TimeConfig;
  rooms: Room[];
  teachers: Teacher[];
  groups: StudentGroup[];
  courses: Course[];
  assignments: SlotAssignment[];
  classHourAccounts?: ClassHourAccount[];
  deductionLogs?: ClassDeductionLog[];
}
