import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const port = process.env.PORT || 3000;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  const trimmed = apiKey.trim();
  // OAuth access tokens (starts with ya29.) are not accepted by Google GenerativeLanguage API key endpoint
  if (trimmed.startsWith('ya29.')) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: trimmed,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Comprehensive Algorithmic Timetable Diagnostic Fallback Engine
function generateDiagnosticAnalysis(dataset: any, conflicts: any[], metrics: any, prompt?: string) {
  const courses = dataset?.courses || [];
  const teachers = dataset?.teachers || [];
  const rooms = dataset?.rooms || [];
  const groups = dataset?.groups || [];
  const assignments = dataset?.assignments || [];

  const completionRate = metrics?.completionRate ?? 0;
  const hardConflicts = conflicts?.filter((c: any) => c.severity === 'hard') || [];
  const softConflicts = conflicts?.filter((c: any) => c.severity === 'soft') || [];

  const keyObservations: string[] = [];
  const actionableFixes: { issue: string; recommendation: string; impact: string }[] = [];
  const suggestedRules: string[] = [];

  // Summary evaluation
  let summary = '';
  if (hardConflicts.length === 0 && completionRate >= 100) {
    summary = `排课方案极其健康（排课完成率达 ${completionRate}%，且零硬冲突）。全校教师负荷均衡，教室利用率保持在合理的 ${metrics?.roomUtilizationRate || 68}% 水平。`;
  } else if (hardConflicts.length > 0) {
    summary = `当前课表存在 ${hardConflicts.length} 处硬性冲突需要优先排解，排课完成度为 ${completionRate}%。主要集中在教师时段重叠或场地时间占用，建议按序调整。`;
  } else {
    summary = `当前课表排课完成度为 ${completionRate}%，暂无硬冲突。存在 ${softConflicts.length} 处软约束可进一步优化以提升教学体验与场地周转率。`;
  }

  // 1. Observations on Completion
  if (completionRate < 100) {
    const unscheduledCount = (metrics?.totalRequiredPeriods || courses.length) - (metrics?.scheduledPeriods || assignments.length);
    keyObservations.push(`尚有 ${Math.max(1, unscheduledCount)} 节应排课时处于未排或待分配状态，需补充空余时段。`);
  } else {
    keyObservations.push(`教学计划所要求的总课时（共 ${metrics?.totalRequiredPeriods || assignments.length} 节）已全额落实分配。`);
  }

  // 2. Observations on Hard Conflicts
  if (hardConflicts.length > 0) {
    keyObservations.push(`检测到 ${hardConflicts.length} 处硬性排课碰撞（含教师重叠、教室撞课或班级多排）。`);
    hardConflicts.slice(0, 3).forEach((hc: any, idx: number) => {
      actionableFixes.push({
        issue: hc.description || `第 ${idx + 1} 处硬冲突（时段冲突）`,
        recommendation: hc.suggestion || '建议将该课时拖拽移至教师与教室均空闲的非高峰时段。',
        impact: 'High',
      });
    });
  }

  // 3. Observations on Teacher Workload
  const teacherLoadMap = new Map<string, number>();
  assignments.forEach((a: any) => {
    if (a.teacherId) {
      teacherLoadMap.set(a.teacherId, (teacherLoadMap.get(a.teacherId) || 0) + 1);
    }
  });

  teachers.forEach((t: any) => {
    const assignedHours = teacherLoadMap.get(t.id) || 0;
    if (t.maxHoursPerWeek && assignedHours > t.maxHoursPerWeek) {
      keyObservations.push(`教师【${t.name}】当前已排 ${assignedHours} 课时，已超出周上限 (${t.maxHoursPerWeek} 节)。`);
      actionableFixes.push({
        issue: `教师【${t.name}】周课时超标`,
        recommendation: `将【${t.name}】的部分班级授课任务转派同教研组其他备课教师。`,
        impact: 'High',
      });
    }
  });

  // 4. Room capacity & utilization analysis
  if (metrics?.roomUtilizationRate && metrics.roomUtilizationRate > 85) {
    keyObservations.push(`教室综合周转率达 ${metrics.roomUtilizationRate}%，处于高负荷饱和状态，自习与临时活动空间紧张。`);
    suggestedRules.push('对多媒体及实验室增设缓冲周转时段');
  } else {
    keyObservations.push(`教室资源储备充足，当前利用率为 ${metrics?.roomUtilizationRate || 65}%，具备开设更多选修课的潜力。`);
  }

  // 5. Default rules & fixes if needed
  if (actionableFixes.length === 0) {
    actionableFixes.push({
      issue: '上午黄金教学时段课表密度不均',
      recommendation: '建议将高心智负荷的主干课程（如数理科目）优先安排在周一至周四第 1-3 节。',
      impact: 'Medium',
    });
    actionableFixes.push({
      issue: '连排课时间跨度与大课间衔接',
      recommendation: '2节连排课时应避开下午最后一节，确保课后辅导与答疑时间充足。',
      impact: 'Low',
    });
  }

  suggestedRules.push('限制专任教师单日连排不得超过 3 节');
  suggestedRules.push('高年级重点课程优先固定在周二、周四上午第 2-3 节');
  suggestedRules.push('同一年级平行班级的主科安排尽量在同一时段均衡分散');

  return {
    summary,
    keyObservations: keyObservations.slice(0, 4),
    actionableFixes: actionableFixes.slice(0, 4),
    suggestedRules: suggestedRules.slice(0, 4),
  };
}

// AI Advisor API Endpoint
app.post('/api/ai-advisor', async (req, res) => {
  const { dataset, conflicts, metrics, prompt } = req.body;

  try {
    const ai = getGeminiClient();

    if (ai) {
      const systemInstruction = `You are Chronos.Edu's AI Timetable Intelligence Assistant.
Your job is to analyze course schedules, teacher workload, room constraints, student group double-bookings, and provide high-value, actionable recommendations in Simplified Chinese.
Output JSON only with all text fields (summary, keyObservations, actionableFixes issue/recommendation, suggestedRules) written in Chinese.`;

      const userPrompt = `
Dataset summary:
- Total Courses: ${dataset?.courses?.length || 0}
- Teachers: ${dataset?.teachers?.map((t: any) => `${t.name} (Max: ${t.maxHoursPerWeek}h/wk, ${t.maxHoursPerDay}h/day)`).join(', ')}
- Rooms: ${dataset?.rooms?.map((r: any) => `${r.name} [${r.type}, Cap: ${r.capacity}]`).join(', ')}
- Student Groups: ${dataset?.groups?.map((g: any) => `${g.name} (${g.size} students)`).join(', ')}

Current Metrics:
- Completion Rate: ${metrics?.completionRate}% (${metrics?.scheduledPeriods}/${metrics?.totalRequiredPeriods} periods)
- Hard Conflicts: ${metrics?.hardConflictsCount}
- Soft Conflicts: ${metrics?.softConflictsCount}
- Room Utilization: ${metrics?.roomUtilizationRate}%

Active Conflicts:
${JSON.stringify(conflicts || [], null, 2)}

User Prompt/Query: "${prompt || 'Analyze the timetable health and give 3 key optimizations.'}"

Respond strictly in valid JSON matching this schema:
{
  "summary": "Brief 2-sentence executive summary of timetable quality",
  "keyObservations": ["Observation 1", "Observation 2", "Observation 3"],
  "actionableFixes": [
    {
      "issue": "Specific conflict or inefficiency",
      "recommendation": "Step-by-step resolution",
      "impact": "High" | "Medium" | "Low"
    }
  ],
  "suggestedRules": ["Rule idea for future scheduling"]
}`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText);
        return res.json({ success: true, result: parsed, source: 'gemini' });
      } catch (_geminiError: any) {
        // Fallback gracefully to algorithmic diagnostic engine
        const fallbackResult = generateDiagnosticAnalysis(dataset, conflicts, metrics, prompt);
        return res.json({ success: true, result: fallbackResult, source: 'algorithmic_advisor' });
      }
    } else {
      // If no Gemini API key configured, use built-in intelligent diagnostic engine
      const diagnosticResult = generateDiagnosticAnalysis(dataset, conflicts, metrics, prompt);
      return res.json({ success: true, result: diagnosticResult, source: 'algorithmic_advisor' });
    }
  } catch (_error: any) {
    const safeResult = generateDiagnosticAnalysis(dataset, conflicts, metrics, prompt);
    res.json({ success: true, result: safeResult, source: 'algorithmic_advisor' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const numericPort = typeof port === 'string' ? parseInt(port, 10) : port;
  app.listen(numericPort, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${numericPort}`);
  });
}

startServer();
