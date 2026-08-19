import React, { useState } from 'react';
import { ScheduleDataset } from '../types';
import { saveScheduleToCloud, loadScheduleFromCloud } from '../lib/firebase';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: ScheduleDataset;
  onDatasetLoaded: (newDataset: ScheduleDataset) => void;
  syncCode: string | null;
  onSyncCodeUpdate: (code: string) => void;
  lastSyncedAt: string | null;
  onLastSyncedUpdate: (time: string) => void;
  autoSyncEnabled?: boolean;
  onToggleAutoSync?: () => void;
  syncStatus?: 'synced' | 'syncing' | 'unsaved' | 'idle' | 'error';
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onDatasetLoaded,
  syncCode,
  onSyncCodeUpdate,
  lastSyncedAt,
  onLastSyncedUpdate,
  autoSyncEnabled = false,
  onToggleAutoSync,
  syncStatus = 'synced',
}) => {
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    setMessage({ type: 'info', text: '正在将当前排课数据上传保存至云端数据库...' });
    try {
      const result = await saveScheduleToCloud(dataset, syncCode || undefined);
      onSyncCodeUpdate(result.syncCode);
      onLastSyncedUpdate(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setMessage({ type: 'success', text: `成功保存至云端数据库！提取码为：${result.syncCode}` });
    } catch (err: any) {
      console.error('Cloud save failed:', err);
      setMessage({ type: 'error', text: '保存到云端失败，请检查网络后重试。' });
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async () => {
    if (!inputCode.trim()) {
      setMessage({ type: 'error', text: '请输入有效的6位云端提取码 (例如 XZ-8892)' });
      return;
    }
    setLoading(true);
    setMessage({ type: 'info', text: `正在搜索云端提取码 [${inputCode.trim().toUpperCase()}]...` });
    try {
      const result = await loadScheduleFromCloud(inputCode.trim());
      if (result) {
        onDatasetLoaded(result.dataset);
        onSyncCodeUpdate(inputCode.trim().toUpperCase());
        onLastSyncedUpdate(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setMessage({ type: 'success', text: `同步成功！已从云端载入 [${result.name}] 数据。` });
        setInputCode('');
      } else {
        setMessage({ type: 'error', text: '未找到对应提取码的数据，请检查提取码是否输入正确。' });
      }
    } catch (err: any) {
      console.error('Cloud load failed:', err);
      setMessage({ type: 'error', text: '从云端读取数据失败，请重试。' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (syncCode) {
      navigator.clipboard.writeText(syncCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn"
    >
      <div className="bg-[#FDFCFB] border-2 border-[#1A1A1A] w-full max-w-lg p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-700 text-2xl">cloud_sync</span>
            <h3 className="text-lg font-serif font-bold text-[#1A1A1A]">云端数据库与跨设备同步</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tip banner */}
        <div className="bg-amber-50 border border-amber-300 p-3 mb-5 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
          <span className="material-symbols-outlined text-amber-700 text-sm mt-0.5 shrink-0">info</span>
          <div>
            <strong>无需繁琐注册登录：</strong> 数据实时存储在 Google Firebase 云端高可靠数据库中。在任何新设备或新浏览器打开本系统，只需输入<strong>云端提取码</strong>，即可随时同步并继续使用！
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-3 mb-5 text-xs font-medium border flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : message.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-300'
                : 'bg-blue-50 text-blue-900 border-blue-300'
            }`}
          >
            <span className="material-symbols-outlined text-base shrink-0">
              {message.type === 'success' ? 'check_circle' : message.type === 'error' ? 'error' : 'hourglass_top'}
            </span>
            <span>{message.text}</span>
          </div>
        )}

        {/* Auto Sync Toggle Banner */}
        {onToggleAutoSync && (
          <div className="border border-[#1A1A1A] bg-amber-50/50 p-4 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-700 text-xl">sync_saved_loc</span>
              <div>
                <div className="text-xs font-bold text-[#1A1A1A]">实时自动静默云端同步 (Auto-Sync)</div>
                <div className="text-[10px] text-neutral-600">
                  开启后，任何课表改动均增加 1 秒防抖自动静默同步至 Firestore
                </div>
              </div>
            </div>
            <button
              onClick={onToggleAutoSync}
              className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                autoSyncEnabled
                  ? 'bg-emerald-700 text-white border-emerald-900 hover:bg-emerald-800'
                  : 'bg-[#1A1A1A] text-white border-[#1A1A1A] hover:bg-neutral-800'
              }`}
            >
              <span>{autoSyncEnabled ? '已开启 (点击关闭)' : '开启自动同步'}</span>
            </button>
          </div>
        )}

        {/* Current Device Sync Code Box */}
        <div className="border border-[#1A1A1A] bg-white p-4 mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center justify-between">
            <span>当前排课数据的云端提取码</span>
            {lastSyncedAt && <span className="text-[10px] text-emerald-700 font-mono">上次同步: {lastSyncedAt}</span>}
          </div>

          {syncCode ? (
            <div className="flex items-center justify-between bg-[#F4F2F0] border border-[#1A1A1A] px-4 py-3">
              <div>
                <span className="text-2xl font-mono font-extrabold text-[#1A1A1A] tracking-wider">{syncCode}</span>
                <p className="text-[10px] text-neutral-600 mt-0.5">凭此提取码可在其他设备上加载此排课数据</p>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                <span>{copied ? '已复制!' : '复制提取码'}</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-neutral-500 py-2 italic">
              当前本地数据尚未创建云端提取码。点击下方按钮即可一键备份至云端！
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full mt-3 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-bold tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 border border-amber-900 shadow-xs"
          >
            <span className="material-symbols-outlined text-base">cloud_upload</span>
            <span>{loading ? '正在同步云端...' : syncCode ? '覆盖更新云端备份' : '保存当前数据到云端 (获取提取码)'}</span>
          </button>
        </div>

        {/* Load Data From Cloud Section */}
        <div className="border border-[#1A1A1A] bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-800 mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-amber-700 text-sm">download</span>
            <span>从其他设备或云端载入数据</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="输入提取码 (例: XZ-8892)"
              className="flex-1 bg-[#F4F2F0] border border-[#1A1A1A] px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:bg-white"
            />
            <button
              onClick={handleLoad}
              disabled={loading || !inputCode.trim()}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">cloud_download</span>
              <span>提取并载入</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-[#1A1A1A] bg-white hover:bg-[#1A1A1A] hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
