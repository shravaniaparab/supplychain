import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search,
  Filter,
  UserCheck,
  UserX,
  Edit,
  Shield,
  Wheat,
  Truck,
  Package,
  ShoppingBag,
  User
} from 'lucide-react';
import { adminAPI } from '../../services/adminApi';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers(roleFilter);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await adminAPI.updateUser(userId, updates);
      setSelectedUser(null);
      setEditMode(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const getRoleIcon = (role) => {
    const icons = {
      farmer: Wheat,
      transporter: Truck,
      distributor: Package,
      retailer: ShoppingBag,
      consumer: User,
      admin: Shield,
    };
    const Icon = icons[role?.toLowerCase()] || User;
    return <Icon className="w-4 h-4" />;
  };

  const getRoleColor = (role) => {
    const colors = {
      farmer: 'bg-emerald-100 text-emerald-700',
      transporter: 'bg-blue-100 text-blue-700',
      distributor: 'bg-purple-100 text-purple-700',
      retailer: 'bg-orange-100 text-orange-700',
      consumer: 'bg-pink-100 text-pink-700',
      admin: 'bg-red-100 text-red-700',
    };
    return colors[role?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.stakeholderprofile?.role?.toLowerCase().includes(searchLower)
    );
  });

  const roleStats = {
    farmer: users.filter(u => u.stakeholderprofile?.role === 'farmer').length,
    transporter: users.filter(u => u.stakeholderprofile?.role === 'transporter').length,
    distributor: users.filter(u => u.stakeholderprofile?.role === 'distributor').length,
    retailer: users.filter(u => u.stakeholderprofile?.role === 'retailer').length,
    consumer: users.filter(u => u.stakeholderprofile?.role === 'consumer').length,
    admin: users.filter(u => u.stakeholderprofile?.role === 'admin').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage system users and their roles</p>
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
        {Object.entries(roleStats).map(([role, count]) => (
          <div key={role} className={`rounded-lg p-3 md:p-4 border ${getRoleColor(role)}`}>
            <div className="flex items-center gap-2 mb-1">
              {getRoleIcon(role)}
              <span className="text-xs font-medium capitalize">{role}s</span>
            </div>
            <p className="text-xl md:text-2xl font-bold">{count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">All Roles</option>
              <option value="farmer">Farmer</option>
              <option value="transporter">Transporter</option>
              <option value="distributor">Distributor</option>
              <option value="retailer">Retailer</option>
              <option value="consumer">Consumer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by username, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>
      </div>

      {/* Users — Card Layout (no tables, no horizontal scroll) */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-cosmos-800 rounded-2xl border border-emerald-100 dark:border-cosmos-700">
            <Users className="w-12 h-12 text-gray-300 dark:text-cosmos-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-cosmos-400 font-medium">No users found</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="bg-white dark:bg-cosmos-800 rounded-2xl border border-emerald-100 dark:border-cosmos-700 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${getRoleColor(user.stakeholderprofile?.role)}`}>
                  {(user.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{user.username}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleColor(user.stakeholderprofile?.role)}`}>
                      {user.stakeholderprofile?.role || 'N/A'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-cosmos-400 truncate mt-0.5">{user.email}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400 dark:text-cosmos-400">
                    <span>KYC: <span className={`font-medium ${user.stakeholderprofile?.kyc_status === 'approved' ? 'text-green-600' : user.stakeholderprofile?.kyc_status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>{user.stakeholderprofile?.kyc_status || 'pending'}</span></span>
                    <span>Joined: {user.date_joined ? new Date(user.date_joined).toLocaleDateString('en-IN') : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => { setSelectedUser(user); setEditMode(true); }}
                    className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 transition-colors" title="Edit">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleUpdateUser(user.id, { is_active: !user.is_active })}
                    className={`p-2 rounded-lg transition-colors ${user.is_active ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200' : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200'}`}
                    title={user.is_active ? 'Deactivate' : 'Activate'}>
                    {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {selectedUser && editMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit User: {selectedUser.username}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={selectedUser.email}
                  onChange={(e) => selectedUser.email = e.target.value}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization
                </label>
                <input
                  type="text"
                  defaultValue={selectedUser.stakeholderprofile?.organization || ''}
                  onChange={(e) => selectedUser.stakeholderprofile.organization = e.target.value}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  defaultValue={selectedUser.stakeholderprofile?.phone || ''}
                  onChange={(e) => selectedUser.stakeholderprofile.phone = e.target.value}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setEditMode(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateUser(selectedUser.id, {
                  email: selectedUser.email,
                  profile: {
                    organization: selectedUser.stakeholderprofile?.organization,
                    phone: selectedUser.stakeholderprofile?.phone,
                  }
                })}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
