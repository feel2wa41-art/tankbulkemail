/**
 * Organization Page
 * 조직/그룹 관리 페이지
 */
import { useEffect, useState, useCallback } from 'react';
import { Button, Input, Badge, Card } from '../../components/atoms';
import { Modal, ConfirmModal, DataTable, SearchBar } from '../../components/molecules';
import { orgApi } from '../../api';
import { Org, CreateOrgDto } from '../../types';

export default function OrgPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateOrgDto>({
    orgName: '',
    description: '',
  });

  const fetchOrgs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orgApi.getAll();
      if (response.success) {
        setOrgs(response.data);
        setFilteredOrgs(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const handleSearch = (query: string) => {
    if (!query) {
      setFilteredOrgs(orgs);
    } else {
      const filtered = orgs.filter(
        (org) =>
          org.orgName.toLowerCase().includes(query.toLowerCase()) ||
          org.description?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredOrgs(filtered);
    }
  };

  const handleOpenModal = (org?: Org) => {
    if (org) {
      setSelectedOrg(org);
      setFormData({
        orgName: org.orgName,
        description: org.description || '',
      });
    } else {
      setSelectedOrg(null);
      setFormData({ orgName: '', description: '' });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedOrg(null);
    setFormData({ orgName: '', description: '' });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (selectedOrg) {
        await orgApi.update(selectedOrg.orgId, formData);
      } else {
        await orgApi.create(formData);
      }
      handleCloseModal();
      fetchOrgs();
    } catch (error) {
      console.error('Failed to save organization:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOrg) return;
    try {
      setSaving(true);
      await orgApi.delete(selectedOrg.orgId);
      setDeleteModalOpen(false);
      setSelectedOrg(null);
      fetchOrgs();
    } catch (error) {
      console.error('Failed to delete organization:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteModal = (org: Org) => {
    setSelectedOrg(org);
    setDeleteModalOpen(true);
  };

  const columns = [
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
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Org) => (
        <div className="flex gap-2">
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <Button onClick={() => handleOpenModal()}>+ New Organization</Button>
      </div>

      <Card padding="none">
        <div className="p-4 border-b">
          <div className="max-w-md">
            <SearchBar
              placeholder="Search organizations..."
              onSearch={handleSearch}
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filteredOrgs}
          loading={loading}
          emptyMessage="No organizations found"
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={selectedOrg ? 'Edit Organization' : 'New Organization'}
        footer={
          <>
            <Button variant="ghost" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {selectedOrg ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Organization Name"
            value={formData.orgName}
            onChange={(e) =>
              setFormData({ ...formData, orgName: e.target.value })
            }
            placeholder="Enter organization name"
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Enter description (optional)"
          />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Organization"
        message={`Are you sure you want to delete "${selectedOrg?.orgName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={saving}
      />
    </div>
  );
}
