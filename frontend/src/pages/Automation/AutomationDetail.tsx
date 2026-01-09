/**
 * Automation Detail Page
 * 자동화 상세 설정 페이지
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Badge, Card, Input, Select } from '../../components/atoms';
import { Modal, DataTable } from '../../components/molecules';
import { automationApi, schedulerApi, logApi, dbProfileApi } from '../../api';
import { DbProfile } from '../../api/dbprofile';
import {
  Automation,
  Template,
  Scheduler,
  AutoRunLog,
  CreateSchedulerDto,
} from '../../types';

type TabType = 'target' | 'template' | 'email' | 'schedule' | 'history';

export default function AutomationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const autoId = parseInt(id || '0', 10);

  const [automation, setAutomation] = useState<Automation | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_template, setTemplate] = useState<Template | null>(null);
  const [schedules, setSchedules] = useState<Scheduler[]>([]);
  const [runLogs, setRunLogs] = useState<AutoRunLog[]>([]);
  const [dbProfiles, setDbProfiles] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('target');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [testingQuery, setTestingQuery] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_queryPreview, setQueryPreview] = useState<any[]>([]);

  // Form states
  const [targetForm, setTargetForm] = useState({
    targetQuery: '',
  });

  const [templateForm, setTemplateForm] = useState({
    subjectTemplate: '',
    bodyTemplate: '',
  });

  const [emailForm, setEmailForm] = useState({
    senderEmail: '',
    senderName: '',
    replyTo: '',
    recipientField: 'EMAIL',
    attachmentPattern: '',
  });

  const [scheduleForm, setScheduleForm] = useState<CreateSchedulerDto>({
    autoId: autoId,
    type: 'DAILY',
    hour: 9,
    minute: 0,
  });

  const [previewHtml, setPreviewHtml] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!autoId) return;

    try {
      setLoading(true);
      const [autoRes, templateRes, scheduleRes, logRes, dbProfileRes] = await Promise.all([
        automationApi.getById(autoId),
        automationApi.getTemplate(autoId).catch(() => ({ success: false, data: null })),
        schedulerApi.getByAutomation(autoId).catch(() => ({ success: false, data: [] })),
        logApi.getAutomationLogs({ autoId, page: 1, pageSize: 10 }).catch(() => ({ success: false, data: { items: [] } })),
        dbProfileApi.findAll().catch(() => ({ success: false, data: [] })),
      ]);

      if (autoRes.success) {
        setAutomation(autoRes.data);
        // Load target query if exists
        if (autoRes.data.targetQuery) {
          setTargetForm({ targetQuery: autoRes.data.targetQuery });
        }
      }

      if (templateRes.success && templateRes.data) {
        setTemplate(templateRes.data);
        setTemplateForm({
          subjectTemplate: templateRes.data.subjectTemplate || templateRes.data.subject || '',
          bodyTemplate: templateRes.data.bodyTemplate || templateRes.data.bodyHtml || '',
        });
      }

      if (scheduleRes.success) {
        setSchedules(Array.isArray(scheduleRes.data) ? scheduleRes.data : [scheduleRes.data].filter(Boolean));
      }

      if (logRes.success && logRes.data) {
        setRunLogs(logRes.data.items || []);
      }

      if (dbProfileRes.success) {
        setDbProfiles(dbProfileRes.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch automation details:', error);
    } finally {
      setLoading(false);
    }
  }, [autoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRun = async () => {
    try {
      setSaving(true);
      const res = await automationApi.run(autoId);
      if (res.success) {
        alert(`Automation triggered! Run ID: ${res.data.runId}`);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to run automation:', error);
      alert('Failed to trigger automation');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      setSaving(true);
      await automationApi.saveTemplate(autoId, templateForm);
      alert('Template saved successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    try {
      setSaving(true);
      await automationApi.saveEmailSetting(autoId, emailForm);
      alert('Email settings saved successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to save email settings:', error);
      alert('Failed to save email settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTarget = async () => {
    if (!targetForm.targetQuery.trim()) {
      alert('Please enter a target query');
      return;
    }
    try {
      setSaving(true);
      await automationApi.setTarget(autoId, { targetQuery: targetForm.targetQuery });
      alert('Target query saved successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to save target query:', error);
      alert('Failed to save target query');
    } finally {
      setSaving(false);
    }
  };

  const handleTestQuery = async () => {
    if (!targetForm.targetQuery.trim()) {
      alert('Please enter a query to test');
      return;
    }
    setTestingQuery(true);
    setQueryPreview([]);
    try {
      // For now, just show a mock preview - actual implementation would call backend
      alert('Query test feature requires backend implementation. Save the query and run automation to see actual results.');
    } catch (error) {
      console.error('Failed to test query:', error);
      alert('Failed to test query');
    } finally {
      setTestingQuery(false);
    }
  };

  const handlePreview = async () => {
    try {
      const res = await automationApi.previewTemplate(autoId, {
        subjectTemplate: templateForm.subjectTemplate,
        bodyTemplate: templateForm.bodyTemplate,
        sampleData: {
          NAME: 'John Doe',
          EMAIL: 'john@example.com',
          COMPANY: 'Example Corp',
          DATE: new Date().toLocaleDateString(),
        },
      });
      if (res.success) {
        setPreviewHtml(res.data);
        setPreviewModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to preview template:', error);
      alert('Failed to preview template');
    }
  };

  const handleCreateSchedule = async () => {
    try {
      setSaving(true);
      await schedulerApi.create({ ...scheduleForm, autoId });
      setScheduleModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to create schedule:', error);
      alert('Failed to create schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (schedulerId: number) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await schedulerApi.delete(schedulerId);
      fetchData();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'RUNNING':
        return <Badge variant="info">Running</Badge>;
      case 'INACTIVE':
        return <Badge variant="default">Inactive</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'target', label: '1. Recipients' },
    { key: 'template', label: '2. Template' },
    { key: 'email', label: '3. Email Settings' },
    { key: 'schedule', label: '4. Schedule' },
    { key: 'history', label: 'Run History' },
  ];

  const scheduleColumns = [
    { key: 'schedulerId', header: 'ID', width: '80px' },
    { key: 'type', header: 'Type' },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (item: Scheduler) => {
        const time = `${String(item.hour).padStart(2, '0')}:${String(item.minute).padStart(2, '0')}`;
        switch (item.type) {
          case 'REALTIME':
            return 'Every 30 seconds';
          case 'DAILY':
            return `Daily at ${time}`;
          case 'WEEKLY':
            return `Weekly on day ${item.day} at ${time}`;
          case 'MONTHLY':
            return `Monthly on day ${item.day} at ${time}`;
          default:
            return time;
        }
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Scheduler) => getStatusBadge(item.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Scheduler) => (
        <Button
          size="sm"
          variant="danger"
          onClick={() => handleDeleteSchedule(item.schedulerId)}
        >
          Delete
        </Button>
      ),
    },
  ];

  const historyColumns = [
    { key: 'runId', header: 'Run ID', width: '100px' },
    {
      key: 'status',
      header: 'Status',
      render: (item: AutoRunLog) => getStatusBadge(item.status),
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
      key: 'completedAt',
      header: 'Completed At',
      render: (item: AutoRunLog) =>
        item.completedAt ? new Date(item.completedAt).toLocaleString() : '-',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-gray-500 mb-4">Automation not found</div>
        <Button onClick={() => navigate('/automation')}>Back to List</Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/automation')}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold">{automation.autoName}</h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(automation.status)}
              <span className="text-sm text-gray-500">ID: {automation.autoId}</span>
            </div>
          </div>
        </div>
        <Button
          onClick={handleRun}
          loading={saving}
          disabled={automation.status === 'RUNNING'}
        >
          Run Now
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Target Tab */}
      {activeTab === 'target' && (
        <Card>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">How to Configure Recipients</h3>
              <p className="text-sm text-blue-700">
                Write a SQL query to fetch email recipients from your database.
                The query must return at least an EMAIL column. Other columns can be used as template variables.
              </p>
            </div>

            {dbProfiles.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  No database profiles configured. Please add a DB profile in Settings first.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Query (SQL)
              </label>
              <textarea
                className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                value={targetForm.targetQuery}
                onChange={(e) => setTargetForm({ ...targetForm, targetQuery: e.target.value })}
                placeholder={`SELECT
  EMAIL,
  NAME,
  COMPANY,
  CUSTOMER_ID
FROM CUSTOMERS
WHERE STATUS = 'ACTIVE'
  AND EMAIL IS NOT NULL`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Required columns: EMAIL (recipient address).
                Optional: Any columns you want to use in the email template.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Available Template Variables</h4>
              <p className="text-xs text-gray-600">
                Each column returned by your query becomes a template variable.
                Use {'{{COLUMN_NAME}}'} in your email template to insert the value.
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Example: If your query returns EMAIL, NAME, AMOUNT columns, you can use{' '}
                {'{{EMAIL}}'}, {'{{NAME}}'}, {'{{AMOUNT}}'} in your template.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={handleTestQuery} loading={testingQuery}>
                Test Query
              </Button>
              <Button onClick={handleSaveTarget} loading={saving}>
                Save Target Query
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Template Tab */}
      {activeTab === 'template' && (
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <Input
                value={templateForm.subjectTemplate}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, subjectTemplate: e.target.value })
                }
                placeholder="Email subject (use {{variable}} for dynamic content)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: Hello {'{{NAME}}'}, your order is confirmed!
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body (HTML)
              </label>
              <textarea
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                value={templateForm.bodyTemplate}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, bodyTemplate: e.target.value })
                }
                placeholder="<html><body>Your email content here...</body></html>"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported variables: {'{{NAME}}'}, {'{{EMAIL}}'}, {'{{COMPANY}}'}, etc.
                <br />
                Helpers: {'{{formatDate DATE}}'}, {'{{formatNumber AMOUNT}}'}, {'{{#if CONDITION}}...{{/if}}'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={handlePreview}>
                Preview
              </Button>
              <Button onClick={handleSaveTemplate} loading={saving}>
                Save Template
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Email Settings Tab */}
      {activeTab === 'email' && (
        <Card>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sender Email *
                </label>
                <Input
                  type="email"
                  value={emailForm.senderEmail}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, senderEmail: e.target.value })
                  }
                  placeholder="noreply@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sender Name *
                </label>
                <Input
                  value={emailForm.senderName}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, senderName: e.target.value })
                  }
                  placeholder="Company Name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reply-To (Optional)
                </label>
                <Input
                  type="email"
                  value={emailForm.replyTo}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, replyTo: e.target.value })
                  }
                  placeholder="support@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Field
                </label>
                <Input
                  value={emailForm.recipientField}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, recipientField: e.target.value })
                  }
                  placeholder="EMAIL"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Column name from target query containing email address
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attachment Pattern (Optional)
              </label>
              <Input
                value={emailForm.attachmentPattern}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, attachmentPattern: e.target.value })
                }
                placeholder="invoice_{{ID}}.pdf"
              />
              <p className="text-xs text-gray-500 mt-1">
                File name pattern for attachments. Use variables to match files.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSaveEmail} loading={saving}>
                Save Email Settings
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setScheduleModalOpen(true)}>
              + Add Schedule
            </Button>
          </div>
          <Card padding="none">
            <DataTable
              columns={scheduleColumns}
              data={schedules}
              emptyMessage="No schedules configured"
            />
          </Card>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card padding="none">
          <DataTable
            columns={historyColumns}
            data={runLogs}
            emptyMessage="No run history"
          />
        </Card>
      )}

      {/* Schedule Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Add Schedule"
        footer={
          <>
            <Button variant="ghost" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule} loading={saving}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Type
            </label>
            <Select
              options={[
                { value: 'REALTIME', label: 'Realtime (Every 30 seconds)' },
                { value: 'DAILY', label: 'Daily' },
                { value: 'WEEKLY', label: 'Weekly' },
                { value: 'MONTHLY', label: 'Monthly' },
              ]}
              value={scheduleForm.type}
              onChange={(e) =>
                setScheduleForm({
                  ...scheduleForm,
                  type: e.target.value as CreateSchedulerDto['type'],
                })
              }
            />
          </div>

          {(scheduleForm.type === 'WEEKLY' || scheduleForm.type === 'MONTHLY') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {scheduleForm.type === 'WEEKLY' ? 'Day of Week' : 'Day of Month'}
              </label>
              <Select
                options={
                  scheduleForm.type === 'WEEKLY'
                    ? [
                        { value: 0, label: 'Sunday' },
                        { value: 1, label: 'Monday' },
                        { value: 2, label: 'Tuesday' },
                        { value: 3, label: 'Wednesday' },
                        { value: 4, label: 'Thursday' },
                        { value: 5, label: 'Friday' },
                        { value: 6, label: 'Saturday' },
                      ]
                    : Array.from({ length: 31 }, (_, i) => ({
                        value: i + 1,
                        label: `${i + 1}`,
                      }))
                }
                value={scheduleForm.day || 1}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, day: Number(e.target.value) })
                }
              />
            </div>
          )}

          {scheduleForm.type !== 'REALTIME' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hour
                </label>
                <Select
                  options={Array.from({ length: 24 }, (_, i) => ({
                    value: i,
                    label: String(i).padStart(2, '0'),
                  }))}
                  value={scheduleForm.hour}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, hour: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minute
                </label>
                <Select
                  options={Array.from({ length: 60 }, (_, i) => ({
                    value: i,
                    label: String(i).padStart(2, '0'),
                  }))}
                  value={scheduleForm.minute}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, minute: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Template Preview"
        size="lg"
      >
        <div className="border rounded-lg p-4 bg-gray-50 min-h-[300px]">
          <div
            dangerouslySetInnerHTML={{ __html: previewHtml }}
            className="prose max-w-none"
          />
        </div>
      </Modal>
    </div>
  );
}
