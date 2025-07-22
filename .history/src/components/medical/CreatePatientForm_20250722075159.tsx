'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';

interface PatientFormData {
    name: string;
    mrn?: string;
    dob?: string;
}

export default function CreatePatientForm() {
    const { user } = useAuth();
    const router = useRouter();
    const [formData, setFormData] = useState<PatientFormData>({
        name: '',
        mrn: '',
        dob: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Patient name is required';
        }

        if (formData.name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        // Validate MRN if provided
        if (formData.mrn && !/^[A-Z0-9-]+$/i.test(formData.mrn)) {
            newErrors.mrn = 'MRN must contain only letters, numbers, and hyphens';
        }

        // Validate DOB if provided
        if (formData.dob && new Date(formData.dob) > new Date()) {
            newErrors.dob = 'Date of birth cannot be in the future';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('You must be logged in to create patients');
            return;
        }

        if (!validateForm()) return;

        setLoading(true);

        try {
            const patientData = {
                name: formData.name.trim(),
                mrn: formData.mrn?.trim() || null,
                dob: formData.dob || null,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                lastModified: serverTimestamp(),
                lastEncounter: null
            };

            const docRef = await addDoc(collection(db, 'patients'), patientData);

            // Navigate to patient list
            router.push('/dashboard/patients');

        } catch (error) {
            console.error('Error creating patient:', error);
            alert('Failed to create patient. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: keyof PatientFormData) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Patient</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Patient Name - Required */}
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Patient Name *
                    </label>
                    <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={handleInputChange('name')}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="Enter patient's full name"
                        disabled={loading}
                    />
                    {errors.name && (
                        <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                    )}
                </div>

                {/* Medical Record Number - Optional */}
                <div>
                    <label htmlFor="mrn" className="block text-sm font-medium text-gray-700 mb-1">
                        Medical Record Number (Optional)
                    </label>
                    <input
                        type="text"
                        id="mrn"
                        value={formData.mrn}
                        onChange={handleInputChange('mrn')}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.mrn ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="e.g., MRN-12345"
                        disabled={loading}
                    />
                    {errors.mrn && (
                        <p className="text-red-500 text-xs mt-1">{errors.mrn}</p>
                    )}
                </div>

                {/* Date of Birth - Optional */}
                <div>
                    <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth (Optional)
                    </label>
                    <input
                        type="date"
                        id="dob"
                        value={formData.dob}
                        onChange={handleInputChange('dob')}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.dob ? 'border-red-500' : 'border-gray-300'
                            }`}
                        disabled={loading}
                    />
                    {errors.dob && (
                        <p className="text-red-500 text-xs mt-1">{errors.dob}</p>
                    )}
                </div>

                {/* HIPAA Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-xs text-blue-700">
                        <strong>HIPAA Notice:</strong> Only essential patient information is collected.
                        All data is encrypted and access-controlled per HIPAA requirements.
                    </p>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Creating Patient...' : 'Create Patient'}
                </button>
            </form>
        </div>
    );
}