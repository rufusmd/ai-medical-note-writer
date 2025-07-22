'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, FileText, Edit, Trash2, ArrowLeft } from 'lucide-react';

interface Patient {
    id: string;
    name: string;
    mrn?: string;
    dob?: string;
    createdBy: string;
    createdAt: any;
    lastEncounter?: any;
}

export default function PatientDetailPage() {
    const params = useParams();
    const patientId = params?.id as string;
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPatient = async () => {
            if (!patientId) return;

            try {
                const patientDoc = await getDoc(doc(db, 'patients', patientId));
                if (patientDoc.exists()) {
                    setPatient({ id: patientDoc.id, ...patientDoc.data() } as Patient);
                }
            } catch (error) {
                console.error('Error loading patient:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPatient();
    }, [patientId]);

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center py-8">
                    <p className="text-gray-600">Loading patient...</p>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="p-6">
                <div className="text-center py-8">
                    <p className="text-gray-600">Patient not found</p>
                    <Link
                        href="/dashboard/patients"
                        className="text-blue-600 hover:text-blue-800 mt-4 inline-block"
                    >
                        Back to Patients
                    </Link>
                </div>
            </div>
        );
    }

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

    return (
        <div className="p-6 space-y-6">
            {/* Breadcrumb */}
            <div className="mb-6">
                <Link
                    href="/dashboard/patients"
                    className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Patients
                </Link>
            </div>

            {/* Patient Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
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
                                <span className="font-medium">Created:</span>{' '}
                                {patient.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2">
                            <Calendar size={20} />
                            Start Encounter
                        </button>
                        <button className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700">
                            <Edit size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent Encounters */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Encounters</h2>
                <div className="text-gray-600">
                    <p>No encounters yet. Start the first encounter to begin generating notes.</p>
                </div>
            </div>

            {/* Recent Notes */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Notes</h2>
                <div className="text-gray-600">
                    <p>No notes generated yet.</p>
                </div>
            </div>
        </div>
    );
}