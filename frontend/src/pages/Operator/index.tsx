/**
 * Operator Dashboard
 * Email automation control panel for operators
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
      const autoRes = await automationApi.getAll();
      if (autoRes.success && autoRes.data?.[0]) {
        const auto = autoRes.data[0];
        setAutomation({
          autoId: auto.autoId,
          autoName: auto.autoName,
          status: auto.status,
          scheduleType: 'MONTHLY',
          scheduleTime: 'Monthly 1st, 09:00',
          lastRunAt: auto.lastRunAt,
          nextRunAt: auto.nextRunAt,
        });
      }

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

      try {
        const healthRes = await workerApi.checkHealth();
        const status = healthRes.data?.status;
        setWorkerStatus(healthRes.success && (status === 'healthy' || status === 'ok') ? 'healthy' : 'unhealthy');
      } catch {
        setWorkerStatus('unhealthy');
      }

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
      alert('Automation activated successfully.');
    } catch {
      alert('Failed to activate automation.');
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
      alert('Automation paused successfully.');
    } catch {
      alert('Failed to pause automation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunNow = async () => {
    if (!automation) return;
    if (!confirm('Start email sending now?')) return;

    setActionLoading(true);
    try {
      await automationApi.run(automation.autoId);
      alert('Email sending started. Please check the results shortly.');
      setTimeout(fetchData, 3000);
    } catch {
      alert('Failed to start sending.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryFailed = async (jobId: string) => {
    if (!confirm('Retry this failed email?')) return;
    try {
      await workerApi.retryFailedJob(jobId);
      alert('Retry requested successfully.');
      fetchData();
    } catch {
      alert('Failed to request retry.');
    }
  };

  const handleRetryAll = async () => {
    if (!confirm(`Retry all ${failedItems.length} failed emails?`)) return;
    try {
      await workerApi.retryAllFailed(automation?.autoId);
      alert('Retry all requested successfully.');
      fetchData();
    } catch {
      alert('Failed to request retry.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96 text-gray-500">
        Loading...
      </div>
    );
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { bg: 'bg-green-50 border-green-200', dot: 'bg-green-500', text: 'Active' };
      case 'RUNNING': return { bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500 animate-pulse', text: 'Running' };
      default: return { bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400', text: 'Paused' };
    }
  };

  const statusStyle = getStatusStyle(automation?.status || 'INACTIVE');
  const progressPercent = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {automation?.autoName || 'Email Automation'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Operator Dashboard</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
          workerStatus === 'healthy'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${workerStatus === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
          {workerStatus === 'healthy' ? 'System Online' : 'System Offline'}
        </div>
      </div>

      {/* Status Card */}
      <div className={`flex items-center gap-4 p-5 rounded-lg border mb-6 ${statusStyle.bg}`}>
        <span className={`w-4 h-4 rounded-full ${statusStyle.dot}`} />
        <div className="flex-1">
          <div className="text-sm text-gray-500">Current Status</div>
          <div className="text-lg font-medium text-gray-900">{statusStyle.text}</div>
        </div>
        <div className="text-right text-sm text-gray-600">
          <div>Schedule: {automation?.scheduleTime}</div>
          {automation?.lastRunAt && (
            <div className="text-xs text-gray-400 mt-1">
              Last run: {new Date(automation.lastRunAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        {automation?.status === 'ACTIVE' ? (
          <button
            onClick={handlePause}
            disabled={actionLoading}
            className="flex-1 py-3 px-4 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Pause
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={actionLoading}
            className="flex-1 py-3 px-4 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Activate
          </button>
        )}
        <button
          onClick={handleRunNow}
          disabled={actionLoading}
          className="flex-1 py-3 px-4 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Run Now
        </button>
      </div>

      {/* Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Monthly Statistics</h2>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded border border-gray-100">
            <div className="text-2xl font-semibold text-gray-900">{stats.total.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">Total</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded border border-green-100">
            <div className="text-2xl font-semibold text-green-700">{stats.success.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">Success</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded border border-red-100">
            <div className="text-2xl font-semibold text-red-700">{stats.failed.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">Failed</div>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded border border-amber-100">
            <div className="text-2xl font-semibold text-amber-700">{stats.pending.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">Pending</div>
          </div>
        </div>

        {stats.total > 0 && (
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-center mt-2 text-xs text-gray-500">
              {progressPercent.toFixed(1)}% Complete
            </div>
          </div>
        )}
      </div>

      {/* Failed Items */}
      {failedItems.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-red-700">
              Failed Emails ({failedItems.length})
            </h2>
            <button
              onClick={handleRetryAll}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry All
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {failedItems.map((item) => (
              <div
                key={item.logId}
                className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{item.email}</div>
                  <div className="text-xs text-gray-500 truncate">{item.merchantName}</div>
                  <div className="text-xs text-red-600 mt-0.5 truncate">{item.errorMessage}</div>
                </div>
                <button
                  onClick={() => handleRetryFailed(item.logId.toString())}
                  className="ml-3 px-2.5 py-1 text-xs font-medium bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-xs text-gray-400">
        Auto-refresh every 30 seconds
      </div>
    </div>
  );
};

export default OperatorDashboard;
