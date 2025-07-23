// src/components/medical/PatientCreationForm.tsx - Complete Fixed Version
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { X, Plus, Trash2 } from 'lucide-react';

interface Patient {
    id: string;
    userId: string;
    name: string;
    mrn?: string;
    dob?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    primaryDiagnosis?: string;
    allergies?: string[];
    currentMedications?: string[];
    phoneNumber?: string;
    emergencyContact?: {
        name: string;
        relationship: string;
        phoneNumber: string;
    };
    primaryClinic: 'hmhi-downtown' | 'dbh' | 'other';
    preferredEMR: 'epic' | 'credible' | 'other';
    status: 'active' | 'inactive' | 'transferred';
    isActive: boolean;
    noteCount: number;
    createdAt: any;
    updatedAt: any;
    lastModified: any;
}

interface PatientCreationFormProps {
    onPatientCreated: (patient: Patient) => void;
    onCancel: () => void;
}

export default function PatientCreationForm({ onPatientCreated, onCancel }: PatientCreationFormProps) {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        mrn: '',
        dob: '',
        gender: 'prefer-not-to-say' as 'male' | 'female' | 'other' | 'prefer-not-to-say',
        primaryDiagnosis: '',
        phoneNumber: '',
        primaryClinic: 'hmhi-downtown' as 'hmhi-downtown' | 'dbh' | 'other',
        preferredEMR: 'epic' as 'epic' | 'credible' | 'other',
        emergencyContact: {
            name: '',
            relationship: '',
            phoneNumber: ''
        },
        allergies: [] as string[],
        currentMedications: [] as string[]
    });

    // Temporary inputs for adding allergies/medications
    const [newAllergy, setNewAllergy] = useState('');
    const [newMedication, setNewMedication] = useState('');

    // Validation
    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Patient name is required';
        }

        if (formData.mrn && !/^[A-Z0-9-]+$/.test(formData.mrn.toUpperCase())) {
            newErrors.mrn = 'MRN should contain only letters, numbers, and hyphens';
        }

        if (formData.dob) {
            const birthDate = new Date(formData.dob);
            const today = new Date();
            if (birthDate > today) {
                newErrors.dob = 'Date of birth cannot be in the future';
            }
        }

        if (formData.phoneNumber && !/^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(formData.phoneNumber)) {
            newErrors.phoneNumber = 'Please enter a valid phone number';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Add/remove allergies
    const addAllergy = () => {
        if (newAllergy.trim()) {
            setFormData(prev => ({
                ...prev,
                allergies: [...prev.allergies, newAllergy.trim()]
            }));
            setNewAllergy('');
        }
    };

    const removeAllergy = (index: number) => {
        setFormData(prev => ({
            ...prev,
            allergies: prev.allergies.filter((_, i) => i !== index)
        }));
    };

    // Add/remove medications
    const addMedication = () => {
        if (newMedication.trim()) {
            setFormData(prev => ({
                ...prev,
                currentMedications: [...prev.currentMedications, newMedication.trim()]
            }));
            setNewMedication('');
        }
    };

    const removeMedication = (index: number) => {
        setFormData(prev => ({
            ...prev,
            currentMedications: prev.currentMedications.filter((_, i) => i !== index)
        }));
    };

    // Submit form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        if (!user) {
            setErrors({ submit: 'You must be logged in to create patients' });
            return;
        }

        setIsSubmitting(true);
        try {
            const now = Timestamp.now();

            // Create patient object for Firestore - filter out undefined values
            const patientData: any = {
                userId: user.uid,
                name: formData.name.trim(),
                gender: formData.gender,
                allergies: formData.allergies,
                currentMedications: formData.currentMedications,
                primaryClinic: formData.primaryClinic,
                preferredEMR: formData.preferredEMR,
                status: 'active' as const,
                isActive: true,
                noteCount: 0,
                createdAt: now,
                updatedAt: now,
                lastModified: now
            };

            // Only add optional fields if they have values
            if (formData.mrn?.trim()) {
                patientData.mrn = formData.mrn.toUpperCase();
            }
            if (formData.dob) {
                patientData.dob = formData.dob;
            }
            if (formData.primaryDiagnosis?.trim()) {
                patientData.primaryDiagnosis = formData.primaryDiagnosis;
            }
            if (formData.phoneNumber?.trim()) {
                patientData.phoneNumber = formData.phoneNumber;
            }
            if (formData.emergencyContact.name?.trim()) {
                patientData.emergencyContact = formData.emergencyContact;
            }

            // Add to Firestore
            const docRef = await addDoc(collection(db, 'patients'), patientData);

            const newPatient: Patient = {
                id: docRef.id,
                ...patientData
            };

            // Success!
            onPatientCreated(newPatient);
            console.log('✅ Patient created successfully:', newPatient.name);

        } catch (error) {
            console.error('❌ Patient creation error:', error);
            setErrors({
                submit: error instanceof Error ? error.message : 'Failed to create patient'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Patient Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter patient's full name"
                            />
                            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                MRN (Medical Record Number)
                            </label>
                            <input
                                type="text"
                                value={formData.mrn}
                                onChange={(e) => setFormData(prev => ({ ...prev, mrn: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., MRN-123456"
                            />
                            {errors.mrn && <p className="text-red-500 text-sm mt-1">{errors.mrn}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date of Birth
                            </label>
                            <input
                                type="date"
                                value={formData.dob}
                                onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Gender
                            </label>
                            <select
                                value={formData.gender}
                                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="prefer-not-to-say">Prefer not to say</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={formData.phoneNumber}
                                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="(555) 123-4567"
                            />
                            {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Primary Diagnosis
                            </label>
                            <input
                                type="text"
                                value={formData.primaryDiagnosis}
                                onChange={(e) => setFormData(prev => ({ ...prev, primaryDiagnosis: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., Major Depressive Disorder"
                            />
                        </div>
                    </div>
                </div>

                {/* Clinical Settings */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinical Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Primary Clinic *
                            </label>
                            <select
                                value={formData.primaryClinic}
                                onChange={(e) => {
                                    const clinic = e.target.value as 'hmhi-downtown' | 'dbh' | 'other';
                                    setFormData(prev => ({
                                        ...prev,
                                        primaryClinic: clinic,
                                        preferredEMR: clinic === 'hmhi-downtown' ? 'epic' :
                                            clinic === 'dbh' ? 'credible' : 'other'
                                    }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="hmhi-downtown">HMHI Downtown</option>
                                <option value="dbh">Davis Behavioral Health</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Preferred EMR *
                            </label>
                            <select
                                value={formData.preferredEMR}
                                onChange={(e) => setFormData(prev => ({ ...prev, preferredEMR: e.target.value as any }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="epic">Epic EMR</option>
                                <option value="credible">Credible EMR</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contact Name
                            </label>
                            <input
                                type="text"
                                value={formData.emergencyContact.name}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    emergencyContact: { ...prev.emergencyContact, name: e.target.value }
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Emergency contact name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Relationship
                            </label>
                            <input
                                type="text"
                                value={formData.emergencyContact.relationship}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    emergencyContact: { ...prev.emergencyContact, relationship: e.target.value }
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., Spouse, Parent, Friend"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={formData.emergencyContact.phoneNumber}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    emergencyContact: { ...prev.emergencyContact, phoneNumber: e.target.value }
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="(555) 123-4567"
                            />
                        </div>
                    </div>
                </div>

                {/* Allergies */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Allergies</h3>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newAllergy}
                                onChange={(e) => setNewAllergy(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter allergy (e.g., Penicillin, Peanuts)"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                            />
                            <button
                                type="button"
                                onClick={addAllergy}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                        {formData.allergies.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {formData.allergies.map((allergy, index) => (
                                    <div key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                        {allergy}
                                        <button
                                            type="button"
                                            onClick={() => removeAllergy(index)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Current Medications */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Medications</h3>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMedication}
                                onChange={(e) => setNewMedication(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter medication (e.g., Sertraline 100mg daily)"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
                            />
                            <button
                                type="button"
                                onClick={addMedication}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                        {formData.currentMedications.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {formData.currentMedications.map((medication, index) => (
                                    <div key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                        {medication}
                                        <button
                                            type="button"
                                            onClick={() => removeMedication(index)}
                                            className="text-green-600 hover:text-green-800"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Error Display */}
                {errors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700">{errors.submit}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-8 pb-8 border-t border-gray-200 mt-8">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {isSubmitting ? 'Creating Patient...' : 'Create Patient'}
                    </button>
                </div>
            </form>
        </div>
    );
}