import { ScheduleDataset, TimeConfig } from '../types';

export const DAYS_MON_TO_SUN = [
  '星期一',
  '星期二',
  '星期三',
  '星期四',
  '星期五',
  '星期六',
  '星期日',
];

// 1. 班课预置时间表规则
export const PRESET_TIME_CONFIG_GROUP: TimeConfig = {
  days: [...DAYS_MON_TO_SUN],
  periods: [
    { index: 0, name: '第一节', startTime: '08:30', endTime: '10:10' },
    { index: 1, name: '第二节', startTime: '10:20', endTime: '12:00' },
    { index: 2, name: '午休午餐', startTime: '12:00', endTime: '14:30', isBreak: true },
    { index: 3, name: '第三节', startTime: '14:30', endTime: '16:10' },
    { index: 4, name: '课间休息', startTime: '16:10', endTime: '16:20', isBreak: true },
    { index: 5, name: '第四节', startTime: '16:20', endTime: '18:00' },
    { index: 6, name: '晚饭休息', startTime: '18:00', endTime: '19:00', isBreak: true },
    { index: 7, name: '第五节', startTime: '19:00', endTime: '20:40' },
  ],
};

// 2. 一对一/一对二（整点方案: 14-16点 / 16-18点）
export const PRESET_TIME_CONFIG_VIP_INTEGER: TimeConfig = {
  days: [...DAYS_MON_TO_SUN],
  periods: [
    { index: 0, name: '第一节', startTime: '08:00', endTime: '10:00' },
    { index: 1, name: '第二节', startTime: '10:00', endTime: '12:00' },
    { index: 2, name: '午休午餐', startTime: '12:00', endTime: '14:00', isBreak: true },
    { index: 3, name: '第三节', startTime: '14:00', endTime: '16:00' },
    { index: 4, name: '第四节', startTime: '16:00', endTime: '18:00' },
  ],
};

// 3. 一对一/一对二（半点方案: 14:30-16:30 / 16:30-18:30）
export const PRESET_TIME_CONFIG_VIP_HALF: TimeConfig = {
  days: [...DAYS_MON_TO_SUN],
  periods: [
    { index: 0, name: '第一节', startTime: '08:00', endTime: '10:00' },
    { index: 1, name: '第二节', startTime: '10:00', endTime: '12:00' },
    { index: 2, name: '午休午餐', startTime: '12:00', endTime: '14:30', isBreak: true },
    { index: 3, name: '第三节', startTime: '14:30', endTime: '16:30' },
    { index: 4, name: '第四节', startTime: '16:30', endTime: '18:30' },
  ],
};

export const EMPTY_CUSTOM_PRESET: ScheduleDataset = {
  id: 'custom-edu-org',
  name: '新知学堂教务方案',
  description: '新知学堂自定义教务配置。包含周一至周日班课与一对一/一对二标准时段规则。',
  timeConfig: PRESET_TIME_CONFIG_GROUP,
  rooms: [],
  teachers: [],
  groups: [],
  courses: [],
  assignments: [],
};

export const SAMPLE_INSTITUTION_DATASET: ScheduleDataset = {
  id: 'sample-xinzhi-org',
  name: '新知学堂 (标准示例方案)',
  description: '包含常用的教职工、核心教室、标准班级及课程范例，方便快速测试与排课验证。',
  timeConfig: PRESET_TIME_CONFIG_GROUP,
  rooms: [
    { id: 'r_301', name: '301多媒体教室', building: '主教学楼', type: 'General', capacity: 45 },
    { id: 'r_302', name: '302多媒体教室', building: '主教学楼', type: 'General', capacity: 45 },
    { id: 'r_lab1', name: '理化生实验室', building: '实验楼', type: 'Science Lab', capacity: 36 },
    { id: 'r_comp1', name: '全景微机室', building: '科技楼', type: 'Computer Lab', capacity: 50 },
  ],
  teachers: [
    { id: 't_zhang', name: '张伟 (数学领航)', email: 'zhang@xinzhi.edu', color: '#2563eb', qualifiedSubjectIds: [], maxHoursPerWeek: 20, maxHoursPerDay: 5, unavailableSlots: [] },
    { id: 't_li', name: '李娜 (英语名师)', email: 'li@xinzhi.edu', color: '#059669', qualifiedSubjectIds: [], maxHoursPerWeek: 20, maxHoursPerDay: 5, unavailableSlots: [] },
    { id: 't_wang', name: '王强 (高级物理)', email: 'wang@xinzhi.edu', color: '#7c3aed', qualifiedSubjectIds: [], maxHoursPerWeek: 18, maxHoursPerDay: 4, unavailableSlots: [] },
    { id: 't_zhao', name: '赵敏 (化学精讲)', email: 'zhao@xinzhi.edu', color: '#d97706', qualifiedSubjectIds: [], maxHoursPerWeek: 18, maxHoursPerDay: 4, unavailableSlots: [] },
  ],
  groups: [
    { id: 'g_g1_1', name: '高一(1)班', size: 40 },
    { id: 'g_g1_2', name: '高一(2)班', size: 42 },
    { id: 'g_g2_1', name: '高二精英班', size: 35 },
  ],
  courses: [
    { id: 'c_math_1', code: 'MATH-101', name: '高一高等数学', groupId: 'g_g1_1', teacherId: 't_zhang', weeklyHours: 4, maxConsecutiveHours: 2, requiredRoomType: 'General', color: '#2563eb' },
    { id: 'c_eng_1', code: 'ENG-101', name: '高一通用英语', groupId: 'g_g1_1', teacherId: 't_li', weeklyHours: 3, maxConsecutiveHours: 1, requiredRoomType: 'General', color: '#059669' },
    { id: 'c_phy_1', code: 'PHY-101', name: '物理探索实践', groupId: 'g_g1_1', teacherId: 't_wang', weeklyHours: 3, maxConsecutiveHours: 2, requiredRoomType: 'Science Lab', color: '#7c3aed' },
    { id: 'c_math_2', code: 'MATH-102', name: '高一数学进阶', groupId: 'g_g1_2', teacherId: 't_zhang', weeklyHours: 4, maxConsecutiveHours: 2, requiredRoomType: 'General', color: '#2563eb' },
    { id: 'c_chem_2', code: 'CHEM-201', name: '高二有机化学', groupId: 'g_g2_1', teacherId: 't_zhao', weeklyHours: 3, maxConsecutiveHours: 2, requiredRoomType: 'Science Lab', color: '#d97706' },
  ],
  assignments: [],
};

export const ALL_PRESETS = [EMPTY_CUSTOM_PRESET, SAMPLE_INSTITUTION_DATASET];

