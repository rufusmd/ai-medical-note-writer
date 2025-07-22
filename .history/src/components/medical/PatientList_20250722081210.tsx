'use client';

import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    deleteDoc,
    doc,
    startAfter,
    limit,
    DocumentSnapshot
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { Search, Plus, Calendar, FileText, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Patient {
    id: string;
    name: string;
    mrn?: string;
    dob?: string;
    createdBy: string;
    createdAt: any;
    lastModified: any;
    lastEncounter?: any;
}

const PATIENTS_PER_PAGE = 10;

export default function PatientList() {
    const { user } = useAuth();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Load initial patients
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const patientsQuery = query(
            collection(db, 'patients'),
            where('createdBy', '==', user.uid),
            orderBy('lastModified', 'desc'),
            limit(PATIENTS_PER_PAGE)
        );

        const unsubscribe = onSnapshot(patientsQuery, (snapshot) => {
            const patientsData: Patient[] = [];
            snapshot.forEach((doc) => {
                patientsData.push({ id: doc.id, ...doc.data() } as Patient);
            });

            setPatients(patientsData);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === PATIENTS_PER_PAGE);
            setLoading(false);
        }, (error) => {
            console.error('Error loading patients:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Load more patients (pagination)
    const loadMore = async () => {
        if (!user || !lastDoc || loadingMore) return;

        setLoadingMore(true);

        const nextQuery = query(
            collection(db, 'patients'),
            where('createdBy', '==', user.uid),
            orderBy('lastModified', 'desc'),
            startAfter(lastDoc),
            limit(PATIENTS_PER_PAGE)
        );

        const unsubscribe = onSnapshot(nextQuery, (snapshot) => {
            const newPatients: Patient[] = [];
            snapshot.forEach((doc) => {
                newPatients.push({ id: doc.id, ...doc.data() } as Patient);
            });

            setPatients(prev => [...prev, ...newPatients]);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === PATIENTS_PER_PAGE);
            setLoadingMore(false);
            unsubscribe(); // Unsubscribe after getting data
        });
    };

    // Delete patient
    const handleDeletePatient = async (patientId: string, patientName: string) => {
        if (!confirm(`Are you sure you want to delete patient "${patientName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'patients', patientId));
            // Patient list will update automatically due to real-time listener
        } catch (error) {
            console.error('Error deleting patient:', error);
            alert('Failed to delete patient. Please try again.');
        }
    };

    // Filter patients based on search term
    const filteredPatients = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.mrn && patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Format date for display
    const formatDate = (timestamp: any): string => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString();
    };

    // Calculate age from DOB
    const calculateAge = (dob: string): number | null => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    if (!user) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-600">Please log in to view patients.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
                <Link
                    href="/dashboard/patients/create"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add Patient
                </Link>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search patients by name or MRN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Loading State */}
            {loading && (
                <div className="text-center py-8">
                    <p className="text-gray-600">Loading patients...</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && patients.length === 0 && (
                <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No patients yet</h3>
                    <p className="text-gray-600 mb-4">Get started by adding your first patient.</p>
                    <Link
                        href="/dashboard/patients/create"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        Add First Patient
                    </Link>
                </div>
            )}

            {/* Patient List */}
            {!loading && filteredPatients.length > 0 && (
                <div className="space-y-4">
                    {filteredPatients.map((patient) => (
                        <div key={patient.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900">{patient.name}</h3>

                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                        {patient.mrn && (
                                            <div>
                                                <span className="font-medium">MRN:</span> {patient.mrn}
                                            </div>
                                        )}

                                        {patient.dob && (
                                            <div>
                                                <span className="font-medium">Age:</span> {calculateAge(patient.dob)} years
                                            </div>
                                        )}

                                        <div>
                                            <span className="font-medium">Created:</span> {formatDate(patient.createdAt)}
                                        </div>

                                        <div>
                                            <span className="font-medium">Last Visit:</span> {formatDate(patient.lastEncounter)}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 ml-4">
                                    <button
                                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                                        title="Start Encounter"
                                    >
                                        <Calendar size={16} />
                                        Start Encounter
                                    </button>

                                    <Link
                                        href={`/dashboard/patients/${patient.id}`}
                                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                        title="View Details"
                                    >
                                        View
                                    </Link>

                                    <button
                                        onClick={() => handleDeletePatient(patient.id, patient.name)}
                                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center gap-1"
                                        title="Delete Patient"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Load More Button */}
                    {hasMore && !searchTerm && (
                        <div className="text-center py-4">
                            <button
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
                            >
                                {loadingMore ? 'Loading...' : 'Load More Patients'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Search Results */}
            {!loading && searchTerm && filteredPatients.length === 0 && patients.length > 0 && (
                <div className="text-center py-8">
                    <p className="text-gray-600">No patients found matching "{searchTerm}"</p>
                </div>
            )}
        </div>
    );
}