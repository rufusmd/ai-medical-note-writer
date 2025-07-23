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
    ArrowUpDown
} from 'lucide-react';

// Mock types - in real app these would be imported from your types
interface Patient {
    id: string;
    name: string;
    mrn?: string;
    dob?: string;
    gender?: string;
    primaryDiagnosis?: string;
    allergies?: string[];
    currentMedications?: string[];
    phoneNumber?: string;
    primaryClinic: string;
    preferredEMR: string;
    status: string;
    isActive: boolean;
    noteCount: number;
    averageNoteQuality?: number;
    lastVisitDate?: any;
    createdAt: any;
    lastModified: any;
}

interface PatientStats {
    totalPatients: number;
    activePatients: number;
    inactivePatients: number;
    newPatientsThisMonth: number;
    totalNotesGenerated: number;
    averageNotesPerPatient: number;
    clinicBreakdown: Record<string, number>;
    genderBreakdown: Record<string, number>;
}

const PatientManagement: React.FC = () => {
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

    // Mock API calls - replace with actual API calls
    const fetchPatients = async () => {
        setLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock data
            const mockPatients: Patient[] = [
                {
                    id: '1',
                    name: 'Sarah Johnson',
                    mrn: 'MRN001',
                    dob: '1985-06-15',
                    gender: 'female',
                    primaryDiagnosis: 'Major Depressive Disorder',
                    allergies: ['Penicillin'],
                    currentMedications: ['Sertraline 100mg', 'Lorazepam 0.5mg PRN'],
                    phoneNumber: '(555) 123-4567',
                    primaryClinic: 'hmhi-downtown',
                    preferredEMR: 'epic',
                    status: 'active',
                    isActive: true,
                    noteCount: 8,
                    averageNoteQuality: 8.5,
                    lastVisitDate: new Date('2024-01-15'),
                    createdAt: new Date('2023-08-10'),
                    lastModified: new Date('2024-01-15')
                },
                {
                    id: '2',
                    name: 'Michael Chen',
                    mrn: 'MRN002',
                    dob: '1978-03-22',
                    gender: 'male',
                    primaryDiagnosis: 'Generalized Anxiety Disorder',
                    allergies: [],
                    currentMedications: ['Escitalopram 20mg'],
                    phoneNumber: '(555) 987-6543',
                    primaryClinic: 'dbh',
                    preferredEMR: 'credible',
                    status: 'active',
                    isActive: true,
                    noteCount: 12,
                    averageNoteQuality: 9.1,
                    lastVisitDate: new Date('2024-01-10'),
                    createdAt: new Date('2023-05-20'),
                    lastModified: new Date('2024-01-10')
                },
                {
                    id: '3',
                    name: 'Emma Rodriguez',
                    mrn: 'MRN003',
                    dob: '1992-11-08',
                    gender: 'female',
                    primaryDiagnosis: 'Bipolar Disorder Type II',
                    allergies: ['Shellfish', 'Latex'],
                    currentMedications: ['Lamictal 200mg', 'Quetiapine 50mg'],
                    primaryClinic: 'hmhi-downtown',
                    preferredEMR: 'epic',
                    status: 'active',
                    isActive: true,
                    noteCount: 5,
                    averageNoteQuality: 7.8,
                    lastVisitDate: new Date('2023-12-20'),
                    createdAt: new Date('2023-11-01'),
                    lastModified: new Date('2023-12-20')
                }
            ];

            setPatients(mockPatients);
            setFilteredPatients(mockPatients);

            // Mock stats
            setStats({
                totalPatients: 3,
                activePatients: 3,
                inactivePatients: 0,
                newPatientsThisMonth: 1,
                totalNotesGenerated: 25,
                averageNotesPerPatient: 8.3,
                clinicBreakdown: {
                    'hmhi-downtown': 2,
                    'dbh': 1,
                    'other': 0
                },
                genderBreakdown: {
                    male: 1,
                    female: 2,
                    other: 0,
                    'prefer-not-to-say': 0,
                    unspecified: 0
                }
            });

        } catch (err) {
            setError('Failed to load patients');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    // Filter and sort patients
    useEffect(() => {
        let filtered = [...patients];

        // Apply filters
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(term) ||
                (p.mrn && p.mrn.toLowerCase().includes(term)) ||
                (p.primaryDiagnosis && p.primaryDiagnosis.toLowerCase().includes(term))
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(p => p.status === statusFilter);
        }

        if (clinicFilter !== 'all') {
            filtered = filtered.filter(p => p.primaryClinic === clinicFilter);
        }

        if (genderFilter !== 'all') {
            filtered = filtered.filter(p => p.gender === genderFilter);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'name':
                    aValue = a.name;
                    bValue = b.name;
                    break;
                case 'lastVisitDate':
                    aValue = a.lastVisitDate ? new Date(a.lastVisitDate) : new Date(0);
                    bValue = b.lastVisitDate ? new Date(b.lastVisitDate) : new Date(0);
                    break;
                case 'noteCount':
                    aValue = a.noteCount;
                    bValue = b.noteCount;
                    break;
                case 'averageNoteQuality':
                    aValue = a.averageNoteQuality || 0;
                    bValue = b.averageNoteQuality || 0;
                    break;
                default:
                    aValue = new Date(a.lastModified);
                    bValue = new Date(b.lastModified);
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

    const formatLastVisit = (date?: Date) => {
        if (!date) return 'No visits';
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
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
            default: return clinic;
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

    const PatientCard = ({ patient }: { patient: Patient }) => (
        <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors p-6">
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
                <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-2 mb-4">
                {patient.primaryDiagnosis && (
                    <div className="flex items-center text-sm">
                        <AlertCircle className="w-4 h-4 text-orange-500 mr-2" />
                        <span className="text-gray-600">{patient.primaryDiagnosis}</span>
                    </div>
                )}
                <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">{getClinicName(patient.primaryClinic)}</span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span className="text-gray-600">{patient.preferredEMR.toUpperCase()}</span>
                </div>
                <div className="flex items-center text-sm">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
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
                            <div className="font-semibold text-gray-900">{patient.averageNoteQuality.toFixed(1)}</div>
                            <div className="text-xs text-gray-500">Quality</div>
                        </div>
                    )}
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => {
                            setSelectedPatient(patient);
                            setShowPatientDetail(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded">
                        <FileText className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded">
                        <Edit3 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
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
                            <CheckCircle className="w-8 h-8 text-orange-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Avg Notes/Patient</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.averageNotesPerPatient.toFixed(1)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search patients by name, MRN, or diagnosis..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            ? 'Try adjusting your search or filters'
                            : 'Get started by adding your first patient'
                        }
                    </p>
                    {!searchTerm && statusFilter === 'all' && clinicFilter === 'all' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                        >
                            Add Your First Patient
                        </button>
                    )}
                </div>
            )}

            {/* Modals would go here */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">Add New Patient</h2>
                        <p className="text-gray-600 mb-4">Patient creation form would go here...</p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
                                Create Patient
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientManagement;