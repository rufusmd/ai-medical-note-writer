import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    User,
    ChevronDown,
    Check,
    Plus,
    Calendar,
    MapPin,
    AlertCircle,
    X,
    Clock,
    FileText
} from 'lucide-react';

// Mock types - in real app these would be imported
interface Patient {
    id: string;
    name: string;
    mrn?: string;
    dob?: string;
    gender?: string;
    primaryDiagnosis?: string;
    allergies?: string[];
    currentMedications?: string[];
    primaryClinic: string;
    preferredEMR: string;
    status: string;
    noteCount: number;
    averageNoteQuality?: number;
    lastVisitDate?: Date;
    treatmentHistory?: Array<{
        date: Date;
        visitType: string;
        summary: string;
    }>;
}

interface PatientContext {
    id: string;
    name: string;
    age?: number;
    gender?: string;
    primaryDiagnosis?: string;
    currentMedications?: string[];
    allergies?: string[];
    lastVisitSummary?: string;
    ongoingConcerns?: string[];
    preferredEMR: string;
}

interface PatientSelectorProps {
    selectedPatient?: Patient | null;
    onPatientSelect: (patient: Patient | null) => void;
    onPatientContextChange?: (context: PatientContext | null) => void;
    showCreateOption?: boolean;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

const PatientSelector: React.FC<PatientSelectorProps> = ({
    selectedPatient,
    onPatientSelect,
    onPatientContextChange,
    showCreateOption = true,
    placeholder = "Search for a patient...",
    className = "",
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Mock patients data
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
            primaryClinic: 'hmhi-downtown',
            preferredEMR: 'epic',
            status: 'active',
            noteCount: 8,
            averageNoteQuality: 8.5,
            lastVisitDate: new Date('2024-01-15'),
            treatmentHistory: [
                {
                    date: new Date('2024-01-15'),
                    visitType: 'follow-up',
                    summary: 'Patient reports improved mood on current medication regimen. Sleep quality has improved significantly.'
                }
            ]
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
            primaryClinic: 'dbh',
            preferredEMR: 'credible',
            status: 'active',
            noteCount: 12,
            averageNoteQuality: 9.1,
            lastVisitDate: new Date('2024-01-10'),
            treatmentHistory: [
                {
                    date: new Date('2024-01-10'),
                    visitType: 'medication-review',
                    summary: 'Anxiety symptoms well controlled. Patient tolerating medication well with minimal side effects.'
                }
            ]
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
            noteCount: 5,
            averageNoteQuality: 7.8,
            lastVisitDate: new Date('2023-12-20'),
            treatmentHistory: [
                {
                    date: new Date('2023-12-20'),
                    visitType: 'crisis',
                    summary: 'Patient experienced mild hypomanic episode. Medication adjustment discussed.'
                }
            ]
        }
    ];

    // Initialize with mock data
    useEffect(() => {
        setPatients(mockPatients);
        setRecentPatients(mockPatients.slice(0, 3));
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter patients based on search term
    const filteredPatients = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.mrn && patient.mrn.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (patient.primaryDiagnosis && patient.primaryDiagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const calculateAge = (dob?: string) => {
        if (!dob) return undefined;
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
        if (!date) return 'No previous visits';

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

    const generatePatientContext = (patient: Patient): PatientContext => {
        return {
            id: patient.id,
            name: patient.name,
            age: calculateAge(patient.dob),
            gender: patient.gender,
            primaryDiagnosis: patient.primaryDiagnosis,
            currentMedications: patient.currentMedications || [],
            allergies: patient.allergies || [],
            lastVisitSummary: patient.treatmentHistory?.[0]?.summary,
            ongoingConcerns: [], // Could be extracted from recent notes
            preferredEMR: patient.preferredEMR as 'epic' | 'credible'
        };
    };

    const handlePatientSelect = (patient: Patient) => {
        onPatientSelect(patient);
        if (onPatientContextChange) {
            onPatientContextChange(generatePatientContext(patient));
        }
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClearSelection = () => {
        onPatientSelect(null);
        if (onPatientContextChange) {
            onPatientContextChange(null);
        }
        setSearchTerm('');
    };

    const PatientOption = ({ patient, isRecent = false }: { patient: Patient; isRecent?: boolean }) => (
        <div
            onClick={() => handlePatientSelect(patient)}
            className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900 truncate">{patient.name}</h3>
                            {patient.mrn && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {patient.mrn}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center space-x-2 mt-1">
                            {patient.gender && calculateAge(patient.dob) && (
                                <span className="text-sm text-gray-600">
                                    {patient.gender} • {calculateAge(patient.dob)} years
                                </span>
                            )}
                        </div>

                        {patient.primaryDiagnosis && (
                            <div className="flex items-center mt-2">
                                <AlertCircle className="w-4 h-4 text-orange-500 mr-1" />
                                <span className="text-sm text-gray-600 truncate">{patient.primaryDiagnosis}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center text-sm text-gray-500">
                                <MapPin className="w-4 h-4 mr-1" />
                                <span>{getClinicName(patient.primaryClinic)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                                <Clock className="w-4 h-4 mr-1" />
                                <span>{formatLastVisit(patient.lastVisitDate)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-right ml-4">
                    <div className="text-sm font-medium text-gray-900">{patient.noteCount}</div>
                    <div className="text-xs text-gray-500">notes</div>
                    {patient.averageNoteQuality && (
                        <div className="text-xs text-gray-500 mt-1">
                            {patient.averageNoteQuality.toFixed(1)} quality
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Main Input */}
            <div className="relative">
                {selectedPatient ? (
                    // Selected Patient Display
                    <div className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{selectedPatient.name}</div>
                                <div className="text-sm text-gray-600">
                                    {selectedPatient.mrn && `${selectedPatient.mrn} • `}
                                    {getClinicName(selectedPatient.primaryClinic)}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleClearSelection}
                            className="p-1 hover:bg-blue-200 rounded transition-colors"
                            disabled={disabled}
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                ) : (
                    // Search Input
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={placeholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setIsOpen(true)}
                            disabled={disabled}
                            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    </div>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {/* Recent Patients (when no search term) */}
                    {!searchTerm && recentPatients.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                <div className="flex items-center space-x-2">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700">Recent Patients</span>
                                </div>
                            </div>
                            {recentPatients.map(patient => (
                                <PatientOption key={`recent-${patient.id}`} patient={patient} isRecent />
                            ))}
                        </div>
                    )}

                    {/* Search Results */}
                    {searchTerm && (
                        <div>
                            {filteredPatients.length > 0 ? (
                                <div>
                                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                        <div className="flex items-center space-x-2">
                                            <Search className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">
                                                {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} found
                                            </span>
                                        </div>
                                    </div>
                                    {filteredPatients.map(patient => (
                                        <PatientOption key={patient.id} patient={patient} />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <h3 className="text-sm font-medium text-gray-900 mb-1">No patients found</h3>
                                    <p className="text-sm text-gray-600">
                                        No patients match "{searchTerm}"
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Create New Patient Option */}
                    {showCreateOption && searchTerm && filteredPatients.length === 0 && (
                        <div className="border-t border-gray-200">
                            <button className="w-full p-4 text-left hover:bg-blue-50 transition-colors">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                        <Plus className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">Create new patient</div>
                                        <div className="text-sm text-gray-600">Add "{searchTerm}" as a new patient</div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* No patients at all */}
                    {!searchTerm && recentPatients.length === 0 && (
                        <div className="p-8 text-center">
                            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-sm font-medium text-gray-900 mb-1">No patients yet</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Start by creating your first patient record
                            </p>
                            {showCreateOption && (
                                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                                    Create Patient
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Patient Context Summary (when patient is selected) */}
            {selectedPatient && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Patient Context for AI</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <FileText className="w-4 h-4" />
                            <span>{selectedPatient.noteCount} previous notes</span>
                        </div>
                    </div>

                    <div className="space-y-2 text-sm">
                        {selectedPatient.primaryDiagnosis && (
                            <div>
                                <span className="font-medium text-gray-700">Diagnosis:</span>
                                <span className="ml-2 text-gray-600">{selectedPatient.primaryDiagnosis}</span>
                            </div>
                        )}

                        {selectedPatient.currentMedications && selectedPatient.currentMedications.length > 0 && (
                            <div>
                                <span className="font-medium text-gray-700">Current Medications:</span>
                                <span className="ml-2 text-gray-600">{selectedPatient.currentMedications.join(', ')}</span>
                            </div>
                        )}

                        {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                            <div>
                                <span className="font-medium text-gray-700">Allergies:</span>
                                <span className="ml-2 text-gray-600">{selectedPatient.allergies.join(', ')}</span>
                            </div>
                        )}

                        {selectedPatient.treatmentHistory && selectedPatient.treatmentHistory.length > 0 && (
                            <div>
                                <span className="font-medium text-gray-700">Last Visit:</span>
                                <span className="ml-2 text-gray-600">{selectedPatient.treatmentHistory[0].summary}</span>
                            </div>
                        )}

                        <div className="flex items-center space-x-4 pt-2 border-t border-gray-200">
                            <div>
                                <span className="font-medium text-gray-700">EMR:</span>
                                <span className="ml-2 text-gray-600">{selectedPatient.preferredEMR.toUpperCase()}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Last Visit:</span>
                                <span className="ml-2 text-gray-600">{formatLastVisit(selectedPatient.lastVisitDate)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientSelector;