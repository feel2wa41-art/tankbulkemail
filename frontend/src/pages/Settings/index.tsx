/**
 * Settings Page
 * 시스템 설정 및 상태 확인
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Badge, Button } from '../../components/atoms';
import { DataTable } from '../../components/molecules';
import { orgApi } from '../../api';
import { apiClient } from '../../api/client';
import { Org } from '../../types';

interface WorkerHealth {
  status: string;
  schedulerRunning: boolean;
  redisConnected: boolean;
  devMode?: boolean;
}

interface SesQuota {
  max24HourSend: number;
  sentLast24Hours: number;
  remaining: number;
  maxSendRate: number;
}

export default function Settings() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [workerHealth, setWorkerHealth] = useState<WorkerHealth | null>(null);
  const [sesQuota, setSesQuota] = useState<SesQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [orgsRes, healthRes, quotaRes] = await Promise.all([
        orgApi.getAll(),
        apiClient.get('/worker/health').catch(() => ({ data: { success: false } })),
        apiClient.get('/worker/quota').catch(() => ({ data: { success: false } })),
      ]);

      if (orgsRes.success) {
        setOrgs(orgsRes.data || []);
      }
      if (healthRes.data?.success) {
        setWorkerHealth(healthRes.data.data);
      }
      if (quotaRes.data?.success) {
        setSesQuota(quotaRes.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const orgColumns = [
    { key: 'orgId', header: 'ID', width: '80px' },
    { key: 'orgName', header: 'Organization Name' },
    { key: 'description', header: 'Description' },
    {
      key: 'useYn',
      header: 'Status',
      render: (item: Org) => (
        <Badge variant={item.useYn === 'Y' ? 'success' : 'default'}>
          {item.useYn === 'Y' ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (item: Org) => new Date(item.createdAt).toLocaleDateString(),
    },
  ];

  const getQuotaUsagePercent = () => {
    if (!sesQuota) return 0;
    return Math.round((sesQuota.sentLast24Hours / sesQuota.max24HourSend) * 100);
  };

  const getQuotaBarColor = () => {
    const percent = getQuotaUsagePercent();
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button onClick={handleRefresh} loading={refreshing} variant="secondary">
          Refresh Status
        </Button>
      </div>

      <div className="space-y-6">
        {/* System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Worker Status */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Worker Status</h2>
            {loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : workerHealth ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status</span>
                  <Badge variant={workerHealth.status === 'ok' || workerHealth.status === 'healthy' ? 'success' : 'danger'}>
                    {workerHealth.status === 'ok' || workerHealth.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Scheduler</span>
                  <Badge variant={workerHealth.schedulerRunning ? 'success' : 'warning'}>
                    {workerHealth.schedulerRunning ? 'Running' : 'Stopped'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Redis Connection</span>
                  <Badge variant={workerHealth.redisConnected ? 'success' : 'danger'}>
                    {workerHealth.redisConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                {workerHealth.devMode && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Mode</span>
                    <Badge variant="warning">Development Mode</Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-red-500">Worker not responding</div>
            )}
          </Card>

          {/* SES Quota */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">AWS SES Quota</h2>
            {loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : sesQuota ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">24-Hour Usage</span>
                    <span className="font-medium">
                      {sesQuota.sentLast24Hours.toLocaleString()} / {sesQuota.max24HourSend.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getQuotaBarColor()}`}
                      style={{ width: `${Math.min(getQuotaUsagePercent(), 100)}%` }}
                    />
                  </div>
                  <div className="text-right text-xs text-gray-500 mt-1">
                    {getQuotaUsagePercent()}% used
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Remaining Today</span>
                  <span className="font-semibold text-green-600">
                    {sesQuota.remaining.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Max Send Rate</span>
                  <span className="font-medium">{sesQuota.maxSendRate} /sec</span>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Quota data unavailable</div>
            )}
          </Card>
        </div>

        {/* Organizations */}
        <Card padding="none">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Organizations</h2>
            <Button size="sm" onClick={() => window.location.href = '/org'}>
              Manage Organizations
            </Button>
          </div>
          <DataTable
            columns={orgColumns}
            data={orgs}
            loading={loading}
            emptyMessage="No organizations found"
          />
        </Card>

        {/* Environment Info */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Environment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Environment</div>
              <div className="font-medium">{import.meta.env.MODE || 'development'}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">API URL</div>
              <div className="font-medium text-sm truncate">
                {import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Version</div>
              <div className="font-medium">1.0.0</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Build Date</div>
              <div className="font-medium">{new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
