// src/types/patient.ts - Enhanced Clinical Patient Management

import { Timestamp } from 'firebase/firestore';

export interface Patient {
    id: string;
    userId: string; // The clinician who created this patient record

    // Basic Demographics (HIPAA-compliant)
    name: string;
    mrn?: string; // Medical Record Number (optional)
    dob?: string; // Date of birth (YYYY-MM-DD format)
    gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';

    // Clinical Information
    primaryDiagnosis?: string;
    allergies?: string[];
    currentMedications?: string[];

    // Contact & Emergency (Optional for AI note generation)
    phoneNumber?: string;
    emergencyContact?: {
        name: string;
        relationship: string;
        phone: string;
    };

    // Clinical Settings
    primaryClinic: 'hmhi-downtown' | 'dbh' | 'other';
    preferredEMR: 'epic' | 'credible';

    // Treatment History (for AI context)
    treatmentHistory?: TreatmentHistoryEntry[];
    lastVisitDate?: Timestamp;
    nextAppointmentDate?: Timestamp;

    // System Fields
    status: 'active' | 'inactive' | 'transferred';
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastModified: Timestamp; // For Firebase queries

    // AI Enhancement Fields
    noteCount: number; // How many notes generated for this patient
    averageNoteQuality?: number; // Average AI quality score
    lastNoteGenerated?: Timestamp;
}

export interface TreatmentHistoryEntry {
    id: string;
    date: Timestamp;
    visitType: 'initial-consultation' | 'follow-up' | 'crisis' | 'medication-review' | 'therapy-session';
    provider: string;
    summary: string;
    medications?: string[];
    diagnosisChanges?: string[];
}

export interface PatientCreateRequest {
    name: string;
    mrn?: string;
    dob?: string;
    gender?: Patient['gender'];
    primaryDiagnosis?: string;
    allergies?: string[];
    currentMedications?: string[];
    phoneNumber?: string;
    emergencyContact?: Patient['emergencyContact'];
    primaryClinic: Patient['primaryClinic'];
    preferredEMR: Patient['preferredEMR'];
}

export interface PatientUpdateRequest extends Partial<PatientCreateRequest> {
    status?: Patient['status'];
    isActive?: boolean;
}

export interface PatientSearchFilters {
    searchTerm?: string; // Search by name or MRN
    gender?: Patient['gender'];
    status?: Patient['status'];
    primaryClinic?: Patient['primaryClinic'];
    sortBy?: 'name' | 'lastModified' | 'lastVisitDate' | 'noteCount';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    lastDoc?: any; // For pagination
}

export interface PatientStats {
    totalPatients: number;
    activePatients: number;
    inactivePatients: number;
    newPatientsThisMonth: number;
    totalNotesGenerated: number;
    averageNotesPerPatient: number;
    clinicBreakdown: {
        'hmhi-downtown': number;
        'dbh': number;
        'other': number;
    };
    genderBreakdown: {
        male: number;
        female: number;
        other: number;
        'prefer-not-to-say': number;
        unspecified: number;
    };
}

// Basic validation helpers
export const PatientValidation = {
    validateName: (name?: string): boolean => {
        return !!name && name.trim().length >= 2 && name.trim().length <= 100;
    },

    validateMRN: (mrn?: string): boolean => {
        if (!mrn) return true; // MRN is optional
        return /^[A-Z0-9]{3,20}$/i.test(mrn.trim());
    },

    validateDOB: (dob?: string): boolean => {
        if (!dob) return true; // DOB is optional
        const date = new Date(dob);
        const now = new Date();
        const minDate = new Date(now.getFullYear() - 120, 0, 1); // 120 years ago
        return date >= minDate && date <= now;
    }
};

// Patient context for AI note generation
export interface PatientContext {
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