/**
 * Report Page
 * 이메일 발송 통계 및 리포트
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Badge, Select } from '../../components/atoms';
import { StatCard, DataTable } from '../../components/molecules';
import { reportApi, logApi, orgApi } from '../../api';
import { ReportSummary, DomainStats, AutoRunLog, Org } from '../../types';

export default function Report() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [domainStats, setDomainStats] = useState<DomainStats[]>([]);
  const [recentLogs, setRecentLogs] = useState<AutoRunLog[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState('7d');

  const getDateRange = useCallback(() => {
    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [dateRange]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      const [summaryRes, domainRes, logsRes, orgsRes] = await Promise.all([
        reportApi.getSummary(selectedOrgId),
        reportApi.getDomainStats(startDate, endDate, selectedOrgId),
        logApi.getAutomationLogs({
          orgId: selectedOrgId,
          startDate,
          endDate,
          page: 1,
          pageSize: 20
        }),
        orgApi.getAll(),
      ]);

      if (summaryRes.success) {
        setSummary(summaryRes.data);
      }
      if (domainRes.success) {
        setDomainStats(domainRes.data || []);
      }
      if (logsRes.success && logsRes.data) {
        setRecentLogs(logsRes.data.items || []);
      }
      if (orgsRes.success) {
        setOrgs(orgsRes.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId, getDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const domainColumns = [
    { key: 'domain', header: 'Domain' },
    { key: 'count', header: 'Total Sent' },
    { key: 'successCount', header: 'Success' },
    { key: 'failCount', header: 'Failed' },
    {
      key: 'rate',
      header: 'Success Rate',
      render: (item: DomainStats) => {
        const rate = item.count > 0 ? ((item.successCount / item.count) * 100).toFixed(1) : 0;
        return (
          <span className={Number(rate) >= 90 ? 'text-green-600' : Number(rate) >= 70 ? 'text-yellow-600' : 'text-red-600'}>
            {rate}%
          </span>
        );
      },
    },
  ];

  const logColumns = [
    { key: 'runId', header: 'Run ID', width: '100px' },
    { key: 'autoId', header: 'Automation' },
    {
      key: 'status',
      header: 'Status',
      render: (item: AutoRunLog) => (
        <Badge
          variant={
            item.status === 'COMPLETED' || item.status === 'SUCCESS'
              ? 'success'
              : item.status === 'FAILED'
              ? 'danger'
              : item.status === 'RUNNING'
              ? 'info'
              : 'warning'
          }
        >
          {item.status}
        </Badge>
      ),
    },
    { key: 'totalCount', header: 'Total' },
    { key: 'successCount', header: 'Success' },
    { key: 'failCount', header: 'Failed' },
    {
      key: 'startedAt',
      header: 'Started At',
      render: (item: AutoRunLog) => new Date(item.startedAt).toLocaleString(),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (item: AutoRunLog) => {
        if (!item.completedAt) return '-';
        const start = new Date(item.startedAt).getTime();
        const end = new Date(item.completedAt).getTime();
        const seconds = Math.floor((end - start) / 1000);
        return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      },
    },
  ];

  const orgOptions = [
    { value: '', label: 'All Organizations' },
    ...orgs.map((org) => ({ value: org.orgId, label: org.orgName })),
  ];

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Report</h1>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex gap-4">
          <div className="w-48">
            <Select
              options={dateRangeOptions}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            />
          </div>
          <div className="w-64">
            <Select
              options={orgOptions}
              value={selectedOrgId || ''}
              onChange={(e) => setSelectedOrgId(e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Sent"
          value={loading ? '-' : (summary?.totalSent || 0).toLocaleString()}
          color="primary"
        />
        <StatCard
          title="Success"
          value={loading ? '-' : (summary?.successCount || 0).toLocaleString()}
          color="green"
        />
        <StatCard
          title="Failed"
          value={loading ? '-' : (summary?.failCount || 0).toLocaleString()}
          color="red"
        />
        <StatCard
          title="Success Rate"
          value={loading ? '-' : `${summary?.successRate || 0}%`}
          color="blue"
        />
      </div>

      {/* Domain Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h2 className="text-lg font-semibold mb-4">Domain Statistics</h2>
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : domainStats.length === 0 ? (
            <div className="text-gray-500">No domain data available</div>
          ) : (
            <DataTable
              columns={domainColumns}
              data={domainStats.slice(0, 10)}
              emptyMessage="No data"
            />
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Active Automations</span>
              <span className="font-semibold text-lg">{summary?.activeAutomations || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Avg. Success Rate</span>
              <span className="font-semibold text-lg text-green-600">{summary?.successRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Emails per Day (Avg)</span>
              <span className="font-semibold text-lg">
                {Math.round((summary?.totalSent || 0) / 7).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Run History */}
      <Card padding="none">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Runs</h2>
        </div>
        <DataTable
          columns={logColumns}
          data={recentLogs}
          loading={loading}
          emptyMessage="No run history"
        />
      </Card>
    </div>
  );
}
