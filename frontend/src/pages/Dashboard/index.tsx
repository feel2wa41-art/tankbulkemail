/**
 * Dashboard Page
 * 대시보드 메인 페이지 - 통계 및 최근 활동 표시
 */
import { useEffect, useState } from 'react';
import { StatCard, DataTable } from '../../components/molecules';
import { Badge } from '../../components/atoms';
import { reportApi, logApi } from '../../api';
import { ReportSummary, AutoRunLog } from '../../types';

export default function Dashboard() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [recentLogs, setRecentLogs] = useState<AutoRunLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, logsRes] = await Promise.all([
          reportApi.getSummary(),
          logApi.getAutomationLogs({ pageSize: 10 }),
        ]);

        if (summaryRes.success) {
          setSummary(summaryRes.data);
        }
        if (logsRes.success && logsRes.data) {
          setRecentLogs(logsRes.data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const logColumns = [
    { key: 'runId', header: 'Run ID' },
    { key: 'autoId', header: 'Automation ID' },
    {
      key: 'status',
      header: 'Status',
      render: (item: AutoRunLog) => (
        <Badge
          variant={
            item.status === 'SUCCESS'
              ? 'success'
              : item.status === 'FAILED'
              ? 'danger'
              : 'warning'
          }
        >
          {item.status}
        </Badge>
      ),
    },
    { key: 'successCount', header: 'Success' },
    { key: 'failCount', header: 'Failed' },
    {
      key: 'startedAt',
      header: 'Started At',
      render: (item: AutoRunLog) =>
        new Date(item.startedAt).toLocaleString(),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Sent (Today)"
          value={loading ? '-' : (summary?.totalSent || 0).toLocaleString()}
          color="primary"
        />
        <StatCard
          title="Success Rate"
          value={loading ? '-' : `${summary?.successRate || 0}%`}
          color="green"
        />
        <StatCard
          title="Active Automations"
          value={loading ? '-' : summary?.activeAutomations || 0}
          color="blue"
        />
        <StatCard
          title="Failed (Today)"
          value={loading ? '-' : summary?.failCount || 0}
          color="red"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        <DataTable
          columns={logColumns}
          data={recentLogs}
          loading={loading}
          emptyMessage="No recent activity"
        />
      </div>
    </div>
  );
}
