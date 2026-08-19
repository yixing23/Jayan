import React, { useState } from 'react';
import { ScheduleConflict, ScheduleDataset, SchedulerMetrics } from '../types';

interface AiAdvisorProps {
  dataset: ScheduleDataset;
  conflicts: ScheduleConflict[];
  metrics: SchedulerMetrics;
}

interface AiResult {
  summary?: string;
  keyObservations?: string[];
  actionableFixes?: { issue: string; recommendation: string; impact: string }[];
  suggestedRules?: string[];
}

export const AiAdvisor: React.FC<AiAdvisorProps> = ({ dataset, conflicts, metrics }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const quickPrompts = [
    '分析总体课表健康度与教师课表负荷分布。',
    '检查教室容量瓶颈并提供改进建议。',
    '识别时间重叠与双重预订风险并提出规避规则。',
    '汇总课表排课效率供学校管理层决策。',
  ];

  const handleRunAiAdvisor = async (customPrompt?: string) => {
    const query = customPrompt || prompt || '分析总体课表健康度与教师课表负荷分布。';
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset,
          conflicts,
          metrics,
          prompt: query,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setAiResult(data.result);
      } else {
        setErrorMessage(data.error || '无法获取 AI 顾问建议');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || '无法连接课表智能顾问服务，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6 border-b border-[#1A1A1A] pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
            基于 Gemini AI 智能计算
          </span>
          <h2 className="text-3xl font-serif italic font-bold text-[#1A1A1A]">
            课表 AI 智能顾问
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1.5">
          <span className="material-symbols-outlined text-base">auto_awesome</span>
          Gemini 3.7 智能推理已激活
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Control Column */}
        <div className="lg:col-span-1 border border-[#1A1A1A] p-6 bg-[#FDFCFB] flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-serif italic font-bold text-[#1A1A1A] mb-2">
                咨询 AI 课表顾问
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                向 Gemini 提问，评估课表健康度、解决排课瓶颈或生成分析报告。
              </p>

              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="请输入您的自定义分析需求（例如：“如何减少周五下午教师的连排疲劳？”）..."
                className="w-full p-3 bg-[#F4F2F0] border border-[#1A1A1A] text-xs font-serif focus:outline-none focus:bg-white resize-none"
              />
            </div>

            {/* Quick Suggestions */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block mb-2">
                快捷分析指令
              </span>
              <div className="space-y-2">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPrompt(qp);
                      handleRunAiAdvisor(qp);
                    }}
                    className="w-full text-left text-xs p-2.5 bg-[#F4F2F0] hover:bg-[#1A1A1A] hover:text-white transition-colors border border-[#1A1A1A] font-serif italic cursor-pointer flex items-center justify-between"
                  >
                    <span>“{qp}”</span>
                    <span className="material-symbols-outlined text-sm opacity-60">arrow_forward</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleRunAiAdvisor()}
            disabled={isLoading}
            className="w-full py-3.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-[0.2em] transition-colors cursor-pointer mt-6 flex items-center justify-center gap-2 border border-[#1A1A1A] disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base ${isLoading ? 'animate-spin' : ''}`}>
              {isLoading ? 'autorenew' : 'psychology'}
            </span>
            {isLoading ? '正在分析课表...' : '生成课表诊断分析'}
          </button>
        </div>

        {/* Right Output Column */}
        <div className="lg:col-span-2 border border-[#1A1A1A] bg-[#FDFCFB] p-6 flex flex-col justify-between min-h-[500px]">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <span className="material-symbols-outlined text-5xl text-[#1A1A1A] animate-spin mb-4">
                hourglass_top
              </span>
              <h4 className="text-xl font-serif italic font-bold">正在计算与分析课表复杂度</h4>
              <p className="text-xs font-mono text-neutral-500 mt-2">
                正在运行约束逻辑与优化算法向量...
              </p>
            </div>
          ) : errorMessage ? (
            <div className="p-6 bg-red-50 border border-red-300 text-red-950">
              <h4 className="font-bold text-sm mb-1">AI 顾问提示</h4>
              <p className="text-xs">{errorMessage}</p>
            </div>
          ) : aiResult ? (
            <div className="space-y-6">
              {/* Executive Summary */}
              {aiResult.summary && (
                <div className="p-4 bg-[#F4F2F0] border-l-4 border-[#1A1A1A]">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-neutral-500 block mb-1">
                    概要总结
                  </span>
                  <p className="text-sm font-serif italic text-[#1A1A1A] leading-relaxed">
                    "{aiResult.summary}"
                  </p>
                </div>
              )}

              {/* Key Observations */}
              {aiResult.keyObservations && aiResult.keyObservations.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-bold tracking-widest border-b border-[#1A1A1A] pb-2 mb-3">
                    核心发现
                  </h4>
                  <ul className="space-y-2">
                    {aiResult.keyObservations.map((obs, idx) => (
                      <li key={idx} className="text-xs text-neutral-800 flex items-start gap-2">
                        <span className="material-symbols-outlined text-sm text-[#1A1A1A] mt-0.5">
                          fiber_manual_record
                        </span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actionable Recommendations */}
              {aiResult.actionableFixes && aiResult.actionableFixes.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-bold tracking-widest border-b border-[#1A1A1A] pb-2 mb-3">
                    可操作的调课建议
                  </h4>
                  <div className="space-y-3">
                    {aiResult.actionableFixes.map((fix, idx) => (
                      <div key={idx} className="p-3 border border-[#1A1A1A] bg-[#FDFCFB]">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-serif italic font-bold text-sm text-[#1A1A1A]">
                            {fix.issue}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase border ${
                              fix.impact === 'High' || fix.impact === '高'
                                ? 'bg-red-100 text-red-900 border-red-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {fix.impact === 'High' ? '高影响' : fix.impact === 'Low' ? '低影响' : fix.impact}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-700 leading-relaxed font-mono">
                          解决方案：{fix.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Rules */}
              {aiResult.suggestedRules && aiResult.suggestedRules.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-bold tracking-widest border-b border-[#1A1A1A] pb-2 mb-3">
                    未来排课规则建议
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.suggestedRules.map((rule, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-[#F4F2F0] border border-[#1A1A1A] text-xs font-serif italic text-[#1A1A1A]"
                      >
                        + {rule}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-neutral-400">
              <span className="material-symbols-outlined text-5xl mb-3">auto_awesome</span>
              <h4 className="text-xl font-serif italic font-bold text-[#1A1A1A]">
                AI 智能顾问已就绪
              </h4>
              <p className="text-xs max-w-md mt-2">
                点击“生成课表诊断分析”或选择左侧的快捷指令，开启由 Gemini 驱动的自动审计。
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-[#1A1A1A] flex justify-between items-center text-[10px] font-mono opacity-50">
            <span>新知学堂 AI 排课引擎</span>
            <span>Server Proxy Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};
