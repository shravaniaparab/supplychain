import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Building, MapPin, FileText, ArrowLeft } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const ProfilePage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await authAPI.me();
            const data = response.data;
            setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading profile...</div>
                </div>
            </MainLayout>
        );
    }

    if (!profile) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <p className="text-gray-500">Profile not found</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                            <p className="text-gray-600">Manage your account information</p>
                        </div>
                    </div>
                </div>

                {/* Profile Card */}
                <div className="card p-6">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                {profile.user?.first_name || profile.user?.last_name
                                    ? `${profile.user?.first_name} ${profile.user?.last_name}`.trim()
                                    : profile.user?.username}
                            </h2>
                            <p className="text-sm text-gray-500">{profile.role || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Profile Information - Read Only */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <User className="w-4 h-4 inline mr-2" />
                                First Name
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                                {profile.user?.first_name || 'N/A'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <User className="w-4 h-4 inline mr-2" />
                                Last Name
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                                {profile.user?.last_name || 'N/A'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Mail className="w-4 h-4 inline mr-2" />
                                Email Address
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                                {profile.user?.email || 'N/A'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <User className="w-4 h-4 inline mr-2" />
                                Username
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                                {profile.user?.username || 'N/A'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <FileText className="w-4 h-4 inline mr-2" />
                                KYC Status
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${profile.kyc_status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                        profile.kyc_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                            profile.kyc_status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                    }`}>
                                    {profile.kyc_status || 'N/A'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Role
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 capitalize">
                                {profile.role || 'N/A'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Building className="w-4 h-4 inline mr-2" />
                                Organization / Farm Name
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                                {profile.profile?.organization || 'N/A'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <MapPin className="w-4 h-4 inline mr-2" />
                                Location / Address
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                                {profile.profile?.address || 'N/A'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                                {profile.profile?.phone || 'N/A'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Wallet ID
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono text-xs">
                                {profile.profile?.wallet_id || 'Not connected'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default ProfilePage;
