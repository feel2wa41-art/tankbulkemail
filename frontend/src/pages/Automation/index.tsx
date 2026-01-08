/**
 * Automation Page
 * 자동화 관리 페이지
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Badge, Card, Select } from '../../components/atoms';
import { Modal, ConfirmModal, DataTable, SearchBar } from '../../components/molecules';
import { automationApi, orgApi } from '../../api';
import { Automation, Org, CreateAutomationDto } from '../../types';

export default function AutomationPage() {
  const navigate = useNavigate();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [filteredAutomations, setFilteredAutomations] = useState<Automation[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateAutomationDto>({
    orgId: 0,
    autoName: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [autoRes, orgRes] = await Promise.all([
        automationApi.getAll(selectedOrgId),
        orgApi.getAll(),
      ]);

      if (autoRes.success) {
        setAutomations(autoRes.data);
        setFilteredAutomations(autoRes.data);
      }
      if (orgRes.success) {
        setOrgs(orgRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch automations:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let filtered = automations;

    if (selectedOrgId) {
      filtered = filtered.filter((a) => a.orgId === selectedOrgId);
    }

    if (searchQuery) {
      filtered = filtered.filter((a) =>
        a.autoName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredAutomations(filtered);
  }, [automations, selectedOrgId, searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleOrgFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedOrgId(value ? Number(value) : undefined);
  };

  const handleOpenModal = (automation?: Automation) => {
    if (automation) {
      setSelectedAutomation(automation);
      setFormData({
        orgId: automation.orgId,
        autoName: automation.autoName,
      });
    } else {
      setSelectedAutomation(null);
      setFormData({ orgId: orgs[0]?.orgId || 0, autoName: '' });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAutomation(null);
    setFormData({ orgId: 0, autoName: '' });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (selectedAutomation) {
        await automationApi.update(selectedAutomation.autoId, {
          autoName: formData.autoName,
        });
      } else {
        await automationApi.create(formData);
      }
      handleCloseModal();
      fetchData();
    } catch (error) {
      console.error('Failed to save automation:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAutomation) return;
    try {
      setSaving(true);
      await automationApi.delete(selectedAutomation.autoId);
      setDeleteModalOpen(false);
      setSelectedAutomation(null);
      fetchData();
    } catch (error) {
      console.error('Failed to delete automation:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async (automation: Automation) => {
    try {
      await automationApi.run(automation.autoId);
      fetchData();
    } catch (error) {
      console.error('Failed to run automation:', error);
    }
  };

  const handleOpenDeleteModal = (automation: Automation) => {
    setSelectedAutomation(automation);
    setDeleteModalOpen(true);
  };

  const handleRowClick = (automation: Automation) => {
    navigate(`/automation/${automation.autoId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'RUNNING':
        return <Badge variant="info">Running</Badge>;
      case 'INACTIVE':
        return <Badge variant="default">Inactive</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const columns = [
    { key: 'autoId', header: 'ID', width: '80px' },
    { key: 'autoName', header: 'Automation Name' },
    {
      key: 'orgId',
      header: 'Organization',
      render: (item: Automation) => {
        const org = orgs.find((o) => o.orgId === item.orgId);
        return org?.orgName || item.orgId;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Automation) => getStatusBadge(item.status),
    },
    {
      key: 'lastRunAt',
      header: 'Last Run',
      render: (item: Automation) =>
        item.lastRunAt ? new Date(item.lastRunAt).toLocaleString() : '-',
    },
    {
      key: 'nextRunAt',
      header: 'Next Run',
      render: (item: Automation) =>
        item.nextRunAt ? new Date(item.nextRunAt).toLocaleString() : '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Automation) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleRun(item)}
            disabled={item.status === 'RUNNING'}
          >
            Run
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleOpenModal(item)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleOpenDeleteModal(item)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const orgOptions = [
    { value: '', label: 'All Organizations' },
    ...orgs.map((org) => ({ value: org.orgId, label: org.orgName })),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Automations</h1>
        <Button onClick={() => handleOpenModal()}>+ New Automation</Button>
      </div>

      <Card padding="none">
        <div className="p-4 border-b">
          <div className="flex gap-4">
            <div className="w-64">
              <Select
                options={orgOptions}
                onChange={handleOrgFilter}
                value={selectedOrgId || ''}
              />
            </div>
            <div className="flex-1 max-w-md">
              <SearchBar
                placeholder="Search automations..."
                onSearch={handleSearch}
              />
            </div>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filteredAutomations}
          loading={loading}
          emptyMessage="No automations found"
          onRowClick={handleRowClick}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={selectedAutomation ? 'Edit Automation' : 'New Automation'}
        footer={
          <>
            <Button variant="ghost" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {selectedAutomation ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {!selectedAutomation && (
            <Select
              label="Organization"
              options={orgs.map((org) => ({
                value: org.orgId,
                label: org.orgName,
              }))}
              value={formData.orgId}
              onChange={(e) =>
                setFormData({ ...formData, orgId: Number(e.target.value) })
              }
            />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Automation Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={formData.autoName}
              onChange={(e) =>
                setFormData({ ...formData, autoName: e.target.value })
              }
              placeholder="Enter automation name"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Automation"
        message={`Are you sure you want to delete "${selectedAutomation?.autoName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={saving}
      />
    </div>
  );
}
