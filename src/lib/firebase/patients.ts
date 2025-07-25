// src/lib/firebase/patients.ts
// 🏥 Patient Management Service with Firebase Integration

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
    DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface Patient {
    id: string;
    name: string;
    mrn?: string;
    dob?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    createdBy: string;
    createdAt: Timestamp | Date;
    lastModified: Timestamp | Date;
    lastEncounter?: Timestamp | Date;
    status?: 'active' | 'inactive';
}

export interface PatientCreateData {
    name: string;
    mrn?: string;
    dob?: string;
    gender?: Patient['gender'];
    createdBy: string;
    createdAt: Date;
    lastModified: Date;
}

export interface PatientUpdateData {
    name?: string;
    mrn?: string;
    dob?: string;
    gender?: Patient['gender'];
    lastModified: Date;
    lastEncounter?: Date;
    status?: Patient['status'];
}

export interface PatientSearchFilters {
    searchTerm?: string;
    status?: Patient['status'];
    gender?: Patient['gender'];
    createdBy?: string;
    limit?: number;
    startAfter?: DocumentSnapshot;
}

class PatientsService {
    private readonly collectionName = 'patients';

    /**
     * Create a new patient
     */
    async createPatient(patientData: PatientCreateData): Promise<Patient> {
        try {
            console.log('🏥 Creating new patient:', patientData.name);

            const patientsRef = collection(db, this.collectionName);
            const docData = {
                ...patientData,
                createdAt: Timestamp.fromDate(patientData.createdAt),
                lastModified: Timestamp.fromDate(patientData.lastModified),
                status: 'active' as const
            };

            const docRef = await addDoc(patientsRef, docData);

            const createdPatient: Patient = {
                id: docRef.id,
                ...patientData,
                status: 'active'
            };

            console.log('✅ Patient created successfully:', docRef.id);
            return createdPatient;

        } catch (error) {
            console.error('❌ Error creating patient:', error);
            throw new Error(`Failed to create patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get a patient by ID
     */
    async getPatient(patientId: string): Promise<Patient | null> {
        try {
            const patientRef = doc(db, this.collectionName, patientId);
            const patientSnap = await getDoc(patientRef);

            if (!patientSnap.exists()) {
                return null;
            }

            const data = patientSnap.data();
            return {
                id: patientSnap.id,
                name: data.name,
                mrn: data.mrn,
                dob: data.dob,
                gender: data.gender,
                createdBy: data.createdBy,
                createdAt: data.createdAt,
                lastModified: data.lastModified,
                lastEncounter: data.lastEncounter,
                status: data.status || 'active'
            };

        } catch (error) {
            console.error('❌ Error fetching patient:', error);
            throw new Error(`Failed to fetch patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get all patients for a specific user
     */
    async getUserPatients(userId: string, filters: PatientSearchFilters = {}): Promise<Patient[]> {
        try {
            console.log('📋 Fetching patients for user:', userId);

            const patientsRef = collection(db, this.collectionName);
            let patientsQuery = query(
                patientsRef,
                where('createdBy', '==', userId),
                orderBy('lastModified', 'desc')
            );

            // Apply filters
            if (filters.status) {
                patientsQuery = query(
                    patientsRef,
                    where('createdBy', '==', userId),
                    where('status', '==', filters.status),
                    orderBy('lastModified', 'desc')
                );
            }

            if (filters.limit) {
                patientsQuery = query(patientsQuery, limit(filters.limit));
            }

            if (filters.startAfter) {
                patientsQuery = query(patientsQuery, startAfter(filters.startAfter));
            }

            const querySnapshot = await getDocs(patientsQuery);
            const patients: Patient[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                patients.push({
                    id: doc.id,
                    name: data.name,
                    mrn: data.mrn,
                    dob: data.dob,
                    gender: data.gender,
                    createdBy: data.createdBy,
                    createdAt: data.createdAt,
                    lastModified: data.lastModified,
                    lastEncounter: data.lastEncounter,
                    status: data.status || 'active'
                });
            });

            // Apply client-side search filter if provided
            let filteredPatients = patients;
            if (filters.searchTerm) {
                const searchLower = filters.searchTerm.toLowerCase();
                filteredPatients = patients.filter(patient =>
                    patient.name.toLowerCase().includes(searchLower) ||
                    (patient.mrn && patient.mrn.toLowerCase().includes(searchLower))
                );
            }

            console.log(`✅ Found ${filteredPatients.length} patients`);
            return filteredPatients;

        } catch (error) {
            console.error('❌ Error fetching user patients:', error);
            throw new Error(`Failed to fetch patients: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update a patient
     */
    async updatePatient(patientId: string, updateData: PatientUpdateData): Promise<Patient> {
        try {
            console.log('📝 Updating patient:', patientId);

            const patientRef = doc(db, this.collectionName, patientId);

            // Convert Date to Timestamp for Firestore
            const firestoreUpdateData = {
                ...updateData,
                lastModified: Timestamp.fromDate(updateData.lastModified),
                ...(updateData.lastEncounter && {
                    lastEncounter: Timestamp.fromDate(updateData.lastEncounter)
                })
            };

            await updateDoc(patientRef, firestoreUpdateData);

            // Fetch and return updated patient
            const updatedPatient = await this.getPatient(patientId);
            if (!updatedPatient) {
                throw new Error('Patient not found after update');
            }

            console.log('✅ Patient updated successfully');
            return updatedPatient;

        } catch (error) {
            console.error('❌ Error updating patient:', error);
            throw new Error(`Failed to update patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete a patient
     */
    async deletePatient(patientId: string): Promise<void> {
        try {
            console.log('🗑️ Deleting patient:', patientId);

            const patientRef = doc(db, this.collectionName, patientId);
            await deleteDoc(patientRef);

            console.log('✅ Patient deleted successfully');

        } catch (error) {
            console.error('❌ Error deleting patient:', error);
            throw new Error(`Failed to delete patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Search patients with advanced filters
     */
    async searchPatients(userId: string, searchTerm: string, filters: PatientSearchFilters = {}): Promise<Patient[]> {
        try {
            console.log('🔍 Searching patients for:', searchTerm);

            // For now, get all user patients and filter client-side
            // In a production app, you might want server-side search with Algolia or similar
            const allPatients = await this.getUserPatients(userId, filters);

            if (!searchTerm) {
                return allPatients;
            }

            const searchLower = searchTerm.toLowerCase();
            const filteredPatients = allPatients.filter(patient =>
                patient.name.toLowerCase().includes(searchLower) ||
                (patient.mrn && patient.mrn.toLowerCase().includes(searchLower)) ||
                (patient.dob && patient.dob.includes(searchTerm))
            );

            console.log(`✅ Found ${filteredPatients.length} matching patients`);
            return filteredPatients;

        } catch (error) {
            console.error('❌ Error searching patients:', error);
            throw new Error(`Failed to search patients: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update patient's last encounter timestamp
     */
    async updateLastEncounter(patientId: string): Promise<void> {
        try {
            const now = new Date();
            await this.updatePatient(patientId, {
                lastEncounter: now,
                lastModified: now
            });

            console.log('✅ Updated last encounter for patient:', patientId);

        } catch (error) {
            console.error('❌ Error updating last encounter:', error);
            throw new Error(`Failed to update last encounter: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get patient statistics for a user
     */
    async getUserPatientStats(userId: string): Promise<{
        totalPatients: number;
        activePatients: number;
        inactivePatients: number;
        recentPatients: number; // Last 30 days
    }> {
        try {
            console.log('📊 Getting patient statistics for user:', userId);

            const allPatients = await this.getUserPatients(userId);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const stats = {
                totalPatients: allPatients.length,
                activePatients: allPatients.filter(p => p.status === 'active').length,
                inactivePatients: allPatients.filter(p => p.status === 'inactive').length,
                recentPatients: allPatients.filter(p => {
                    const createdAt = p.createdAt instanceof Timestamp ? p.createdAt.toDate() : p.createdAt;
                    return createdAt > thirtyDaysAgo;
                }).length
            };

            console.log('✅ Patient statistics calculated:', stats);
            return stats;

        } catch (error) {
            console.error('❌ Error getting patient statistics:', error);
            throw new Error(`Failed to get patient statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if a patient with the same MRN already exists for this user
     */
    async checkDuplicateMRN(userId: string, mrn: string, excludePatientId?: string): Promise<boolean> {
        try {
            if (!mrn) return false;

            const patientsRef = collection(db, this.collectionName);
            const duplicateQuery = query(
                patientsRef,
                where('createdBy', '==', userId),
                where('mrn', '==', mrn)
            );

            const querySnapshot = await getDocs(duplicateQuery);

            if (excludePatientId) {
                // Exclude the current patient when checking for updates
                return querySnapshot.docs.some(doc => doc.id !== excludePatientId);
            }

            return !querySnapshot.empty;

        } catch (error) {
            console.error('❌ Error checking duplicate MRN:', error);
            return false; // Don't block patient creation on error
        }
    }

    /**
     * Batch operations for multiple patients
     */
    async batchUpdatePatients(updates: Array<{ patientId: string; updateData: PatientUpdateData }>): Promise<void> {
        try {
            console.log('🔄 Performing batch update on', updates.length, 'patients');

            // For simplicity, perform sequential updates
            // In production, you might want to use Firestore batch operations
            const updatePromises = updates.map(({ patientId, updateData }) =>
                this.updatePatient(patientId, updateData)
            );

            await Promise.all(updatePromises);
            console.log('✅ Batch update completed');

        } catch (error) {
            console.error('❌ Error in batch update:', error);
            throw new Error(`Failed to batch update patients: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Export singleton instance
export const patientsService = new PatientsService();