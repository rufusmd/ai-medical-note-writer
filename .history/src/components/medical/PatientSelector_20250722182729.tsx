"use client";

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
import { useAuth } from '@/contexts/AuthContext';
import { patientService } from '@/lib/firebase/patients';
import { Patient } from '@/types/patient';

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
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load patients from Firebase
    useEffect(() => {
        if (!user?.uid) return;

        const loadPatients = async () => {
            setLoading(true);
            try {
                const userPatients = await patientService.getPatientsByUser(user.uid);
                setPatients(userPatients);

                // Set recent patients (last 5 with recent notes)
                const recent = userPatients
                    .filter(p => p.lastNoteGenerated)
                    .sort((a, b) => {
                        const aTime = a.lastNoteGenerated?.toMillis() || 0;
                        const bTime = b.lastNoteGenerated?.toMillis() || 0;
                        return bTime - aTime;
                    })
                    .slice(0, 5);
                setRecentPatients(recent);
            } catch (error) {
                console.error('Error loading patients:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPatients();
    }, [user?.uid]);

    // Real-time subscription to patient changes
    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = patientService.subscribeToPatients(user.uid, (updatedPatients) => {
            setPatients(updatedPatients);

            // Update recent patients
            const recent = updatedPatients
                .filter(p => p.lastNoteGenerated)
                .sort((a, b) => {
                    const aTime = a.lastNoteGenerated?.toMillis() || 0;
                    const bTime = b.lastNoteGenerated?.toMillis() || 0;
                    return bTime - aTime;
                })
                .slice(0, 5);
            setRecentPatients(recent);
        });

        return unsubscribe;
    }, [user?.uid]);

    // Filter patients based on search term
    const filteredPatients = patients.filter(patient => {
        if (!searchTerm) return true;

        const term = searchTerm.toLowerCase();
        return (
            patient.name.toLowerCase().includes(term) ||
            patient.mrn?.toLowerCase().includes(term) ||
            patient.primaryDiagnosis?.toLowerCase().includes(term)
        );
    });

    // Calculate age from date of birth
    const calculateAge = (dob?: string): number | undefined => {
        if (!dob) return undefined;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age;
    };

    // Convert Patient to PatientContext
    const convertToPatientContext = (patient: Patient): PatientContext => {
        return {
            id: patient.id,
            name: patient.name,
            age: calculateAge(patient.dob),
            gender: patient.gender,
            primaryDiagnosis: patient.primaryDiagnosis,
            currentMedications: patient.currentMedications || [],
            allergies: patient.allergies || [],
            lastVisitSummary: patient.treatmentHistory?.[0]?.summary,
            ongoingConcerns: [], // Could be extracted from treatment history
            preferredEMR: patient.preferredEMR
        };
    };

    const handlePatientSelect = (patient: Patient | null) => {
        onPatientSelect(patient);
        if (patient) {
            const context = convertToPatientContext(patient);
            onPatientContextChange?.(context);
            setSearchTerm(patient.name);
        } else {
            onPatientContextChange?.(null);
            setSearchTerm('');
        }
        setIsOpen(false);
    };

    const handleClearSelection = () => {
        handlePatientSelect(null);
    };

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

    const getPatientDisplayInfo = (patient: Patient) => {
        const age = calculateAge(patient.dob);
        const ageText = age ? ` (${age}y)` : '';
        const mrnText = patient.mrn ? ` • MRN: ${patient.mrn}` : '';
        const clinicMap = {
            'hmhi-downtown': 'HMHI Downtown',
            'dbh': 'Davis Behavioral Health',
            'other': 'Other Clinic'
        };

        return {
            displayName: `${patient.name}${ageText}`,
            subtitle: `${clinicMap[patient.primaryClinic]}${mrnText}`,
            diagnosis: patient.primaryDiagnosis,
            noteCount: patient.noteCount,
            lastVisit: patient.lastVisitDate
        };
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Input Field */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    className={`
                        w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
                        ${selectedPatient ? 'text-gray-900' : 'text-gray-500'}
                    `}
                    placeholder={selectedPatient ? selectedPatient.name : placeholder}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    disabled={disabled}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 space-x-1">
                    {selectedPatient && !disabled && (
                        <button
                            onClick={handleClearSelection}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                            title="Clear selection"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        disabled={disabled}
                    >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Selected Patient Summary */}
            {selectedPatient && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="h-4 w-4 text-blue-600" />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    {getPatientDisplayInfo(selectedPatient).displayName}
                                </p>
                                <p className="text-xs text-gray-600">
                                    {getPatientDisplayInfo(selectedPatient).subtitle}
                                </p>
                                {selectedPatient.primaryDiagnosis && (
                                    <p className="text-xs text-blue-700 mt-1">
                                        Dx: {selectedPatient.primaryDiagnosis}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center text-xs text-gray-500">
                                <FileText className="h-3 w-3 mr-1" />
                                {selectedPatient.noteCount} notes
                            </div>
                            {selectedPatient.averageNoteQuality && (
                                <div className="text-xs text-gray-500 mt-1">
                                    Avg Quality: {selectedPatient.averageNoteQuality.toFixed(1)}/10
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
                    {loading ? (
                        <div className="p-4 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-sm text-gray-500 mt-2">Loading patients...</p>
                        </div>
                    ) : (
                        <>
                            {/* Recent Patients Section */}
                            {!searchTerm && recentPatients.length > 0 && (
                                <div className="border-b border-gray-100">
                                    <div className="px-3 py-2 bg-gray-50">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Recent Patients
                                        </p>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {recentPatients.map((patient) => {
                                            const info = getPatientDisplayInfo(patient);
                                            return (
                                                <button
                                                    key={patient.id}
                                                    onClick={() => handlePatientSelect(patient)}
                                                    className="w-full px-3 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-b-0"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="flex-shrink-0">
                                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                                <Clock className="h-4 w-4 text-green-600" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {info.displayName}
                                                            </p>
                                                            <p className="text-xs text-gray-600">
                                                                {info.subtitle}
                                                            </p>
                                                            {info.diagnosis && (
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {info.diagnosis}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center text-xs text-gray-500">
                                                            <FileText className="h-3 w-3 mr-1" />
                                                            {info.noteCount}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Search Results */}
                            <div className="max-h-64 overflow-y-auto">
                                {searchTerm && (
                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Search Results ({filteredPatients.length})
                                        </p>
                                    </div>
                                )}

                                {filteredPatients.length === 0 ? (
                                    <div className="p-4 text-center">
                                        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">
                                            {searchTerm ? 'No patients found matching your search' : 'No patients found'}
                                        </p>
                                        {showCreateOption && (
                                            <button
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    // Navigate to patient creation
                                                    window.location.href = '/dashboard/patients?action=create';
                                                }}
                                                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                                            >
                                                Create new patient
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    filteredPatients.map((patient) => {
                                        const info = getPatientDisplayInfo(patient);
                                        const isSelected = selectedPatient?.id === patient.id;

                                        return (
                                            <button
                                                key={patient.id}
                                                onClick={() => handlePatientSelect(patient)}
                                                className={`
                                                    w-full px-3 py-3 text-left hover:bg-gray-50 
                                                    flex items-center justify-between
                                                    border-b border-gray-50 last:border-b-0
                                                    ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
                                                `}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex-shrink-0">
                                                        <div className={`
                                                            w-8 h-8 rounded-full flex items-center justify-center
                                                            ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}
                                                        `}>
                                                            {isSelected ? (
                                                                <Check className="h-4 w-4 text-blue-600" />
                                                            ) : (
                                                                <User className="h-4 w-4 text-gray-600" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {info.displayName}
                                                        </p>
                                                        <p className="text-xs text-gray-600">
                                                            {info.subtitle}
                                                        </p>
                                                        {info.diagnosis && (
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Dx: {info.diagnosis}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center text-xs text-gray-500">
                                                        <FileText className="h-3 w-3 mr-1" />
                                                        {info.noteCount} notes
                                                    </div>
                                                    {patient.status === 'active' && (
                                                        <div className="flex items-center text-xs text-green-600 mt-1">
                                                            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                                                            Active
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            {/* Create New Patient Option */}
                            {showCreateOption && searchTerm && filteredPatients.length === 0 && (
                                <div className="border-t border-gray-100">
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            window.location.href = `/dashboard/patients?action=create&name=${encodeURIComponent(searchTerm)}`;
                                        }}
                                        className="w-full px-3 py-3 text-left hover:bg-gray-50 flex items-center space-x-3"
                                    >
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                <Plus className="h-4 w-4 text-green-600" />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                Create new patient
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                Create "{searchTerm}" as a new patient
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default PatientSelector;