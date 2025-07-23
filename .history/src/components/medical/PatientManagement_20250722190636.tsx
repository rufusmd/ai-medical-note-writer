"use client";

import React, { useState, useEffect } from 'react';
import {
    Search,
    Plus,
    Filter,
    Users,
    Calendar,
    FileText,
    Trash2,
    Edit3,
    Phone,
    MapPin,
    AlertCircle,
    CheckCircle,
    User,
    Activity,
    Clock,
    Eye,
    MoreHorizontal,
    ArrowUpDown,
    X,
    PenTool,
    Edit,
    Star
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { patientService } from '@/lib/firebase/patients';
import { Patient, PatientStats } from '@/types/patient';
import PatientCreationForm from './PatientCreationForm';

// Debug logging
console.log('🔍 Debugging PatientManagement imports:');
console.log('- patientService:', patientService);
console.log('- patientService.getPatientsByUser:', patientService?.getPatientsByUser);
console.log('- typeof getPatientsByUser:', typeof patientService?.getPatientsByUser);

const PatientManagement: React.FC = () => {
    const router = useRouter();
    const { user } = useAuth();

    // State management
    const [patients, setPatients] = useState<Patient[]>([]);
    const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<PatientStats | null>(null);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [clinicFilter, setClinicFilter] = useState<string>('all');
    const [genderFilter, setGenderFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('lastModified');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [showPatientDetail, setShowPatientDetail] = useState(false);

    // Load patients from Firebase
    const fetchPatients = async () => {
        if (!user?.uid) {
            console.log('🚫 No user ID available for fetching patients');
            setLoading(false);
            return;
        }

        console.log('🔍 Debug - About to call patientService.getPatientsByUser');
        console.log('- user.uid:', user.uid);
        console.log('- patientService:', patientService);
        console.log('- method exists:', typeof patientService.getPatientsByUser);

        setLoading(true);
        try {
            console.log('📞 Calling patientService.getPatientsByUser...');
            const userPatients = await patientService.getPatientsByUser(user.uid);
            console.log('✅ Successfully fetched patients:', userPatients);
            setPatients(userPatients);

            console.log('📊 Fetching patient statistics...');
            const patientStats = await patientService.getPatientStatistics(user.uid);
            console.log('✅ Successfully fetched stats:', patientStats);
            setStats(patientStats);
        } catch (error) {
            console.error('❌ Error loading patients:', error);
            setError('Failed to load patients: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    // Real-time subscription to patient changes
    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = patientService.subscribeToPatients(user.uid, (updatedPatients) => {
            setPatients(updatedPatients);
        });

        return unsubscribe;
    }, [user?.uid]);

    // Initial load
    useEffect(() => {
        fetchPatients();
    }, [user?.uid]);

    // Filter and sort patients
    useEffect(() => {
        let filtered = patients.filter(patient => {
            const matchesSearch = !searchTerm ||
                patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                patient.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                patient.primaryDiagnosis?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
            const matchesClinic = clinicFilter === 'all' || patient.primaryClinic === clinicFilter;
            const matchesGender = genderFilter === 'all' || patient.gender === genderFilter;

            return matchesSearch && matchesStatus && matchesClinic && matchesGender;
        });

        // Sort patients
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'lastVisitDate':
                    aValue = a.lastVisitDate?.toMillis() || 0;
                    bValue = b.lastVisitDate?.toMillis() || 0;
                    break;
                case 'noteCount':
                    aValue = a.noteCount;
                    bValue = b.noteCount;
                    break;
                case 'averageNoteQuality':
                    aValue = a.averageNoteQuality || 0;
                    bValue = b.averageNoteQuality || 0;
                    break;
                default: // lastModified
                    aValue = a.lastModified?.toMillis() || 0;
                    bValue = b.lastModified?.toMillis() || 0;
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredPatients(filtered);
    }, [patients, searchTerm, statusFilter, clinicFilter, genderFilter, sortBy, sortOrder]);

    const calculateAge = (dob?: string) => {
        if (!dob) return null;
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const formatLastVisit = (date?: any) => {
        if (!date) return 'No visits';

        const visitDate = date.toDate ? date.toDate() : new Date(date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - visitDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        return `${Math.ceil(diffDays / 30)} months ago`;
    };

    const getClinicName = (clinic: string) => {
        switch (clinic) {
            case 'hmhi-downtown': return 'HMHI Downtown';
            case 'dbh': return 'Davis Behavioral Health';
            default: return 'Other Clinic';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'inactive': return 'bg-gray-100 text-gray-800';
            case 'transferred': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Navigate to note generation with patient pre-selected
    const handleGenerateNote = (patient: Patient) => {
        router.push(`/dashboard/notes?action=create&patient=${patient.id}`);
    };

    // Navigate to patient edit
    const handleEditPatient = (patient: Patient) => {
        // You can implement patient editing modal or navigation here
        console.log('Edit patient:', patient.id);
    };

    const PatientCard = ({ patient }: { patient: Patient }) => (
        <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 p-6 shadow-sm hover:shadow-md">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                        {patient.mrn && (
                            <p className="text-sm text-gray-500">MRN: {patient.mrn}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                                {patient.status}
                            </span>
                            <span className="text-xs text-gray-500">
                                {patient.gender && `${patient.gender} • `}
                                {calculateAge(patient.dob) && `${calculateAge(patient.dob)} years`}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => handleEditPatient(patient)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit patient"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                {patient.primaryDiagnosis && (
                    <div className="flex items-center text-sm">
                        <AlertCircle className="w-4 h-4 text-orange-500 mr-2 flex-shrink-0" />
                        <span className="text-gray-600 truncate">{patient.primaryDiagnosis}</span>
                    </div>
                )}
                <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="text-gray-600">{getClinicName(patient.primaryClinic)}</span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span className="text-gray-600">{patient.preferredEMR.toUpperCase()}</span>
                </div>
                <div className="flex items-center text-sm">
                    <Clock className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="text-gray-600">Last visit: {formatLastVisit(patient.lastVisitDate)}</span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-4">
                    <div className="text-center">
                        <div className="font-semibold text-gray-900">{patient.noteCount}</div>
                        <div className="text-xs text-gray-500">Notes</div>
                    </div>
                    {patient.averageNoteQuality && (
                        <div className="text-center">
                            <div className="flex items-center">
                                <Star className="w-3 h-3 text-yellow-400 mr-1" />
                                <span className="font-semibold text-gray-900">
                                    {patient.averageNoteQuality.toFixed(1)}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500">Quality</div>
                        </div>
                    )}
                </div>

                {/* Subtle Action Icons */}
                <div className="flex items-center space-x-1">
                    <div className="relative group">
                        <button
                            onClick={() => handleGenerateNote(patient)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200 group-hover:scale-105"
                            title="Generate note for this patient"
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                            Generate Note
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                        </div>
                    </div>
                    <div className="relative group">
                        <button
                            onClick={() => setSelectedPatient(patient)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-all duration-200 group-hover:scale-105"
                            title="View patient details"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                            View Details
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                        </div>
                    </div>
                    <div className="relative group">
                        <button
                            onClick={() => handleEditPatient(patient)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-all duration-200 group-hover:scale-105"
                            title="Edit patient"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                            Edit Patient
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error Loading Patients</h3>
                            <p className="mt-2 text-sm text-red-700">{error}</p>
                            <button
                                onClick={fetchPatients}
                                className="mt-3 text-sm text-red-800 hover:text-red-900 underline"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Patient Management</h1>
                        <p className="text-gray-600 mt-1">Manage your patient records and clinical data</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Patient</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center">
                            <Users className="w-8 h-8 text-blue-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center">
                            <Activity className="w-8 h-8 text-green-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Active Patients</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.activePatients}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center">
                            <FileText className="w-8 h-8 text-purple-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Notes Generated</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalNotesGenerated}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center">
                            <Calendar className="w-8 h-8 text-orange-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Avg Notes/Patient</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.averageNotesPerPatient.toFixed(1)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex-1 max-w-lg">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search patients by name, MRN, or diagnosis..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center space-x-4">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="transferred">Transferred</option>
                        </select>

                        <select
                            value={clinicFilter}
                            onChange={(e) => setClinicFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="all">All Clinics</option>
                            <option value="hmhi-downtown">HMHI Downtown</option>
                            <option value="dbh">Davis Behavioral Health</option>
                            <option value="other">Other</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="lastModified">Last Modified</option>
                            <option value="name">Name</option>
                            <option value="lastVisitDate">Last Visit</option>
                            <option value="noteCount">Note Count</option>
                            <option value="averageNoteQuality">Quality Score</option>
                        </select>

                        <button
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <ArrowUpDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between">
                <p className="text-gray-600">
                    Showing {filteredPatients.length} of {patients.length} patients
                </p>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setViewMode('cards')}
                        className={`p-2 rounded ${viewMode === 'cards' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Users className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <FileText className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Patient Grid */}
            {filteredPatients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPatients.map(patient => (
                        <PatientCard key={patient.id} patient={patient} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
                    <p className="text-gray-600 mb-4">
                        {searchTerm || statusFilter !== 'all' || clinicFilter !== 'all'
                            ? 'Try adjusting your search criteria or filters'
                            : 'Get started by adding your first patient'
                        }
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Patient</span>
                    </button>
                </div>
            )}

            {/* Patient Creation Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Add New Patient</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <PatientCreationForm
                            onPatientCreated={(newPatient) => {
                                setPatients(prev => [newPatient, ...prev]);
                                setShowCreateModal(false);
                            }}
                            onCancel={() => setShowCreateModal(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientManagement;