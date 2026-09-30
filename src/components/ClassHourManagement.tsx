import React, { useState, useEffect } from 'react';
import { ClassDeductionLog, ClassHourAccount, ScheduleDataset, Teacher } from '../types';

interface ClassHourManagementProps {
  dataset: ScheduleDataset;
  onUpdateDataset: (updated: ScheduleDataset) => void;
}

export const ClassHourManagement: React.FC<ClassHourManagementProps> = ({ dataset, onUpdateDataset }) => {
  const accounts: ClassHourAccount[] = dataset.classHourAccounts || [
    {
      id: 'cha_1',
      studentName: '张伟 (高一1班)',
      groupId: dataset.groups[0]?.id,
      courseId: dataset.courses[0]?.id || 'c_1',
      totalHours: 40,
      singleLessonDurationMinutes: 120, // 2小时
      consumedHours: 12,
      remainingHours: 28,
      status: 'active',
      enrollmentDate: '2026-03-01',
      note: '签约合同编号: EDU-2026-001',
    },
    {
      id: 'cha_2',
      studentName: '李思涵 (高一2班)',
      groupId: dataset.groups[1]?.id,
      courseId: dataset.courses[1]?.id || 'c_2',
      totalHours: 20,
      singleLessonDurationMinutes: 90, // 1.5小时
      consumedHours: 17,
      remainingHours: 3,
      status: 'expiring_soon',
      enrollmentDate: '2026-03-10',
      note: '课时不足，需提醒家长续费',
    },
    {
      id: 'cha_3',
      studentName: '王浩宇 (高一3班)',
      groupId: dataset.groups[2]?.id,
      courseId: dataset.courses[0]?.id || 'c_1',
      totalHours: 30,
      singleLessonDurationMinutes: 45, // 45分钟
      consumedHours: 30,
      remainingHours: 0,
      status: 'exhausted',
      enrollmentDate: '2026-02-15',
      note: '课程已全部履约完成',
    },
  ];

  const deductionLogs: ClassDeductionLog[] = dataset.deductionLogs || [
    {
      id: 'log_1',
      accountId: 'cha_1',
      studentName: '张伟 (高一1班)',
      courseName: dataset.courses.find((c) => c.id === accounts[0]?.courseId)?.name || '高等数学',
      deductedHours: 1,
      singleLessonDurationMinutes: 120,
      attendedAt: '2026-07-31 10:00',
      teacherName: dataset.teachers[0]?.name || '王老师',
      note: '按计划完成第12节考勤打卡',
    },
    {
      id: 'log_2',
      accountId: 'cha_2',
      studentName: '李思涵 (高一2班)',
      courseName: dataset.courses.find((c) => c.id === accounts[1]?.courseId)?.name || '英语听力',
      deductedHours: 1,
      singleLessonDurationMinutes: 90,
      attendedAt: '2026-07-30 14:00',
      teacherName: dataset.teachers[1]?.name || '李老师',
      note: '单节1.5小时完成，扣减1课时',
    },
  ];

  // Helper function to calculate account status
  const calcStatus = (remaining: number): 'active' | 'expiring_soon' | 'exhausted' => {
    if (remaining <= 0) return 'exhausted';
    if (remaining <= 5) return 'expiring_soon';
    return 'active';
  };

  // Helper: map teacher subjects
  const getTeacherSubjectLabel = (t: Teacher): string => {
    const qualifiedCourses = dataset.courses.filter(c => (t.qualifiedSubjectIds || []).includes(c.id));
    if (qualifiedCourses.length > 0) {
      return qualifiedCourses.map(c => c.name.replace(/\[.*?\]\s*/g, '')).slice(0, 2).join('、');
    }
    return '主教专任';
  };

  // UI state
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'checkin' | 'logs'>('accounts');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal States
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<ClassHourAccount> | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<ClassHourAccount | null>(null);
  const [undoingLog, setUndoingLog] = useState<ClassDeductionLog | null>(null);
  const [showRenewalModal, setShowRenewalModal] = useState<ClassHourAccount | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Quick Check-in State with robust initialization
  const initialAccountId = accounts[0]?.id || '';
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId);
  const [checkinHours, setCheckinHours] = useState<number>(1);
  const [checkinNote, setCheckinNote] = useState<string>('正常上课，自动消课');
  const [checkinTeacher, setCheckinTeacher] = useState<string>(() => {
    const acc = accounts[0];
    if (acc) {
      const course = dataset.courses.find(c => c.id === acc.courseId);
      const teacher = dataset.teachers.find(t => t.id === course?.teacherId);
      if (teacher) return teacher.name;
    }
    return dataset.teachers[0]?.name || '任课教师';
  });

  // Automatically update teacher when selected account changes
  useEffect(() => {
    const target = accounts.find(a => a.id === selectedAccountId);
    if (target) {
      const course = dataset.courses.find(c => c.id === target.courseId);
      if (course) {
        const teacher = dataset.teachers.find(t => t.id === course.teacherId) ||
          dataset.teachers.find(t => (t.qualifiedSubjectIds || []).includes(course.id));
        if (teacher) {
          setCheckinTeacher(teacher.name);
        }
      }
    }
  }, [selectedAccountId, accounts, dataset.courses, dataset.teachers]);

  // Recharge Modal State
  const [rechargeAccountId, setRechargeAccountId] = useState<string | null>(null);
  const [rechargeAddHours, setRechargeAddHours] = useState<number>(10);

  // Helper maps
  const courseMap = new Map<string, string>(dataset.courses.map((c) => [c.id, c.name]));

  // Stats calculation
  const totalEnrolledHours = accounts.reduce((sum, a) => sum + a.totalHours, 0);
  const totalConsumedHours = accounts.reduce((sum, a) => sum + a.consumedHours, 0);
  const totalRemainingHours = accounts.reduce((sum, a) => sum + a.remainingHours, 0);
  const expiringCount = accounts.filter((a) => a.status === 'expiring_soon' || a.status === 'exhausted').length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Save changes back to dataset
  const saveState = (updatedAccounts: ClassHourAccount[], updatedLogs: ClassDeductionLog[]) => {
    onUpdateDataset({
      ...dataset,
      classHourAccounts: updatedAccounts,
      deductionLogs: updatedLogs,
    });
  };

  // Handle Account Create/Update
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount?.studentName || !editingAccount?.courseId) {
      showToast('请填写学员姓名和对应课程！');
      return;
    }

    const total = Number(editingAccount.totalHours) || 0;
    const consumed = Number(editingAccount.consumedHours) || 0;
    const remaining = Math.max(0, total - consumed);
    const duration = Number(editingAccount.singleLessonDurationMinutes) || 120;

    let updated: ClassHourAccount[];
    if (editingAccount.id) {
      updated = accounts.map((a) =>
        a.id === editingAccount.id
          ? {
              ...(a as ClassHourAccount),
              studentName: editingAccount.studentName!,
              courseId: editingAccount.courseId!,
              totalHours: total,
              singleLessonDurationMinutes: duration,
              consumedHours: consumed,
              remainingHours: remaining,
              status: calcStatus(remaining),
              note: editingAccount.note || '',
            }
          : a
      );
      showToast(`已更新学员【${editingAccount.studentName}】的课时信息`);
    } else {
      const newAcc: ClassHourAccount = {
        id: `cha_${Date.now()}`,
        studentName: editingAccount.studentName,
        courseId: editingAccount.courseId,
        totalHours: total,
        singleLessonDurationMinutes: duration,
        consumedHours: consumed,
        remainingHours: remaining,
        status: calcStatus(remaining),
        enrollmentDate: new Date().toISOString().slice(0, 10),
        note: editingAccount.note || '',
      };
      updated = [newAcc, ...accounts];
      showToast(`已成功录入学员【${editingAccount.studentName}】新课时包`);
    }

    saveState(updated, deductionLogs);
    setShowAccountModal(false);
    setEditingAccount(null);
  };

  // Confirm Delete Account
  const confirmDeleteAccount = (acc: ClassHourAccount) => {
    const updatedAccounts = accounts.filter((a) => a.id !== acc.id);
    const updatedLogs = deductionLogs.filter((l) => l.accountId !== acc.id);
    saveState(updatedAccounts, updatedLogs);
    showToast(`已成功删除学员【${acc.studentName}】的课时账户。`);
    setDeletingAccount(null);
  };

  // Core Deduction Execution
  const performDeduction = (accountId: string, deductAmount: number, teacherName?: string, noteText?: string) => {
    const targetAccount = accounts.find((a) => a.id === accountId);
    if (!targetAccount) {
      showToast('未找到对应消课账户，请先选择有效学员');
      return;
    }

    const newConsumed = targetAccount.consumedHours + deductAmount;
    const newRemaining = Math.max(0, targetAccount.totalHours - newConsumed);

    const updatedAccounts = accounts.map((a) =>
      a.id === accountId
        ? {
            ...a,
            consumedHours: newConsumed,
            remainingHours: newRemaining,
            status: calcStatus(newRemaining),
          }
        : a
    );

    const nowStr = new Date().toLocaleString('zh-CN', { hour12: false });
    const courseName = courseMap.get(targetAccount.courseId) || '综合课程';

    const newLog: ClassDeductionLog = {
      id: `log_${Date.now()}`,
      accountId,
      studentName: targetAccount.studentName,
      courseName,
      deductedHours: deductAmount,
      singleLessonDurationMinutes: targetAccount.singleLessonDurationMinutes,
      attendedAt: nowStr,
      teacherName: teacherName || dataset.teachers[0]?.name || '授课教师',
      note: noteText || `上课考勤打卡，自动扣减 ${deductAmount} 课时`,
    };

    saveState(updatedAccounts, [newLog, ...deductionLogs]);
    showToast(`消课成功！学员【${targetAccount.studentName}】已扣减 ${deductAmount} 课时，剩余 ${newRemaining} 节。`);
  };

  // Confirm Undo Deduction
  const confirmUndoDeduction = (targetLog: ClassDeductionLog) => {
    const updatedAccounts = accounts.map((a) => {
      if (a.id === targetLog.accountId) {
        const newConsumed = Math.max(0, a.consumedHours - targetLog.deductedHours);
        const newRemaining = a.totalHours - newConsumed;
        return {
          ...a,
          consumedHours: newConsumed,
          remainingHours: newRemaining,
          status: calcStatus(newRemaining),
        };
      }
      return a;
    });

    const updatedLogs = deductionLogs.filter((l) => l.id !== targetLog.id);
    saveState(updatedAccounts, updatedLogs);
    showToast(`已成功撤销该笔考勤，归还 ${targetLog.deductedHours} 课时至学员【${targetLog.studentName}】。`);
    setUndoingLog(null);
  };

  // Handle Recharge (续费加课)
  const handleExecuteRecharge = () => {
    if (!rechargeAccountId || rechargeAddHours <= 0) return;
    const targetAccount = accounts.find((a) => a.id === rechargeAccountId);
    if (!targetAccount) return;

    const newTotal = targetAccount.totalHours + rechargeAddHours;
    const newRemaining = newTotal - targetAccount.consumedHours;

    const updatedAccounts = accounts.map((a) =>
      a.id === rechargeAccountId
        ? {
            ...a,
            totalHours: newTotal,
            remainingHours: newRemaining,
            status: calcStatus(newRemaining),
            note: `${a.note ? a.note + ' | ' : ''}续费+${rechargeAddHours}节 (${new Date().toISOString().slice(0, 10)})`,
          }
        : a
    );

    saveState(updatedAccounts, deductionLogs);
    setRechargeAccountId(null);
    showToast(`续费成功！学员【${targetAccount.studentName}】新增 ${rechargeAddHours} 节课时，现有总课时 ${newTotal} 节。`);
  };

  // Generate WeChat Notification Text
  const getNotificationText = (acc: ClassHourAccount) => {
    const courseName = courseMap.get(acc.courseId) || '授课项目';
    const course = dataset.courses.find(c => c.id === acc.courseId);
    const teacher = dataset.teachers.find(t => t.id === course?.teacherId);
    const teacherName = teacher?.name || '任课老师';

    return `【新知学堂】尊敬的${acc.studentName}家长您好：
截至今日，${acc.studentName}在《${courseName}》课程中剩余课时仅剩 ${acc.remainingHours} 节（已完成 ${acc.consumedHours}/${acc.totalHours} 节）。
为保证后续教学进度的连贯性与上课时段的优先锁定，建议您近期联系教务老师办理课时续费。
如有疑问请随时联系任课教师【${teacherName}】或教务处。祝孩子学业进步！`;
  };

  const handleCopyNotification = (acc: ClassHourAccount) => {
    const text = getNotificationText(acc);
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
    showToast('催费提醒文案已成功复制到剪贴板！');
  };

  // Export Expiring CSV
  const handleExportExpiringCSV = () => {
    const expiringList = accounts.filter(a => a.remainingHours <= 5);
    if (expiringList.length === 0) {
      showToast('当前暂无课时不足（≤5节）的预警学员。');
      return;
    }

    const headers = ['学员姓名', '课程名称', '总课时(节)', '已消课时(节)', '剩余课时(节)', '单节时长(分钟)', '状态', '备注'];
    const rows = expiringList.map(a => [
      `"${a.studentName}"`,
      `"${courseMap.get(a.courseId) || '课程'}"`,
      a.totalHours,
      a.consumedHours,
      a.remainingHours,
      a.singleLessonDurationMinutes,
      a.status === 'exhausted' ? '课时已耗尽' : '课时预警',
      `"${a.note || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `新知学堂_待续费学员名单_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('已成功导出待续费学员清单 CSV！');
  };

  // Filtered Accounts
  const filteredAccounts = accounts.filter((a) => {
    const matchesSearch =
      a.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (courseMap.get(a.courseId) || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'warning'
        ? a.status === 'expiring_soon' || a.status === 'exhausted'
        : a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#1A1A1A] text-white px-4 py-2.5 text-xs font-mono font-bold shadow-xl border border-amber-400 flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-amber-400 text-sm">notifications</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-end border-b border-[#1A1A1A] pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block mb-0.5">
            Class Hours & Deduction
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A]">课时管理与自动消课</h2>
          <p className="text-xs font-mono font-bold text-neutral-500 mt-1">管理学员签约课时账户，记录上课考勤并自动扣减余量。</p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExpiringCSV}
            className="px-4 py-2 bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2"
          >
            导出待续费名单 (CSV)
          </button>

          <button
            onClick={() => {
              setEditingAccount({
                studentName: '',
                courseId: dataset.courses[0]?.id || '',
                totalHours: 40,
                singleLessonDurationMinutes: 120,
                consumedHours: 0,
                note: '',
              });
              setShowAccountModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2"
          >
            设置/报课新课时
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-neutral-200 rounded-lg p-4 bg-white shadow-sm">
          <span className="text-sm font-medium text-neutral-500">
            累计签约总课时
          </span>
          <p className="text-2xl font-bold text-neutral-800 mt-2">
            {totalEnrolledHours} <span className="text-sm font-normal text-neutral-500">节</span>
          </p>
          <p className="text-xs text-neutral-400 mt-1">覆盖 {accounts.length} 个学员账户</p>
        </div>

        <div className="border border-neutral-200 rounded-lg p-4 bg-white shadow-sm">
          <span className="text-sm font-medium text-neutral-500">
            累计已消耗课时
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {totalConsumedHours} <span className="text-sm font-normal text-neutral-500">节</span>
          </p>
          <p className="text-xs text-neutral-400 mt-1">完成率 {Math.round((totalConsumedHours / (totalEnrolledHours || 1)) * 100)}%</p>
        </div>

        <div className="border border-neutral-200 rounded-lg p-4 bg-white shadow-sm">
          <span className="text-sm font-medium text-neutral-500">
            全校剩余总课时
          </span>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {totalRemainingHours} <span className="text-sm font-normal text-neutral-500">节</span>
          </p>
          <p className="text-xs text-neutral-400 mt-1">待履约课程额度</p>
        </div>

        <div className="border border-neutral-200 rounded-lg p-4 bg-white shadow-sm">
          <span className="text-sm font-medium text-neutral-500">
            课时预警/需续费
          </span>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {expiringCount} <span className="text-sm font-normal text-neutral-500">人</span>
          </p>
          <p className="text-xs text-neutral-400 mt-1">剩余 ≤ 5 节需提醒续费</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-neutral-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveSubTab('accounts')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
            activeSubTab === 'accounts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          学员课时账户大盘 ({accounts.length})
        </button>

        <button
          onClick={() => setActiveSubTab('checkin')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
            activeSubTab === 'checkin'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          一键打卡消课扣减
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
            activeSubTab === 'logs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          消课流水明细记录 ({deductionLogs.length})
        </button>
      </div>

      {/* SubTab 1: Accounts Table */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 flex-1 max-w-md relative">
              <span className="material-symbols-outlined text-neutral-400 absolute left-3">search</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索学员姓名或课程名称..."
                className="w-full bg-white border border-neutral-200 rounded-md pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-neutral-600">状态筛选:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-neutral-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
              >
                <option value="all">全部账户 ({accounts.length})</option>
                <option value="active">正常充足</option>
                <option value="expiring_soon">课时预警 (≤5节)</option>
                <option value="exhausted">课时已耗尽 (0节)</option>
                <option value="warning">所有需续费账户</option>
              </select>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="border border-neutral-200 rounded-lg overflow-x-auto bg-white shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 font-medium border-b border-neutral-200">
                  <th className="p-4">学员 / 班级名称</th>
                  <th className="p-4">报名课程</th>
                  <th className="p-4">单节课时长</th>
                  <th className="p-4">总课时</th>
                  <th className="p-4">已消课时</th>
                  <th className="p-4">剩余课时</th>
                  <th className="p-4 w-40">消耗进度</th>
                  <th className="p-4">账户状态</th>
                  <th className="p-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-neutral-500">
                      未找到符合条件的课时账户记录。
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc) => {
                    const percent = Math.min(100, Math.round((acc.consumedHours / (acc.totalHours || 1)) * 100));
                    const courseName = courseMap.get(acc.courseId) || '综合课程';
                    const durationHours = (acc.singleLessonDurationMinutes / 60).toFixed(1).replace(/\.0$/, '');
                    const isWarning = acc.remainingHours <= 5;

                    return (
                      <tr key={acc.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="p-4 text-neutral-800">
                          <div className="flex items-center gap-1.5 font-medium">
                            {isWarning && (
                              <span className="material-symbols-outlined text-amber-500 text-base" title="课时不足预警">
                                warning
                              </span>
                            )}
                            <span>{acc.studentName}</span>
                          </div>
                          {acc.note && (
                            <span className="block text-xs text-neutral-500 mt-1">
                              {acc.note}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-neutral-700">{courseName}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-md">
                            {acc.singleLessonDurationMinutes}分钟 ({durationHours}小时)
                          </span>
                        </td>
                        <td className="p-4 text-neutral-700">{acc.totalHours} 节</td>
                        <td className="p-4 text-emerald-600 font-medium">{acc.consumedHours} 节</td>
                        <td className="p-4 font-bold">
                          <span
                            className={
                              acc.remainingHours === 0
                                ? 'text-red-600'
                                : isWarning
                                ? 'text-amber-600'
                                : 'text-blue-600'
                            }
                          >
                            {acc.remainingHours} 节
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                percent >= 100
                                  ? 'bg-red-500'
                                  : percent >= 80
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs text-neutral-500 mt-1.5 block text-right">
                            已消 {percent}%
                          </span>
                        </td>
                        <td className="p-4 text-xs">
                          {acc.status === 'exhausted' ? (
                            <span className="px-2 py-1 bg-red-50 text-red-700 rounded-md">
                              已耗尽 (0节)
                            </span>
                          ) : acc.status === 'expiring_soon' ? (
                            <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md">
                              预警 (余{acc.remainingHours}节)
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md">
                              正常 (余{acc.remainingHours}节)
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2 whitespace-nowrap">
                          {/* Actions */}
                          {isWarning && (
                            <button
                              onClick={() => setShowRenewalModal(acc)}
                              className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium text-xs rounded transition-colors inline-flex items-center gap-1"
                              title="生成催费/续费通知文案"
                            >
                              <span className="material-symbols-outlined text-sm">chat</span>
                              <span>通知</span>
                            </button>
                          )}

                          <button
                            onClick={() => performDeduction(acc.id, 1)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded transition-colors"
                            title="每上完一节课，点击扣减1课时"
                          >
                            消课
                          </button>

                          <button
                            onClick={() => {
                              setRechargeAccountId(acc.id);
                              setRechargeAddHours(10);
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded transition-colors"
                          >
                            续费
                          </button>

                          <button
                            onClick={() => {
                              setEditingAccount(acc);
                              setShowAccountModal(true);
                            }}
                            className="px-2.5 py-1.5 hover:bg-neutral-100 text-neutral-600 text-xs font-medium rounded transition-colors"
                          >
                            编辑
                          </button>

                          <button
                            onClick={() => setDeletingAccount(acc)}
                            className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 text-xs font-medium rounded transition-colors"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 2: Quick Check-in & Deduction Card */}
      {activeSubTab === 'checkin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Form */}
          <div className="lg:col-span-2 border border-neutral-200 rounded-lg p-6 bg-white shadow-sm space-y-6">
            <div className="border-b border-neutral-100 pb-4">
              <h3 className="text-xl font-bold text-neutral-800">
                一键考勤打卡，自动扣减课时
              </h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  选择消课学员账户:
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  {accounts.map((acc) => {
                    const cName = courseMap.get(acc.courseId) || '';
                    return (
                      <option key={acc.id} value={acc.id}>
                        学员: {acc.studentName} | 课程: {cName} | 剩余: {acc.remainingHours} 节 ({acc.singleLessonDurationMinutes}分钟/节)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Account Selected Info Summary */}
              {(() => {
                const target = accounts.find((a) => a.id === selectedAccountId);
                if (!target) return null;
                const cName = courseMap.get(target.courseId) || '';
                const durationHours = (target.singleLessonDurationMinutes / 60).toFixed(1).replace(/\.0$/, '');

                return (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-blue-600 block mb-1">关联课程</span>
                      <span className="font-medium text-blue-900">{cName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-blue-600 block mb-1">单节时长</span>
                      <span className="font-medium text-blue-900">{target.singleLessonDurationMinutes}分钟</span>
                    </div>
                    <div>
                      <span className="text-xs text-blue-600 block mb-1">总包课时</span>
                      <span className="font-medium text-blue-900">{target.totalHours} 节</span>
                    </div>
                    <div>
                      <span className="text-xs text-blue-600 block mb-1">当前剩余</span>
                      <span className="font-bold text-blue-700">{target.remainingHours} 节</span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    本次扣减课时节数:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckinHours(1)}
                      className={`px-4 py-2 border rounded-md text-sm transition-colors ${
                        checkinHours === 1 ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      扣减 1 节
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckinHours(2)}
                      className={`px-4 py-2 border rounded-md text-sm transition-colors ${
                        checkinHours === 2 ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      连排 2 节
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={checkinHours}
                      onChange={(e) => setCheckinHours(Number(e.target.value) || 1)}
                      className="w-20 bg-white border border-neutral-300 rounded-md p-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    授课教师记录:
                  </label>
                  <select
                    value={checkinTeacher}
                    onChange={(e) => setCheckinTeacher(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  >
                    {dataset.teachers.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({getTeacherSubjectLabel(t)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  消课备注与上课内容记录:
                </label>
                <input
                  type="text"
                  value={checkinNote}
                  onChange={(e) => setCheckinNote(e.target.value)}
                  placeholder="例如：按计划完成单元重点例题讲解，学员考勤签到无误"
                  className="w-full bg-white border border-neutral-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => {
                    performDeduction(selectedAccountId || accounts[0]?.id || '', checkinHours, checkinTeacher, checkinNote);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  确定打卡上课，扣减 {checkinHours} 课时
                </button>
              </div>
            </div>
          </div>

          {/* Quick Guidance side panel */}
          <div className="border border-neutral-200 rounded-lg p-5 bg-neutral-50 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-neutral-800">
              <span className="material-symbols-outlined text-amber-500">lightbulb</span>
              <h4 className="font-bold text-base">课时扣减说明</h4>
            </div>

            <ul className="text-xs space-y-2 text-neutral-700 leading-relaxed font-serif">
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#1A1A1A]">·</span>
                <span><b>单节时长支持自定义</b>：无论是45分钟的标准课、90分钟精讲课，还是2小时（120分钟）强化课，均可灵活设置。</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#1A1A1A]">·</span>
                <span><b>教师自动智能联动</b>：选中对应学员后，系统自动根据课程计划匹配主讲教师。</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#1A1A1A]">·</span>
                <span><b>自动预警机制</b>：当学员剩余课时 ≤ 5 节时，支持一键生成个性化微信/短信催费通知文案。</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#1A1A1A]">·</span>
                <span><b>支持错消撤销</b>：若误点消课，可随时在“消课流水明细记录”中点击【撤销消课】返还课时。</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* SubTab 3: Deduction History Logs */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <div className="border border-neutral-200 rounded-lg overflow-x-auto bg-white shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 font-medium border-b border-neutral-200">
                  <th className="p-4">消课时间</th>
                  <th className="p-4">学员 / 班级</th>
                  <th className="p-4">对应课程</th>
                  <th className="p-4">单节时长</th>
                  <th className="p-4">扣减课时</th>
                  <th className="p-4">授课教师</th>
                  <th className="p-4">消课备注说明</th>
                  <th className="p-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {deductionLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-neutral-500">
                      暂无消课考勤打卡流水记录。
                    </td>
                  </tr>
                ) : (
                  deductionLogs.map((log) => {
                    const durationHours = (log.singleLessonDurationMinutes / 60).toFixed(1).replace(/\.0$/, '');
                    return (
                      <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="p-4 text-neutral-500">{log.attendedAt}</td>
                        <td className="p-4 font-medium text-neutral-800">{log.studentName}</td>
                        <td className="p-4 text-neutral-700">{log.courseName}</td>
                        <td className="p-4 text-neutral-600">
                          {log.singleLessonDurationMinutes}分钟 ({durationHours}小时)
                        </td>
                        <td className="p-4 font-medium text-red-600">-{log.deductedHours} 节</td>
                        <td className="p-4 text-neutral-700">{log.teacherName || '授课教师'}</td>
                        <td className="p-4 text-neutral-500">{log.note || '—'}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setUndoingLog(log)}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium rounded transition-colors"
                            title="撤销本次打卡，退还课时"
                          >
                            撤销消课
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Renewal Notification Modal */}
      {showRenewalModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRenewalModal(null);
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="bg-white border border-neutral-200 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-xl">mark_chat_unread</span>
                <h3 className="text-xl font-bold text-neutral-800">
                  一键生成催费通知
                </h3>
              </div>
              <button
                onClick={() => setShowRenewalModal(null)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-800 text-sm">
                <span className="font-medium">学员：{showRenewalModal.studentName}</span> | 
                <span className="ml-2">剩余课时：<b className="text-red-600">{showRenewalModal.remainingHours} 节</b> (需及时续费)</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  通知文案预览 (可直接修改或一键复制):
                </label>
                <textarea
                  readOnly
                  value={getNotificationText(showRenewalModal)}
                  rows={6}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-md p-3 text-sm text-neutral-600 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowRenewalModal(null)}
                className="px-4 py-2 border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 rounded-md transition-colors"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={() => handleCopyNotification(showRenewalModal)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">
                  {copiedNotification ? 'check' : 'content_copy'}
                </span>
                <span>{copiedNotification ? '已复制成功！' : '一键复制文案'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Modal (Create / Edit) */}
      {showAccountModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAccountModal(false);
              setEditingAccount(null);
            }
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm"
        >
          <div className="bg-white border border-neutral-200 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h3 className="text-xl font-bold text-neutral-800">
                {editingAccount?.id ? '编辑学员课时账户' : '设置新课时包'}
              </h3>
              <button
                onClick={() => {
                  setShowAccountModal(false);
                  setEditingAccount(null);
                }}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  学员或班级名称:
                </label>
                <input
                  type="text"
                  required
                  value={editingAccount?.studentName || ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, studentName: e.target.value })}
                  placeholder="例如：张伟 或 高一(1)班"
                  className="w-full bg-white border border-neutral-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  选择关联课程:
                </label>
                <select
                  value={editingAccount?.courseId || dataset.courses[0]?.id || ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, courseId: e.target.value })}
                  className="w-full bg-white border border-neutral-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  {dataset.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    总课时 (节):
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingAccount?.totalHours || 40}
                    onChange={(e) =>
                      setEditingAccount({ ...editingAccount, totalHours: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-white border border-neutral-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    单节时长 (分钟):
                  </label>
                  <input
                    type="number"
                    min={10}
                    required
                    value={editingAccount?.singleLessonDurationMinutes || 120}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        singleLessonDurationMinutes: Number(e.target.value) || 120,
                      })
                    }
                    className="w-full bg-white border border-neutral-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setEditingAccount({ ...editingAccount, singleLessonDurationMinutes: 120 })}
                      className="px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-md transition-colors"
                    >
                      2小时
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAccount({ ...editingAccount, singleLessonDurationMinutes: 90 })}
                      className="px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-md transition-colors"
                    >
                      1.5小时
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAccount({ ...editingAccount, singleLessonDurationMinutes: 45 })}
                      className="px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-md transition-colors"
                    >
                      45分钟
                    </button>
                  </div>
                </div>
              </div>

              {editingAccount?.id && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    已消课时 (节):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingAccount?.consumedHours || 0}
                    onChange={(e) =>
                      setEditingAccount({ ...editingAccount, consumedHours: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-white border border-neutral-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  备注说明 (选填):
                </label>
                <input
                  type="text"
                  value={editingAccount?.note || ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, note: e.target.value })}
                  placeholder="例如: 签约合同号、课时折扣或家长要求"
                  className="w-full bg-white border border-neutral-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountModal(false);
                    setEditingAccount(null);
                  }}
                  className="px-4 py-2 border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {rechargeAccountId && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setRechargeAccountId(null);
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="bg-white border border-neutral-200 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h3 className="text-xl font-bold text-neutral-800">
                学员课时续费
              </h3>
              <button
                onClick={() => setRechargeAccountId(null)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  新增课时 (节):
                </label>
                <div className="flex items-center gap-2">
                  {[10, 20, 40].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRechargeAddHours(num)}
                      className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                        rechargeAddHours === num ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      +{num} 节
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    value={rechargeAddHours}
                    onChange={(e) => setRechargeAddHours(Number(e.target.value) || 1)}
                    className="w-20 bg-white border border-neutral-300 rounded-md p-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 mt-6">
              <button
                type="button"
                onClick={() => setRechargeAccountId(null)}
                className="px-4 py-2 border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteRecharge}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                确定续费
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAccount && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingAccount(null);
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="bg-white border border-neutral-200 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-neutral-800">
              确认删除课时账户？
            </h3>
            <p className="text-sm text-neutral-600">
              确定要删除学员 <span className="font-semibold text-neutral-900">{deletingAccount.studentName}</span> 的课时账户吗？此操作将清理所有相关的历史消课流水。
            </p>
            <div className="flex justify-end gap-3 pt-4 mt-4">
              <button
                type="button"
                onClick={() => setDeletingAccount(null)}
                className="px-4 py-2 border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteAccount(deletingAccount)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Log Confirmation Modal */}
      {undoingLog && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setUndoingLog(null);
          }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="bg-white border border-neutral-200 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-neutral-800">
              确认撤销此笔消课？
            </h3>
            <p className="text-sm text-neutral-600">
              将撤销 <span className="font-semibold text-neutral-900">{undoingLog.studentName}</span> 于 {undoingLog.attendedAt} 扣减的 <span className="font-semibold text-red-600">{undoingLog.deductedHours} 课时</span>，并自动返还至学员账户。
            </p>
            <div className="flex justify-end gap-3 pt-4 mt-4">
              <button
                type="button"
                onClick={() => setUndoingLog(null)}
                className="px-4 py-2 border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => confirmUndoDeduction(undoingLog)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                确认撤销
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
