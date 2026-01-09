/**
 * Operator Dashboard
 * MTI 운영자용 간소화된 대시보드
 *
 * 기능:
 * - 발송 상태 표시
 * - 시작/중지/즉시실행 버튼
 * - 이번달 발송 현황
 * - 실패 목록 및 재발송
 */
import React, { useState, useEffect, useCallback } from 'react';
import { automationApi } from '../../api/automation';
import { reportApi } from '../../api/report';
import { workerApi } from '../../api/worker';

interface AutomationInfo {
  autoId: number;
  autoName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'RUNNING';
  scheduleType: string;
  scheduleTime: string;
  lastRunAt?: string;
  nextRunAt?: string;
}

interface Statistics {
  total: number;
  success: number;
  failed: number;
  pending: number;
}

interface FailedItem {
  logId: number;
  email: string;
  merchantName: string;
  errorMessage: string;
  failedAt: string;
}

const OperatorDashboard: React.FC = () => {
  const [automation, setAutomation] = useState<AutomationInfo | null>(null);
  const [stats, setStats] = useState<Statistics>({ total: 0, success: 0, failed: 0, pending: 0 });
  const [failedItems, setFailedItems] = useState<FailedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<'healthy' | 'unhealthy'>('unhealthy');

  const fetchData = useCallback(async () => {
    try {
      // Fetch automation info
      const autoRes = await automationApi.getAll();
      if (autoRes.success && autoRes.data?.[0]) {
        const auto = autoRes.data[0];
        setAutomation({
          autoId: auto.autoId,
          autoName: auto.autoName,
          status: auto.status,
          scheduleType: 'MONTHLY',
          scheduleTime: '매월 1일 09:00',
          lastRunAt: auto.lastRunAt,
          nextRunAt: auto.nextRunAt,
        });
      }

      // Fetch statistics
      const statsRes = await reportApi.getSummary();
      if (statsRes.success && statsRes.data) {
        const totalSent = statsRes.data.totalSent || 0;
        const successCount = statsRes.data.successCount || 0;
        const failCount = statsRes.data.failCount || 0;
        setStats({
          total: totalSent,
          success: successCount,
          failed: failCount,
          pending: Math.max(0, totalSent - successCount - failCount),
        });
      }

      // Check worker status
      try {
        const healthRes = await workerApi.checkHealth();
        const status = healthRes.data?.status;
        setWorkerStatus(healthRes.success && (status === 'healthy' || status === 'ok') ? 'healthy' : 'unhealthy');
      } catch {
        setWorkerStatus('unhealthy');
      }

      // Fetch failed items (from worker API)
      try {
        const failedRes = await workerApi.getFailedJobs(automation?.autoId);
        if (failedRes.success && failedRes.data) {
          setFailedItems(failedRes.data.map((job) => ({
            logId: parseInt(job.id),
            email: job.data.recipient,
            merchantName: job.data.subject,
            errorMessage: job.failedReason,
            failedAt: new Date(job.timestamp).toISOString(),
          })));
        }
      } catch {
        setFailedItems([]);
      }

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [automation?.autoId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStart = async () => {
    if (!automation) return;
    setActionLoading(true);
    try {
      await automationApi.update(automation.autoId, { status: 'ACTIVE' });
      setAutomation(prev => prev ? { ...prev, status: 'ACTIVE' } : null);
      alert('자동 발송이 활성화되었습니다.');
    } catch {
      alert('활성화에 실패했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!automation) return;
    setActionLoading(true);
    try {
      await automationApi.update(automation.autoId, { status: 'INACTIVE' });
      setAutomation(prev => prev ? { ...prev, status: 'INACTIVE' } : null);
      alert('자동 발송이 일시정지되었습니다.');
    } catch {
      alert('일시정지에 실패했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunNow = async () => {
    if (!automation) return;
    if (!confirm('지금 즉시 이메일 발송을 시작하시겠습니까?')) return;

    setActionLoading(true);
    try {
      await automationApi.run(automation.autoId);
      alert('발송이 시작되었습니다. 잠시 후 결과를 확인하세요.');
      setTimeout(fetchData, 3000);
    } catch {
      alert('발송 시작에 실패했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryFailed = async (jobId: string) => {
    if (!confirm('이 건을 재발송하시겠습니까?')) return;
    try {
      await workerApi.retryFailedJob(jobId);
      alert('재발송이 요청되었습니다.');
      fetchData();
    } catch {
      alert('재발송 요청에 실패했습니다.');
    }
  };

  const handleRetryAll = async () => {
    if (!confirm(`실패한 ${failedItems.length}건 전체를 재발송하시겠습니까?`)) return;
    try {
      await workerApi.retryAllFailed(automation?.autoId);
      alert('전체 재발송이 요청되었습니다.');
      fetchData();
    } catch {
      alert('재발송 요청에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        로딩 중...
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100';
      case 'RUNNING': return 'bg-blue-100';
      default: return 'bg-yellow-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '자동 발송 활성화';
      case 'RUNNING': return '발송 진행 중...';
      default: return '일시정지';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '🟢';
      case 'RUNNING': return '🔄';
      default: return '⏸️';
    }
  };

  const progressPercent = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">
          📧 {automation?.autoName || '이메일 자동 발송 시스템'}
        </h1>
        <span className={`px-4 py-2 rounded-full text-sm ${workerStatus === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {workerStatus === 'healthy' ? '🟢 시스템 정상' : '🔴 시스템 점검 필요'}
        </span>
      </div>

      {/* Status Card */}
      <div className={`flex items-center gap-5 p-6 rounded-2xl mb-6 ${getStatusColor(automation?.status || 'INACTIVE')}`}>
        <div className="text-5xl">
          {getStatusIcon(automation?.status || 'INACTIVE')}
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-600">현재 상태</div>
          <div className="text-2xl font-semibold">
            {getStatusText(automation?.status || 'INACTIVE')}
          </div>
        </div>
        <div className="text-right text-gray-600">
          <div>📅 {automation?.scheduleTime}</div>
          {automation?.lastRunAt && (
            <div className="text-xs mt-1">
              마지막 실행: {new Date(automation.lastRunAt).toLocaleString('ko-KR')}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        {automation?.status === 'ACTIVE' ? (
          <button
            onClick={handlePause}
            disabled={actionLoading}
            className="flex-1 py-5 text-lg font-semibold rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-800 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            ⏸️ 일시정지
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={actionLoading}
            className="flex-1 py-5 text-lg font-semibold rounded-xl bg-gradient-to-r from-green-500 to-teal-500 text-white hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            ▶️ 활성화
          </button>
        )}
        <button
          onClick={handleRunNow}
          disabled={actionLoading}
          className="flex-1 py-5 text-lg font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          🚀 즉시 실행
        </button>
      </div>

      {/* Statistics */}
      <div className="bg-white rounded-2xl p-6 shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-5">📊 이번달 발송 현황</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-xl border-l-4 border-gray-500">
            <div className="text-3xl font-bold">{stats.total.toLocaleString()}</div>
            <div className="text-sm text-gray-600 mt-1">전체 대상</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl border-l-4 border-green-500">
            <div className="text-3xl font-bold">{stats.success.toLocaleString()}</div>
            <div className="text-sm text-gray-600 mt-1">✅ 성공</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl border-l-4 border-red-500">
            <div className="text-3xl font-bold">{stats.failed.toLocaleString()}</div>
            <div className="text-sm text-gray-600 mt-1">❌ 실패</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-xl border-l-4 border-yellow-500">
            <div className="text-3xl font-bold">{stats.pending.toLocaleString()}</div>
            <div className="text-sm text-gray-600 mt-1">⏳ 대기</div>
          </div>
        </div>

        {stats.total > 0 && (
          <div className="mt-5">
            <div className="h-6 bg-gray-200 rounded-full overflow-hidden relative">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-teal-500"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="absolute top-0 h-full bg-red-500"
                style={{ left: `${progressPercent}%`, width: `${(stats.failed / stats.total) * 100}%` }}
              />
            </div>
            <div className="text-center mt-2 text-gray-600">
              {progressPercent.toFixed(1)}% 완료
            </div>
          </div>
        )}
      </div>

      {/* Failed Items */}
      {failedItems.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-md mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-red-600">
              ❌ 발송 실패 목록 ({failedItems.length}건)
            </h2>
            <button
              onClick={handleRetryAll}
              className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600"
            >
              🔄 전체 재발송
            </button>
          </div>
          <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
            {failedItems.map((item) => (
              <div
                key={item.logId}
                className="flex justify-between items-center p-4 bg-red-50 rounded-lg border-l-4 border-red-500"
              >
                <div className="flex-1">
                  <div className="font-semibold">{item.email}</div>
                  <div className="text-sm text-gray-600">{item.merchantName}</div>
                  <div className="text-xs text-red-600 mt-1">{item.errorMessage}</div>
                </div>
                <button
                  onClick={() => handleRetryFailed(item.logId.toString())}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  재발송
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-gray-500 text-sm">
        💡 화면은 30초마다 자동 새로고침됩니다
      </div>
    </div>
  );
};

export default OperatorDashboard;
