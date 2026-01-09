/**
 * Settings Page
 * 시스템 설정 및 상태 확인
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Badge, Button, Input, Select } from '../../components/atoms';
import { DataTable, Modal, ConfirmModal } from '../../components/molecules';
import { orgApi, workerApi, userApi, dbProfileApi } from '../../api';
import { Org } from '../../types';
import { User } from '../../api/user';
import { DbProfile, DbType } from '../../api/dbprofile';
import type { WorkerHealth, SesQuota, QueueStatus } from '../../api/worker';

type TabType = 'system' | 'users' | 'dbprofiles';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('system');
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dbProfiles, setDbProfiles] = useState<DbProfile[]>([]);
  const [workerHealth, setWorkerHealth] = useState<WorkerHealth | null>(null);
  const [sesQuota, setSesQuota] = useState<SesQuota | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ userName: '', userEmail: '', password: '', role: 'USER' });
  const [userSaving, setUserSaving] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

  // DB Profile Modal State
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<DbProfile | null>(null);
  const [dbForm, setDbForm] = useState({
    profileName: '', description: '', dbType: 'ORACLE' as DbType,
    host: '', port: 1521, database: '', username: '', password: ''
  });
  const [dbSaving, setDbSaving] = useState(false);
  const [deleteProfileId, setDeleteProfileId] = useState<number | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchSystemData = useCallback(async () => {
    try {
      const [orgsRes, healthRes, quotaRes, queueRes] = await Promise.all([
        orgApi.getAll().catch(() => ({ success: false, data: [] })),
        workerApi.checkHealth().catch(() => ({ success: false, data: null })),
        workerApi.getQuota().catch(() => ({ success: false, data: null })),
        workerApi.getQueueStatus().catch(() => ({ success: false, data: null })),
      ]);

      if (orgsRes.success) setOrgs(orgsRes.data || []);
      if (healthRes.success) setWorkerHealth(healthRes.data);
      if (quotaRes.success) setSesQuota(quotaRes.data);
      if (queueRes.success) setQueueStatus(queueRes.data);
    } catch (error) {
      console.error('Failed to fetch system data:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await userApi.findAll();
      if (res.success) setUsers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  const fetchDbProfiles = useCallback(async () => {
    try {
      const res = await dbProfileApi.findAll();
      if (res.success) setDbProfiles(res.data || []);
    } catch (error) {
      console.error('Failed to fetch DB profiles:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSystemData(), fetchUsers(), fetchDbProfiles()]);
    setLoading(false);
  }, [fetchSystemData, fetchUsers, fetchDbProfiles]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // User CRUD handlers
  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({ userName: user.userName, userEmail: user.userEmail, password: '', role: user.role });
    } else {
      setEditingUser(null);
      setUserForm({ userName: '', userEmail: '', password: '', role: 'USER' });
    }
    setUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    setUserSaving(true);
    try {
      if (editingUser) {
        await userApi.update(editingUser.userId, {
          userName: userForm.userName,
          userEmail: userForm.userEmail,
          role: userForm.role,
        });
      } else {
        await userApi.create(userForm);
      }
      await fetchUsers();
      setUserModalOpen(false);
    } catch (error) {
      console.error('Failed to save user:', error);
    }
    setUserSaving(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    try {
      await userApi.delete(deleteUserId);
      await fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
    setDeleteUserId(null);
  };

  // DB Profile CRUD handlers
  const handleOpenDbModal = (profile?: DbProfile) => {
    if (profile) {
      setEditingProfile(profile);
      setDbForm({
        profileName: profile.profileName, description: profile.description || '',
        dbType: profile.dbType as DbType, host: profile.host, port: profile.port,
        database: profile.database, username: profile.username, password: ''
      });
    } else {
      setEditingProfile(null);
      setDbForm({ profileName: '', description: '', dbType: 'ORACLE', host: '', port: 1521, database: '', username: '', password: '' });
    }
    setTestResult(null);
    setDbModalOpen(true);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const result = await dbProfileApi.testConnection({
        dbType: dbForm.dbType,
        host: dbForm.host,
        port: dbForm.port,
        database: dbForm.database,
        username: dbForm.username,
        password: dbForm.password,
      });
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Connection test failed' });
    }
    setTestingConnection(false);
  };

  const handleSaveDbProfile = async () => {
    setDbSaving(true);
    try {
      if (editingProfile) {
        await dbProfileApi.update(editingProfile.profileId, dbForm);
      } else {
        await dbProfileApi.create(dbForm);
      }
      await fetchDbProfiles();
      setDbModalOpen(false);
    } catch (error) {
      console.error('Failed to save DB profile:', error);
    }
    setDbSaving(false);
  };

  const handleDeleteDbProfile = async () => {
    if (!deleteProfileId) return;
    try {
      await dbProfileApi.delete(deleteProfileId);
      await fetchDbProfiles();
    } catch (error) {
      console.error('Failed to delete DB profile:', error);
    }
    setDeleteProfileId(null);
  };

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

  const userColumns = [
    { key: 'userId', header: 'ID', width: '60px' },
    { key: 'userName', header: 'Name' },
    { key: 'userEmail', header: 'Email' },
    { key: 'role', header: 'Role', render: (u: User) => <Badge variant={u.role === 'ADMIN' ? 'info' : 'default'}>{u.role}</Badge> },
    {
      key: 'actions', header: 'Actions', width: '120px',
      render: (u: User) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleOpenUserModal(u)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteUserId(u.userId)}>Delete</Button>
        </div>
      )
    }
  ];

  const dbColumns = [
    { key: 'profileId', header: 'ID', width: '60px' },
    { key: 'profileName', header: 'Name' },
    { key: 'dbType', header: 'Type', render: (p: DbProfile) => <Badge>{p.dbType}</Badge> },
    { key: 'host', header: 'Host', render: (p: DbProfile) => `${p.host}:${p.port}` },
    { key: 'database', header: 'Database' },
    {
      key: 'actions', header: 'Actions', width: '120px',
      render: (p: DbProfile) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleOpenDbModal(p)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteProfileId(p.profileId)}>Delete</Button>
        </div>
      )
    }
  ];

  const orgColumns = [
    { key: 'orgId', header: 'ID', width: '80px' },
    { key: 'orgName', header: 'Organization Name' },
    { key: 'description', header: 'Description' },
    { key: 'useYn', header: 'Status', render: (item: Org) => <Badge variant={item.useYn === 'Y' ? 'success' : 'default'}>{item.useYn === 'Y' ? 'Active' : 'Inactive'}</Badge> },
    { key: 'createdAt', header: 'Created', render: (item: Org) => new Date(item.createdAt).toLocaleDateString() },
  ];

  const tabs = [
    { id: 'system' as TabType, label: 'System Status' },
    { id: 'users' as TabType, label: 'Users' },
    { id: 'dbprofiles' as TabType, label: 'DB Profiles' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button onClick={handleRefresh} loading={refreshing} variant="secondary">Refresh</Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 font-medium border-b-2 -mb-px ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Worker Status */}
            <Card>
              <h2 className="text-lg font-semibold mb-4">Worker Status</h2>
              {loading ? <div className="text-gray-500">Loading...</div> : workerHealth ? (
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-600">Status</span><Badge variant={workerHealth.status === 'ok' || workerHealth.status === 'healthy' ? 'success' : 'danger'}>{workerHealth.status === 'ok' || workerHealth.status === 'healthy' ? 'Healthy' : 'Unhealthy'}</Badge></div>
                  <div className="flex justify-between"><span className="text-gray-600">Scheduler</span><Badge variant={workerHealth.schedulerRunning ? 'success' : 'warning'}>{workerHealth.schedulerRunning ? 'Running' : 'Stopped'}</Badge></div>
                  <div className="flex justify-between"><span className="text-gray-600">Redis</span><Badge variant={workerHealth.redisConnected ? 'success' : 'danger'}>{workerHealth.redisConnected ? 'Connected' : 'Disconnected'}</Badge></div>
                  {workerHealth.devMode && <div className="flex justify-between"><span className="text-gray-600">Mode</span><Badge variant="warning">DEV</Badge></div>}
                </div>
              ) : <div className="text-red-500">Worker not responding</div>}
            </Card>

            {/* Queue Status */}
            <Card>
              <h2 className="text-lg font-semibold mb-4">Queue Status</h2>
              {loading ? <div className="text-gray-500">Loading...</div> : queueStatus ? (
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-600">Waiting</span><span className="font-medium">{queueStatus.waiting}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Active</span><span className="font-medium text-blue-600">{queueStatus.active}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Completed</span><span className="font-medium text-green-600">{queueStatus.completed}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Failed</span><span className="font-medium text-red-600">{queueStatus.failed}</span></div>
                </div>
              ) : <div className="text-gray-500">Queue data unavailable</div>}
            </Card>

            {/* SES Quota */}
            <Card>
              <h2 className="text-lg font-semibold mb-4">AWS SES Quota</h2>
              {loading ? <div className="text-gray-500">Loading...</div> : sesQuota ? (
                <div className="space-y-3">
                  <div><div className="flex justify-between text-sm mb-1"><span className="text-gray-600">24-Hour Usage</span><span className="font-medium">{sesQuota.sentLast24Hours.toLocaleString()} / {sesQuota.max24HourSend.toLocaleString()}</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full ${getQuotaBarColor()}`} style={{ width: `${Math.min(getQuotaUsagePercent(), 100)}%` }} /></div></div>
                  <div className="flex justify-between"><span className="text-gray-600">Remaining</span><span className="font-semibold text-green-600">{sesQuota.remaining.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Max Rate</span><span className="font-medium">{sesQuota.maxSendRate}/sec</span></div>
                </div>
              ) : <div className="text-gray-500">Quota unavailable</div>}
            </Card>
          </div>

          {/* Organizations */}
          <Card padding="none">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Organizations</h2>
              <Button size="sm" onClick={() => window.location.href = '/org'}>Manage</Button>
            </div>
            <DataTable columns={orgColumns} data={orgs} loading={loading} emptyMessage="No organizations" />
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card padding="none">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">User Management</h2>
            <Button onClick={() => handleOpenUserModal()}>Add User</Button>
          </div>
          <DataTable columns={userColumns} data={users} loading={loading} emptyMessage="No users found" />
        </Card>
      )}

      {/* DB Profiles Tab */}
      {activeTab === 'dbprofiles' && (
        <Card padding="none">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">DB Profile Management</h2>
            <Button onClick={() => handleOpenDbModal()}>Add Profile</Button>
          </div>
          <DataTable columns={dbColumns} data={dbProfiles} loading={loading} emptyMessage="No DB profiles found" />
        </Card>
      )}

      {/* User Modal */}
      <Modal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} title={editingUser ? 'Edit User' : 'Add User'}>
        <div className="space-y-4">
          <Input label="Name" value={userForm.userName} onChange={(e) => setUserForm({ ...userForm, userName: e.target.value })} placeholder="User name" required />
          <Input label="Email" type="email" value={userForm.userEmail} onChange={(e) => setUserForm({ ...userForm, userEmail: e.target.value })} placeholder="Email address" required />
          {!editingUser && <Input label="Password" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Password" required />}
          <Select label="Role" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} options={[{ value: 'USER', label: 'User' }, { value: 'ADMIN', label: 'Admin' }]} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setUserModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} loading={userSaving}>{editingUser ? 'Update' : 'Create'}</Button>
        </div>
      </Modal>

      {/* DB Profile Modal */}
      <Modal isOpen={dbModalOpen} onClose={() => setDbModalOpen(false)} title={editingProfile ? 'Edit DB Profile' : 'Add DB Profile'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Profile Name" value={dbForm.profileName} onChange={(e) => setDbForm({ ...dbForm, profileName: e.target.value })} required />
            <Select label="Database Type" value={dbForm.dbType} onChange={(e) => setDbForm({ ...dbForm, dbType: e.target.value as DbType })} options={[{ value: 'ORACLE', label: 'Oracle' }, { value: 'MYSQL', label: 'MySQL' }, { value: 'POSTGRESQL', label: 'PostgreSQL' }, { value: 'MSSQL', label: 'MS SQL Server' }]} />
          </div>
          <Input label="Description" value={dbForm.description} onChange={(e) => setDbForm({ ...dbForm, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><Input label="Host" value={dbForm.host} onChange={(e) => setDbForm({ ...dbForm, host: e.target.value })} placeholder="localhost" required /></div>
            <Input label="Port" type="number" value={dbForm.port} onChange={(e) => setDbForm({ ...dbForm, port: parseInt(e.target.value) || 1521 })} required />
          </div>
          <Input label="Database/Service" value={dbForm.database} onChange={(e) => setDbForm({ ...dbForm, database: e.target.value })} placeholder="XEPDB1" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Username" value={dbForm.username} onChange={(e) => setDbForm({ ...dbForm, username: e.target.value })} required />
            <Input label="Password" type="password" value={dbForm.password} onChange={(e) => setDbForm({ ...dbForm, password: e.target.value })} placeholder={editingProfile ? '(unchanged)' : 'Password'} required={!editingProfile} />
          </div>
          {testResult && (
            <div className={`p-3 rounded ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {testResult.message}
            </div>
          )}
        </div>
        <div className="flex justify-between mt-6">
          <Button variant="secondary" onClick={handleTestConnection} loading={testingConnection}>Test Connection</Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDbModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDbProfile} loading={dbSaving}>{editingProfile ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmations */}
      <ConfirmModal isOpen={deleteUserId !== null} onClose={() => setDeleteUserId(null)} onConfirm={handleDeleteUser} title="Delete User" message="Are you sure you want to delete this user?" confirmText="Delete" variant="danger" />
      <ConfirmModal isOpen={deleteProfileId !== null} onClose={() => setDeleteProfileId(null)} onConfirm={handleDeleteDbProfile} title="Delete DB Profile" message="Are you sure you want to delete this DB profile?" confirmText="Delete" variant="danger" />
    </div>
  );
}
