import * as XLSX from 'xlsx';
import { Course, ScheduleDataset, SlotAssignment } from '../types';

export interface ExportOptions {
  format: 'excel' | 'csv' | 'pdf';
  scope: 'master' | 'by_group' | 'by_teacher' | 'details';
  selectedEntityId?: string; // Specific group or teacher if filtered, or 'all'
  versionName?: string;
}

// Helper to format slot contents matching the 2D Timetable Grid layout (as shown in standard schedule UI)
function formatSlotCell(
  assignment: SlotAssignment | undefined,
  courseObjMap: Map<string, Course>,
  teacherMap: Map<string, string>,
  roomMap: Map<string, string>,
  groupMap: Map<string, string>,
  context: 'group' | 'teacher' | 'master'
): string {
  if (!assignment) return '—';

  const course = courseObjMap.get(assignment.courseId);
  const courseName = course?.name || assignment.courseId;
  const courseCode = course?.code || '';
  const teacherName = teacherMap.get(assignment.teacherId) || assignment.teacherId || '';
  const roomName = roomMap.get(assignment.roomId) || assignment.roomId || '未指定教室';
  const groupName = groupMap.get(assignment.groupId) || assignment.groupId || '';
  const studentNames = assignment.studentNames || course?.studentNames || '';

  const parts: string[] = [];

  // Line 1: Course Code / Catalog No. (e.g. C-344)
  if (courseCode) {
    parts.push(courseCode);
  }

  // Line 2: [Group Name] Course Name (e.g. [高一] 数学)
  parts.push(groupName ? `[${groupName}] ${courseName}` : courseName);

  // Line 3: Student name for 1v1 / 1v2 (e.g. 学员: 张三、李四)
  if (studentNames) {
    parts.push(`学员: ${studentNames}`);
  }

  // Line 4: Teacher Name & Room (e.g. 张老师 101)
  if (context === 'teacher') {
    parts.push(roomName);
  } else {
    parts.push(`${teacherName}   ${roomName}`.trim());
  }

  return parts.join('\n');
}

export function exportTimetable(dataset: ScheduleDataset, assignments: SlotAssignment[], options: ExportOptions) {
  const { format, scope, selectedEntityId = 'all', versionName = '当前课表' } = options;

  if (format === 'pdf') {
    generatePDFExport(dataset, assignments, scope, selectedEntityId, versionName);
    return;
  }

  const days = dataset.timeConfig?.days || ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  const periods = dataset.timeConfig?.periods || [];

  const courseObjMap = new Map<string, Course>(dataset.courses.map((c) => [c.id, c]));
  const courseMap = new Map(dataset.courses.map((c) => [c.id, c.name]));
  const teacherMap = new Map(dataset.teachers.map((t) => [t.id, t.name]));
  const roomMap = new Map(dataset.rooms.map((r) => [r.id, r.name]));
  const groupMap = new Map(dataset.groups.map((g) => [g.id, g.name]));

  const sanitizeFilename = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const baseFilename = `${sanitizeFilename(dataset.semester || '课表')}_${sanitizeFilename(versionName)}_${dateStr}`;

  if (format === 'excel') {
    const wb = XLSX.utils.book_new();

    if (scope === 'details') {
      const rows: string[][] = [
        ['学期', '班级', '学员/学生姓名', '星期', '节次', '时间段', '课程代码', '课程名称', '授课教师', '上课教室', '状态'],
      ];

      assignments.forEach((a) => {
        const p = periods[a.periodIndex];
        const course = courseObjMap.get(a.courseId);
        const sName = a.studentNames || course?.studentNames || '—';
        rows.push([
          dataset.semester || '2026年春季学期',
          groupMap.get(a.groupId) || a.groupId,
          sName,
          days[a.dayIndex] || `第${a.dayIndex + 1}天`,
          p?.name || `第${a.periodIndex + 1}节`,
          p ? `${p.startTime}-${p.endTime}` : '',
          course?.code || '',
          courseMap.get(a.courseId) || a.courseId,
          teacherMap.get(a.teacherId) || a.teacherId,
          roomMap.get(a.roomId) || a.roomId,
          a.isLocked ? '已锁定(固定)' : '正常排课',
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, '课表明细清单');
    } else if (scope === 'master') {
      // 1. Sheet 1: 全校班级课表网格 (Stacked 2D grid for all classes matching requested design)
      const masterGridRows: string[][] = [];
      const rowHeights: { hpt: number }[] = [];

      dataset.groups.forEach((group, idx) => {
        if (idx > 0) {
          masterGridRows.push([]); // Empty spacer row between classes
          rowHeights.push({ hpt: 15 });
        }

        // Class Banner Title
        masterGridRows.push([`【${group.name}】 一周课程表 (${dataset.semester || '2026春季学期'})`]);
        rowHeights.push({ hpt: 28 });

        // Table Column Headers: 节次 / 时间 | 星期一 | 星期二 | ...
        masterGridRows.push(['节次 / 时间', ...days]);
        rowHeights.push({ hpt: 22 });

        // Period rows
        periods.forEach((p, pIdx) => {
          if (p.isBreak) {
            masterGridRows.push([`— ${p.name} (${p.startTime}-${p.endTime}) —`, ...days.map(() => '— 午休 / 休息 —')]);
            rowHeights.push({ hpt: 22 });
            return;
          }

          const periodHeader = `${p.name}\n${p.startTime}-${p.endTime}`;
          const row: string[] = [periodHeader];

          days.forEach((_, dIdx) => {
            const match = assignments.find((a) => a.groupId === group.id && a.dayIndex === dIdx && a.periodIndex === pIdx);
            row.push(formatSlotCell(match, courseObjMap, teacherMap, roomMap, groupMap, 'master'));
          });

          masterGridRows.push(row);
          rowHeights.push({ hpt: 54 }); // Generous height for multiline card (Code, Subject, Teacher/Room)
        });
      });

      const wsMasterGrid = XLSX.utils.aoa_to_sheet(masterGridRows);
      wsMasterGrid['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
      wsMasterGrid['!rows'] = rowHeights;
      XLSX.utils.book_append_sheet(wb, wsMasterGrid, '全校班级课表网格');

      // 2. Sheet 2: 全校班级平铺总矩阵 (Class vs Period Matrix)
      const headerRow = ['班级', ...days.flatMap((day) => periods.filter((p) => !p.isBreak).map((p) => `${day} ${p.name}`))];
      const matrixRows: string[][] = [headerRow];

      dataset.groups.forEach((g) => {
        const row = [g.name];
        days.forEach((_, dIdx) => {
          periods.forEach((p, pIdx) => {
            if (p.isBreak) return;
            const match = assignments.find((a) => a.groupId === g.id && a.dayIndex === dIdx && a.periodIndex === pIdx);
            if (match) {
              const cName = courseMap.get(match.courseId) || match.courseId;
              const tName = teacherMap.get(match.teacherId) || match.teacherId;
              const rName = roomMap.get(match.roomId) || match.roomId;
              row.push(`${cName} (${tName}@${rName})`);
            } else {
              row.push('—');
            }
          });
        });
        matrixRows.push(row);
      });

      const wsMatrix = XLSX.utils.aoa_to_sheet(matrixRows);
      wsMatrix['!cols'] = [{ wch: 16 }, ...days.flatMap(() => periods.filter((p) => !p.isBreak).map(() => ({ wch: 20 })))];
      XLSX.utils.book_append_sheet(wb, wsMatrix, '全校班级总矩阵');

      // 3. Sheet 3: 全校排课明细表
      const detailRows: string[][] = [
        ['学期', '班级', '学员/学生姓名', '星期', '节次', '时间段', '课程代码', '课程名称', '授课教师', '上课教室', '状态'],
      ];
      assignments.forEach((a) => {
        const p = periods[a.periodIndex];
        const course = courseObjMap.get(a.courseId);
        const sName = a.studentNames || course?.studentNames || '—';
        detailRows.push([
          dataset.semester || '2026年春季学期',
          groupMap.get(a.groupId) || a.groupId,
          sName,
          days[a.dayIndex] || `第${a.dayIndex + 1}天`,
          p?.name || `第${a.periodIndex + 1}节`,
          p ? `${p.startTime}-${p.endTime}` : '',
          course?.code || '',
          courseMap.get(a.courseId) || a.courseId,
          teacherMap.get(a.teacherId) || a.teacherId,
          roomMap.get(a.roomId) || a.roomId,
          a.isLocked ? '已锁定' : '正常',
        ]);
      });
      const wsDetails = XLSX.utils.aoa_to_sheet(detailRows);
      wsDetails['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsDetails, '全校排课明细');

    } else if (scope === 'by_group') {
      const targetGroups = selectedEntityId && selectedEntityId !== 'all'
        ? dataset.groups.filter((g) => g.id === selectedEntityId)
        : dataset.groups;

      targetGroups.forEach((group) => {
        const gridRows: string[][] = [
          [`【${group.name}】 一周课程表 (${dataset.semester || '2026春季学期'})`],
          ['节次 / 时间', ...days],
        ];

        const rowHeights: { hpt: number }[] = [{ hpt: 28 }, { hpt: 22 }];

        periods.forEach((p, pIdx) => {
          if (p.isBreak) {
            gridRows.push([`— ${p.name} (${p.startTime}-${p.endTime}) —`, ...days.map(() => '— 午休 / 休息 —')]);
            rowHeights.push({ hpt: 22 });
            return;
          }

          const periodHeader = `${p.name}\n${p.startTime}-${p.endTime}`;
          const row: string[] = [periodHeader];

          days.forEach((_, dIdx) => {
            const match = assignments.find((a) => a.groupId === group.id && a.dayIndex === dIdx && a.periodIndex === pIdx);
            row.push(formatSlotCell(match, courseObjMap, teacherMap, roomMap, groupMap, 'group'));
          });

          gridRows.push(row);
          rowHeights.push({ hpt: 54 });
        });

        const ws = XLSX.utils.aoa_to_sheet(gridRows);
        ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
        ws['!rows'] = rowHeights;
        const sheetName = sanitizeFilename(group.name).slice(0, 30);
        XLSX.utils.book_append_sheet(wb, ws, sheetName || '班级课表');
      });
    } else if (scope === 'by_teacher') {
      const targetTeachers = selectedEntityId && selectedEntityId !== 'all'
        ? dataset.teachers.filter((t) => t.id === selectedEntityId)
        : dataset.teachers;

      targetTeachers.forEach((teacher) => {
        const gridRows: string[][] = [
          [`【${teacher.name} 老师】 个人一周授课课表 (${dataset.semester || '2026春季学期'})`],
          ['节次 / 时间', ...days],
        ];

        const rowHeights: { hpt: number }[] = [{ hpt: 28 }, { hpt: 22 }];

        periods.forEach((p, pIdx) => {
          if (p.isBreak) {
            gridRows.push([`— ${p.name} —`, ...days.map(() => '— 休息 —')]);
            rowHeights.push({ hpt: 22 });
            return;
          }

          const periodHeader = `${p.name}\n${p.startTime}-${p.endTime}`;
          const row: string[] = [periodHeader];

          days.forEach((_, dIdx) => {
            const match = assignments.find((a) => a.teacherId === teacher.id && a.dayIndex === dIdx && a.periodIndex === pIdx);
            row.push(formatSlotCell(match, courseObjMap, teacherMap, roomMap, groupMap, 'teacher'));
          });

          gridRows.push(row);
          rowHeights.push({ hpt: 54 });
        });

        const ws = XLSX.utils.aoa_to_sheet(gridRows);
        ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
        ws['!rows'] = rowHeights;
        const sheetName = sanitizeFilename(teacher.name).slice(0, 30);
        XLSX.utils.book_append_sheet(wb, ws, sheetName || '教师课表');
      });
    }

    // XLSX.writeFile standard SheetJS method for browser Excel downloads
    XLSX.writeFile(wb, `${baseFilename}.xlsx`);
  } else {
    // CSV Export with UTF-8 BOM
    let csvContent = '';

    if (scope === 'details') {
      const headers = ['学期', '班级', '星期', '节次', '时间段', '课程代码', '课程名称', '授课教师', '上课教室', '状态'];
      const rows = assignments.map((a) => {
        const p = periods[a.periodIndex];
        const course = courseObjMap.get(a.courseId);
        return [
          dataset.semester || '2026年春季学期',
          groupMap.get(a.groupId) || a.groupId,
          days[a.dayIndex] || `第${a.dayIndex + 1}天`,
          p?.name || `第${a.periodIndex + 1}节`,
          p ? `${p.startTime}-${p.endTime}` : '',
          course?.code || '',
          courseMap.get(a.courseId) || a.courseId,
          teacherMap.get(a.teacherId) || a.teacherId,
          roomMap.get(a.roomId) || a.roomId,
          a.isLocked ? '已锁定' : '正常',
        ];
      });

      csvContent = [headers, ...rows]
        .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
    } else if (scope === 'master') {
      const headers = ['班级', ...days.flatMap((day) => periods.filter((p) => !p.isBreak).map((p) => `${day}_${p.name}`))];
      const rows = dataset.groups.map((g) => {
        const row = [g.name];
        days.forEach((_, dIdx) => {
          periods.forEach((p, pIdx) => {
            if (p.isBreak) return;
            const match = assignments.find((a) => a.groupId === g.id && a.dayIndex === dIdx && a.periodIndex === pIdx);
            if (match) {
              const cName = courseMap.get(match.courseId) || '';
              const tName = teacherMap.get(match.teacherId) || '';
              const rName = roomMap.get(match.roomId) || '';
              row.push(`${cName}(${tName}@${rName})`);
            } else {
              row.push('—');
            }
          });
        });
        return row;
      });

      csvContent = [headers, ...rows]
        .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
    } else if (scope === 'by_group') {
      const targetGroups = selectedEntityId && selectedEntityId !== 'all'
        ? dataset.groups.filter((g) => g.id === selectedEntityId)
        : dataset.groups;

      const lines: string[] = [];
      targetGroups.forEach((group) => {
        lines.push(`"=== 班级: ${group.name} (${dataset.semester || ''}) ==="`);
        lines.push(['"节次/时间"', ...days.map((d) => `"${d}"`)].join(','));

        periods.forEach((p, pIdx) => {
          if (p.isBreak) {
            lines.push([`"— ${p.name} —"`, ...days.map(() => '"—"')].join(','));
            return;
          }
          const row = [`"${p.name} (${p.startTime}-${p.endTime})"`];
          days.forEach((_, dIdx) => {
            const match = assignments.find((a) => a.groupId === group.id && a.dayIndex === dIdx && a.periodIndex === pIdx);
            if (match) {
              const text = formatSlotCell(match, courseObjMap, teacherMap, roomMap, groupMap, 'group').replace(/\n/g, ' / ');
              row.push(`"${text}"`);
            } else {
              row.push('"—"');
            }
          });
          lines.push(row.join(','));
        });
        lines.push('');
      });

      csvContent = lines.join('\r\n');
    } else {
      const targetTeachers = selectedEntityId && selectedEntityId !== 'all'
        ? dataset.teachers.filter((t) => t.id === selectedEntityId)
        : dataset.teachers;

      const lines: string[] = [];
      targetTeachers.forEach((teacher) => {
        lines.push(`"=== 教师: ${teacher.name} 授课表 ==="`);
        lines.push(['"节次/时间"', ...days.map((d) => `"${d}"`)].join(','));

        periods.forEach((p, pIdx) => {
          if (p.isBreak) {
            lines.push([`"— ${p.name} —"`, ...days.map(() => '"—"')].join(','));
            return;
          }
          const row = [`"${p.name} (${p.startTime}-${p.endTime})"`];
          days.forEach((_, dIdx) => {
            const match = assignments.find((a) => a.teacherId === teacher.id && a.dayIndex === dIdx && a.periodIndex === pIdx);
            if (match) {
              const text = formatSlotCell(match, courseObjMap, teacherMap, roomMap, groupMap, 'teacher').replace(/\n/g, ' / ');
              row.push(`"${text}"`);
            } else {
              row.push('"—"');
            }
          });
          lines.push(row.join(','));
        });
        lines.push('');
      });

      csvContent = lines.join('\r\n');
    }

    // Explicit UTF-8 BOM byte sequence
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseFilename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

function generatePDFExport(
  dataset: ScheduleDataset,
  assignments: SlotAssignment[],
  scope: string,
  selectedEntityId: string,
  versionName: string
) {
  const days = dataset.timeConfig?.days || ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  const periods = dataset.timeConfig?.periods || [];

  const courseObjMap = new Map<string, Course>(dataset.courses.map((c) => [c.id, c]));
  const courseMap = new Map(dataset.courses.map((c) => [c.id, c.name]));
  const teacherMap = new Map(dataset.teachers.map((t) => [t.id, t.name]));
  const roomMap = new Map(dataset.rooms.map((r) => [r.id, r.name]));
  const groupMap = new Map(dataset.groups.map((g) => [g.id, g.name]));

  let htmlBody = '';

  if (scope === 'by_group') {
    const targetGroups = selectedEntityId && selectedEntityId !== 'all'
      ? dataset.groups.filter((g) => g.id === selectedEntityId)
      : dataset.groups;

    htmlBody = targetGroups
      .map((group) => {
        const rowsHtml = periods
          .map((p, pIdx) => {
            if (p.isBreak) {
              return `<tr class="break-row"><td class="p-name">${p.name} (${p.startTime}-${p.endTime})</td><td colspan="${days.length}" class="break-cell">休息 / 午休</td></tr>`;
            }
            const cells = days
              .map((_, dIdx) => {
                const match = assignments.find((a) => a.groupId === group.id && a.dayIndex === dIdx && a.periodIndex === pIdx);
                if (match) {
                  const course = courseObjMap.get(match.courseId);
                  const cCode = course?.code || '';
                  const cName = courseMap.get(match.courseId) || '';
                  const tName = teacherMap.get(match.teacherId) || '';
                  const rName = roomMap.get(match.roomId) || '';
                  const sName = match.studentNames || course?.studentNames || '';
                  return `<td class="slot-filled">
                    ${cCode ? `<div class="c-code">${cCode}</div>` : ''}
                    <div class="c-title">[${group.name}] ${cName}</div>
                    ${sName ? `<div class="c-student" style="font-size:9px;color:#92400e;background:#fef3c7;padding:1px 3px;margin:2px 0;font-weight:bold;">学员: ${sName}</div>` : ''}
                    <div class="c-meta">${tName}&nbsp;&nbsp;${rName}</div>
                  </td>`;
                }
                return `<td class="slot-empty">—</td>`;
              })
              .join('');
            return `<tr><td class="p-name">${p.name}<br/><span class="p-time">${p.startTime}-${p.endTime}</span></td>${cells}</tr>`;
          })
          .join('');

        return `
        <div class="page-break">
          <div class="table-header">
            <h2>【${group.name}】 一周课程表</h2>
            <div class="sub">${dataset.semester || '2026春季学期'} · 版本: ${versionName}</div>
          </div>
          <table class="timetable">
            <thead>
              <tr><th>节次 / 时间</th>${days.map((d) => `<th>${d}</th>`).join('')}</tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
      })
      .join('<div class="hr-divider"></div>');
  } else if (scope === 'by_teacher') {
    const targetTeachers = selectedEntityId && selectedEntityId !== 'all'
      ? dataset.teachers.filter((t) => t.id === selectedEntityId)
      : dataset.teachers;

    htmlBody = targetTeachers
      .map((teacher) => {
        const rowsHtml = periods
          .map((p, pIdx) => {
            if (p.isBreak) {
              return `<tr class="break-row"><td class="p-name">${p.name}</td><td colspan="${days.length}" class="break-cell">休息</td></tr>`;
            }
            const cells = days
              .map((_, dIdx) => {
                const match = assignments.find((a) => a.teacherId === teacher.id && a.dayIndex === dIdx && a.periodIndex === pIdx);
                if (match) {
                  const course = courseObjMap.get(match.courseId);
                  const cCode = course?.code || '';
                  const cName = courseMap.get(match.courseId) || '';
                  const gName = groupMap.get(match.groupId) || '';
                  const rName = roomMap.get(match.roomId) || '';
                  const sName = match.studentNames || course?.studentNames || '';
                  return `<td class="slot-filled">
                    ${cCode ? `<div class="c-code">${cCode}</div>` : ''}
                    <div class="c-title">[${gName}] ${cName}</div>
                    ${sName ? `<div class="c-student" style="font-size:9px;color:#92400e;background:#fef3c7;padding:1px 3px;margin:2px 0;font-weight:bold;">学员: ${sName}</div>` : ''}
                    <div class="c-meta">${rName}</div>
                  </td>`;
                }
                return `<td class="slot-empty">—</td>`;
              })
              .join('');
            return `<tr><td class="p-name">${p.name}<br/><span class="p-time">${p.startTime}-${p.endTime}</span></td>${cells}</tr>`;
          })
          .join('');

        return `
        <div class="page-break">
          <div class="table-header">
            <h2>【${teacher.name} 老师】 个人授课表</h2>
            <div class="sub">${dataset.semester || '2026春季学期'} · 版本: ${versionName}</div>
          </div>
          <table class="timetable">
            <thead>
              <tr><th>节次 / 时间</th>${days.map((d) => `<th>${d}</th>`).join('')}</tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
      })
      .join('<div class="hr-divider"></div>');
  } else {
    // Master tables
    const detailRows = assignments
      .map((a) => {
        const p = periods[a.periodIndex];
        const course = courseObjMap.get(a.courseId);
        const sName = a.studentNames || course?.studentNames || '—';
        return `<tr>
        <td>${dataset.semester || '2026春'}</td>
        <td><b>${groupMap.get(a.groupId) || a.groupId}</b></td>
        <td><b>${sName}</b></td>
        <td>${days[a.dayIndex] || ''}</td>
        <td>${p?.name || ''} (${p?.startTime || ''}-${p?.endTime || ''})</td>
        <td><code>${course?.code || ''}</code></td>
        <td class="c-title">${courseMap.get(a.courseId) || a.courseId}</td>
        <td>${teacherMap.get(a.teacherId) || a.teacherId}</td>
        <td>${roomMap.get(a.roomId) || a.roomId}</td>
      </tr>`;
      })
      .join('');

    htmlBody = `
    <div class="page-break">
      <div class="table-header">
        <h2>新知学堂 · 全校排课总清单</h2>
        <div class="sub">${dataset.semester || '2026春季学期'} · 共 ${assignments.length} 节排课 · 版本: ${versionName}</div>
      </div>
      <table class="timetable">
        <thead>
          <tr><th>学期</th><th>班级</th><th>学员姓名</th><th>星期</th><th>节次/时间</th><th>课程代码</th><th>课程名称</th><th>授课教师</th><th>上课教室</th></tr>
        </thead>
        <tbody>${detailRows}</tbody>
      </table>
    </div>`;
  }

  const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>新知 THE WISSEN - 课表PDF导出与打印</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; color: #1a1a1a; margin: 0; padding: 20px; background: #fff; }
    .brand-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 20px; }
    .brand-title { font-size: 18px; font-weight: bold; font-family: Georgia, serif; }
    .table-header { margin-bottom: 12px; }
    .table-header h2 { font-size: 16px; margin: 0 0 4px 0; font-weight: bold; color: #8C2318; }
    .table-header .sub { font-size: 11px; color: #666; }
    table.timetable { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
    table.timetable th, table.timetable td { border: 1px solid #1a1a1a; padding: 6px 8px; font-size: 11px; text-align: center; vertical-align: middle; word-wrap: break-word; }
    table.timetable th { background-color: #f4f2f0; font-weight: bold; font-size: 11px; }
    .p-name { font-weight: bold; background: #fafafa; }
    .p-time { font-size: 9px; color: #666; font-weight: normal; }
    .break-row { background: #f9f9f9; }
    .break-cell { font-style: italic; color: #888; letter-spacing: 2px; }
    .slot-filled { background: #f0f7ff; text-align: left; padding: 6px; }
    .c-code { font-size: 9px; font-family: monospace; color: #555; font-weight: bold; }
    .c-title { font-weight: bold; color: #1e40af; font-size: 11px; margin-top: 1px; }
    .c-meta { font-size: 9.5px; color: #4b5563; margin-top: 3px; display: flex; justify-content: space-between; }
    .slot-empty { color: #ccc; }
    .hr-divider { page-break-after: always; height: 1px; margin: 20px 0; }
    .page-break { page-break-inside: avoid; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="brand-top">
    <div class="brand-title">新知 THE WISSEN · 智能教务课表</div>
    <div style="font-size: 11px; color: #666;">打印时间: ${new Date().toLocaleString('zh-CN')}</div>
  </div>
  ${htmlBody}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printHtml);
    printWindow.document.close();
  } else {
    // Fallback if window.open blocked by iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.write(printHtml);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  }
}
