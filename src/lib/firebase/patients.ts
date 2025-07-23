// src/lib/firebase/patients.ts - Enhanced Patient Service

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    Timestamp,
    writeBatch,
    onSnapshot,
    DocumentSnapshot,
    QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
    Patient,
    PatientCreateRequest,
    PatientUpdateRequest,
    PatientSearchFilters,
    PatientStats,
    PatientValidation
} from '@/types/patient';

export class PatientService {
    private readonly collectionName = 'patients';

    // Create a new patient
    async createPatient(userId: string, patientData: PatientCreateRequest): Promise<Patient> {
        // Validation
        if (!PatientValidation.validateName(patientData.name)) {
            throw new Error('Invalid patient name');
        }

        if (!PatientValidation.validateMRN(patientData.mrn)) {
            throw new Error('Invalid MRN format');
        }

        if (!PatientValidation.validateDOB(patientData.dob)) {
            throw new Error('Invalid date of birth');
        }

        const now = Timestamp.now();

        const patient: Omit<Patient, 'id'> = {
            userId,
            name: patientData.name.trim(),
            mrn: patientData.mrn?.toUpperCase(),
            dob: patientData.dob,
            gender: patientData.gender,
            primaryDiagnosis: patientData.primaryDiagnosis,
            allergies: patientData.allergies || [],
            currentMedications: patientData.currentMedications || [],
            phoneNumber: patientData.phoneNumber,
            emergencyContact: patientData.emergencyContact,
            primaryClinic: patientData.primaryClinic,
            preferredEMR: patientData.preferredEMR,
            treatmentHistory: [],
            status: 'active',
            isActive: true,
            noteCount: 0,
            createdAt: now,
            updatedAt: now,
            lastModified: now
        };

        const docRef = await addDoc(collection(db, this.collectionName), patient);

        return {
            id: docRef.id,
            ...patient
        };
    }

    // Get patient by ID
    async getPatientById(patientId: string): Promise<Patient | null> {
        const docRef = doc(db, this.collectionName, patientId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return {
            id: docSnap.id,
            ...docSnap.data()
        } as Patient;
    }

    // Update patient
    async updatePatient(patientId: string, updateData: PatientUpdateRequest): Promise<Patient> {
        // Validation for updated fields
        if (updateData.name && !PatientValidation.validateName(updateData.name)) {
            throw new Error('Invalid patient name');
        }

        if (updateData.mrn && !PatientValidation.validateMRN(updateData.mrn)) {
            throw new Error('Invalid MRN format');
        }

        if (updateData.dob && !PatientValidation.validateDOB(updateData.dob)) {
            throw new Error('Invalid date of birth');
        }

        const docRef = doc(db, this.collectionName, patientId);

        const updatePayload: any = {
            ...updateData,
            updatedAt: Timestamp.now(),
            lastModified: Timestamp.now()
        };

        // Normalize MRN to uppercase if provided
        if (updateData.mrn) {
            updatePayload.mrn = updateData.mrn.toUpperCase();
        }

        await updateDoc(docRef, updatePayload);

        const updatedDoc = await this.getPatientById(patientId);
        if (!updatedDoc) {
            throw new Error('Patient not found after update');
        }

        return updatedDoc;
    }

    // Soft delete patient (set inactive)
    async deletePatient(patientId: string): Promise<void> {
        const docRef = doc(db, this.collectionName, patientId);
        await updateDoc(docRef, {
            status: 'inactive',
            isActive: false,
            updatedAt: Timestamp.now(),
            lastModified: Timestamp.now()
        });
    }

    // Hard delete patient (completely remove from database)
    async hardDeletePatient(patientId: string): Promise<void> {
        const docRef = doc(db, this.collectionName, patientId);
        await deleteDoc(docRef);
    }

    // Search and filter patients
    async searchPatients(userId: string, filters: PatientSearchFilters = {}): Promise<{
        patients: Patient[];
        hasMore: boolean;
        lastDoc?: DocumentSnapshot;
    }> {
        const constraints: QueryConstraint[] = [
            where('userId', '==', userId)
        ];

        // Apply filters
        if (filters.gender) {
            constraints.push(where('gender', '==', filters.gender));
        }

        if (filters.status) {
            constraints.push(where('status', '==', filters.status));
        }

        if (filters.primaryClinic) {
            constraints.push(where('primaryClinic', '==', filters.primaryClinic));
        }

        // Sorting
        const sortBy = filters.sortBy || 'lastModified';
        const sortOrder = filters.sortOrder || 'desc';
        constraints.push(orderBy(sortBy, sortOrder));

        // Pagination
        const limitCount = filters.limit || 20;
        constraints.push(limit(limitCount + 1)); // Get one extra to check if there are more

        if (filters.lastDoc) {
            constraints.push(startAfter(filters.lastDoc));
        }

        const q = query(collection(db, this.collectionName), ...constraints);
        const querySnapshot = await getDocs(q);

        const patients: Patient[] = [];
        let lastDoc: DocumentSnapshot | undefined;

        querySnapshot.docs.forEach((doc, index) => {
            if (index < limitCount) {
                patients.push({
                    id: doc.id,
                    ...doc.data()
                } as Patient);
                lastDoc = doc;
            }
        });

        // Filter by search term (client-side for name/MRN search)
        let filteredPatients = patients;
        if (filters.searchTerm) {
            const searchTerm = filters.searchTerm.toLowerCase();
            filteredPatients = patients.filter(patient =>
                patient.name.toLowerCase().includes(searchTerm) ||
                (patient.mrn && patient.mrn.toLowerCase().includes(searchTerm))
            );
        }

        const hasMore = querySnapshot.docs.length > limitCount;

        return {
            patients: filteredPatients,
            hasMore,
            lastDoc
        };
    }

    // Get recent patients
    async getRecentPatients(userId: string, limitCount: number = 10): Promise<Patient[]> {
        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId),
            where('isActive', '==', true),
            orderBy('lastModified', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Patient));
    }

    // Get patients needing follow-up
    async getPatientsNeedingFollowUp(userId: string): Promise<Patient[]> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId),
            where('isActive', '==', true),
            where('lastVisitDate', '<', Timestamp.fromDate(thirtyDaysAgo)),
            orderBy('lastVisitDate', 'asc'),
            limit(20)
        );

        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Patient));
    }

    // Update patient's note count and quality
    async updatePatientNoteStats(patientId: string, qualityScore?: number): Promise<void> {
        const docRef = doc(db, this.collectionName, patientId);
        const patient = await this.getPatientById(patientId);

        if (!patient) {
            throw new Error('Patient not found');
        }

        const updateData: any = {
            noteCount: patient.noteCount + 1,
            lastNoteGenerated: Timestamp.now(),
            lastModified: Timestamp.now()
        };

        // Update average quality score
        if (qualityScore !== undefined && qualityScore > 0) {
            if (patient.averageNoteQuality) {
                updateData.averageNoteQuality =
                    (patient.averageNoteQuality * (patient.noteCount) + qualityScore) /
                    (patient.noteCount + 1);
            } else {
                updateData.averageNoteQuality = qualityScore;
            }
        }

        await updateDoc(docRef, updateData);
    }

    // Add treatment history entry
    async addTreatmentHistoryEntry(patientId: string, entry: Omit<TreatmentHistoryEntry, 'id'>): Promise<void> {
        const patient = await this.getPatientById(patientId);
        if (!patient) {
            throw new Error('Patient not found');
        }

        const newEntry = {
            id: `history_${Date.now()}`,
            ...entry
        };

        const updatedHistory = [newEntry, ...(patient.treatmentHistory || [])];

        await updateDoc(doc(db, this.collectionName, patientId), {
            treatmentHistory: updatedHistory,
            lastVisitDate: entry.date,
            lastModified: Timestamp.now()
        });
    }

    // Get patient statistics
    async getPatientStats(userId: string): Promise<PatientStats> {
        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        const patients = querySnapshot.docs.map(doc => doc.data() as Patient);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const stats: PatientStats = {
            totalPatients: patients.length,
            activePatients: patients.filter(p => p.isActive).length,
            inactivePatients: patients.filter(p => !p.isActive).length,
            newPatientsThisMonth: patients.filter(p =>
                p.createdAt.toDate() >= startOfMonth
            ).length,
            totalNotesGenerated: patients.reduce((sum, p) => sum + p.noteCount, 0),
            averageNotesPerPatient: patients.length > 0
                ? patients.reduce((sum, p) => sum + p.noteCount, 0) / patients.length
                : 0,
            clinicBreakdown: {
                'hmhi-downtown': patients.filter(p => p.primaryClinic === 'hmhi-downtown').length,
                'dbh': patients.filter(p => p.primaryClinic === 'dbh').length,
                'other': patients.filter(p => p.primaryClinic === 'other').length
            },
            genderBreakdown: {
                male: patients.filter(p => p.gender === 'male').length,
                female: patients.filter(p => p.gender === 'female').length,
                other: patients.filter(p => p.gender === 'other').length,
                'prefer-not-to-say': patients.filter(p => p.gender === 'prefer-not-to-say').length,
                unspecified: patients.filter(p => !p.gender).length
            }
        };

        return stats;
    }

    // Real-time subscription to patient changes
    subscribeToPatients(userId: string, callback: (patients: Patient[]) => void): () => void {
        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId),
            where('isActive', '==', true),
            orderBy('lastModified', 'desc'),
            limit(50)
        );

        return onSnapshot(q, (querySnapshot) => {
            const patients = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Patient));

            callback(patients);
        });
    }

    // Batch operations
    async batchUpdatePatients(updates: Array<{ id: string; data: PatientUpdateRequest }>): Promise<void> {
        const batch = writeBatch(db);

        for (const update of updates) {
            const docRef = doc(db, this.collectionName, update.id);
            batch.update(docRef, {
                ...update.data,
                updatedAt: Timestamp.now(),
                lastModified: Timestamp.now()
            });
        }

        await batch.commit();
    }
}

// Export singleton instance
export const patientService = new PatientService();