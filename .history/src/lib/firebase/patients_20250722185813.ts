// src/lib/firebase/patients.ts - Clean Firebase Service Only

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
    Timestamp,
    writeBatch,
    onSnapshot,
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
        try {
            const docRef = doc(db, this.collectionName, patientId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            return {
                id: docSnap.id,
                ...docSnap.data()
            } as Patient;
        } catch (error) {
            console.error('Error getting patient by ID:', error);
            throw error;
        }
    }

    // Get all patients for a specific user - THE MISSING METHOD!
    async getPatientsByUser(userId: string): Promise<Patient[]> {
        try {
            console.log('🔍 getPatientsByUser called with userId:', userId);

            const q = query(
                collection(db, this.collectionName),
                where('userId', '==', userId),
                where('isActive', '==', true),
                orderBy('lastModified', 'desc')
            );

            console.log('📋 Executing Firebase query...');
            const querySnapshot = await getDocs(q);

            const patients = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Patient));

            console.log('✅ Successfully fetched patients:', patients.length);
            return patients;
        } catch (error) {
            console.error('❌ Error in getPatientsByUser:', error);
            throw error;
        }
    }

    // Search patients with filters
    async searchPatients(userId: string, filters: PatientSearchFilters): Promise<Patient[]> {
        try {
            const constraints: QueryConstraint[] = [
                where('userId', '==', userId),
                where('isActive', '==', true)
            ];

            // Add status filter
            if (filters.status && filters.status !== 'active') {
                constraints.push(where('status', '==', filters.status));
            }

            // Add clinic filter
            if (filters.primaryClinic) {
                constraints.push(where('primaryClinic', '==', filters.primaryClinic));
            }

            // Add gender filter
            if (filters.gender) {
                constraints.push(where('gender', '==', filters.gender));
            }

            // Add sorting
            const sortField = filters.sortBy || 'lastModified';
            const sortDirection = filters.sortOrder || 'desc';
            constraints.push(orderBy(sortField, sortDirection));

            // Add limit
            if (filters.limit) {
                constraints.push(limit(filters.limit));
            }

            const q = query(collection(db, this.collectionName), ...constraints);
            const querySnapshot = await getDocs(q);

            let patients = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Patient));

            // Apply client-side text search (since Firestore doesn't support full-text search)
            if (filters.searchTerm) {
                const searchTerm = filters.searchTerm.toLowerCase();
                patients = patients.filter(patient =>
                    patient.name.toLowerCase().includes(searchTerm) ||
                    patient.mrn?.toLowerCase().includes(searchTerm) ||
                    patient.primaryDiagnosis?.toLowerCase().includes(searchTerm)
                );
            }

            return patients;
        } catch (error) {
            console.error('Error searching patients:', error);
            throw error;
        }
    }

    // Update patient
    async updatePatient(patientId: string, updateData: PatientUpdateRequest): Promise<Patient> {
        try {
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

            const updateFields = {
                ...updateData,
                updatedAt: Timestamp.now(),
                lastModified: Timestamp.now()
            };

            await updateDoc(docRef, updateFields);

            // Return updated patient
            const updatedDoc = await getDoc(docRef);
            return {
                id: updatedDoc.id,
                ...updatedDoc.data()
            } as Patient;
        } catch (error) {
            console.error('Error updating patient:', error);
            throw error;
        }
    }

    // Soft delete patient (set isActive to false)
    async deletePatient(patientId: string): Promise<void> {
        try {
            const docRef = doc(db, this.collectionName, patientId);
            await updateDoc(docRef, {
                isActive: false,
                status: 'inactive',
                updatedAt: Timestamp.now(),
                lastModified: Timestamp.now()
            });
        } catch (error) {
            console.error('Error deleting patient:', error);
            throw error;
        }
    }

    // Hard delete patient (permanently remove)
    async hardDeletePatient(patientId: string): Promise<void> {
        try {
            const docRef = doc(db, this.collectionName, patientId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error hard deleting patient:', error);
            throw error;
        }
    }

    // Get patient statistics
    async getPatientStatistics(userId: string): Promise<PatientStats> {
        try {
            console.log('📊 getPatientStatistics called with userId:', userId);

            const patients = await this.getPatientsByUser(userId);

            const now = new Date();
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const stats: PatientStats = {
                totalPatients: patients.length,
                activePatients: patients.filter(p => p.status === 'active').length,
                inactivePatients: patients.filter(p => p.status === 'inactive').length,
                newPatientsThisMonth: patients.filter(p => {
                    const createdDate = p.createdAt.toDate();
                    return createdDate >= thisMonth;
                }).length,
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

            console.log('✅ Successfully calculated stats:', stats);
            return stats;
        } catch (error) {
            console.error('❌ Error calculating patient statistics:', error);
            throw error;
        }
    }

    // Real-time subscription to patient changes
    subscribeToPatients(userId: string, callback: (patients: Patient[]) => void): () => void {
        try {
            console.log('🔔 Setting up real-time subscription for userId:', userId);

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

                console.log('🔔 Real-time update - patients:', patients.length);
                callback(patients);
            }, (error) => {
                console.error('❌ Error in real-time subscription:', error);
            });
        } catch (error) {
            console.error('❌ Error setting up subscription:', error);
            return () => { }; // Return empty unsubscribe function
        }
    }

    // Get recent patients (with recent activity)
    async getRecentPatients(userId: string, limitCount: number = 10): Promise<Patient[]> {
        try {
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
        } catch (error) {
            console.error('Error getting recent patients:', error);
            throw error;
        }
    }

    // Get patients needing follow-up
    async getPatientsNeedingFollowUp(userId: string): Promise<Patient[]> {
        try {
            const patients = await this.getPatientsByUser(userId);
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

            return patients.filter(patient => {
                if (!patient.lastVisitDate) return true; // No visit recorded
                const lastVisit = patient.lastVisitDate.toDate();
                return lastVisit < thirtyDaysAgo; // Last visit was more than 30 days ago
            });
        } catch (error) {
            console.error('Error getting patients needing follow-up:', error);
            throw error;
        }
    }

    // Update patient note statistics (for AI note generation tracking)
    async updatePatientNoteStats(patientId: string, qualityScore: number): Promise<void> {
        try {
            const patient = await this.getPatientById(patientId);
            if (!patient) throw new Error('Patient not found');

            const currentAverage = patient.averageNoteQuality || 0;
            const currentCount = patient.noteCount || 0;
            const newCount = currentCount + 1;
            const newAverage = ((currentAverage * currentCount) + qualityScore) / newCount;

            await updateDoc(doc(db, this.collectionName, patientId), {
                noteCount: newCount,
                averageNoteQuality: newAverage,
                lastNoteGenerated: Timestamp.now(),
                lastModified: Timestamp.now()
            });
        } catch (error) {
            console.error('Error updating patient note stats:', error);
            throw error;
        }
    }

    // Batch operations
    async batchUpdatePatients(updates: Array<{ id: string; data: PatientUpdateRequest }>): Promise<void> {
        try {
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
        } catch (error) {
            console.error('Error in batch update:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const patientService = new PatientService();

// Debug logging to verify export
console.log('🔧 PatientService exported:', !!patientService);
console.log('🔧 getPatientsByUser method exists:', typeof patientService.getPatientsByUser);