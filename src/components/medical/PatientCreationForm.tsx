// UPDATED: src/components/medical/PatientCreationForm.tsx - Client-Side Firebase
"use client";

import React, { useState } from 'react';
import {
    X,
    User,
    Calendar,
    Phone,
    MapPin,
    AlertCircle,
    Pill,
    FileText,
    Save,
    Loader2
} from 'lucide-react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext'; // Your existing auth context
import { db } from '@/lib/firebase/config'; // Your existing Firebase config

// Types (would normally be imported)
interface PatientCreateRequest {
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
        phone: string;
    };
    primaryClinic: 'hmhi-downtown' | 'dbh' | 'other';
    preferredEMR: 'epic' | 'credible';
}

interface PatientCreationFormProps {
    isOpen: boolean;
    onClose: () => void;
    onPatientCreated: (patient: any) => void;
}

const PatientCreationForm: React.FC<PatientCreationFormProps> = ({
    isOpen,
    onClose,
    onPatientCreated
}) => {
    const { user } = useAuth(); // Get current user from your auth context

    // Form state
    const [formData, setFormData] = useState<PatientCreateRequest>({
        name: '',
        mrn: '',
        dob: '',
        gender: undefined,
        primaryDiagnosis: '',
        allergies: [],
        currentMedications: [],
        phoneNumber: '',
        emergencyContact: {
            name: '',
            relationship: '',
            phone: ''
        },
        primaryClinic: 'hmhi-downtown',
        preferredEMR: 'epic'
    });

    // UI state
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [newAllergy, setNewAllergy] = useState('');
    const [newMedication, setNewMedication] = useState('');

    // Validation
    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        if (step === 1) {
            // Basic Information
            if (!formData.name.trim()) {
                newErrors.name = 'Patient name is required';
            } else if (formData.name.trim().length < 2) {
                newErrors.name = 'Name must be at least 2 characters';
            }

            if (formData.mrn && !/^[A-Z0-9]{3,20}$/i.test(formData.mrn)) {
                newErrors.mrn = 'MRN must be 3-20 alphanumeric characters';
            }

            if (formData.dob) {
                const dob = new Date(formData.dob);
                const today = new Date();
                const age = today.getFullYear() - dob.getFullYear();
                if (isNaN(dob.getTime()) || age < 0 || age > 120) {
                    newErrors.dob = 'Please enter a valid date of birth';
                }
            }

            if (formData.phoneNumber && !/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(formData.phoneNumber)) {
                newErrors.phoneNumber = 'Please enter a valid phone number';
            }
        }

        if (step === 3) {
            // Clinical Settings (required fields)
            if (!formData.primaryClinic) {
                newErrors.primaryClinic = 'Primary clinic is required';
            }
            if (!formData.preferredEMR) {
                newErrors.preferredEMR = 'Preferred EMR is required';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form changes
    const handleInputChange = (field: keyof PatientCreateRequest, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleEmergencyContactChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            emergencyContact: {
                ...prev.emergencyContact!,
                [field]: value
            }
        }));
    };

    // Add/remove allergies and medications
    const addAllergy = () => {
        if (newAllergy.trim()) {
            setFormData(prev => ({
                ...prev,
                allergies: [...(prev.allergies || []), newAllergy.trim()]
            }));
            setNewAllergy('');
        }
    };

    const removeAllergy = (index: number) => {
        setFormData(prev => ({
            ...prev,
            allergies: prev.allergies?.filter((_, i) => i !== index) || []
        }));
    };

    const addMedication = () => {
        if (newMedication.trim()) {
            setFormData(prev => ({
                ...prev,
                currentMedications: [...(prev.currentMedications || []), newMedication.trim()]
            }));
            setNewMedication('');
        }
    };

    const removeMedication = (index: number) => {
        setFormData(prev => ({
            ...prev,
            currentMedications: prev.currentMedications?.filter((_, i) => i !== index) || []
        }));
    };

    // Navigation
    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 3));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    // Submit form - DIRECT FIREBASE CLIENT-SIDE
    const handleSubmit = async () => {
        if (!validateStep(3)) return;

        if (!user) {
            setErrors({ submit: 'You must be logged in to create patients' });
            return;
        }

        setIsSubmitting(true);
        try {
            const now = Timestamp.now();

            // Create patient object for Firestore
            const patientData = {
                userId: user.uid, // Use actual Firebase Auth user ID
                name: formData.name.trim(),
                mrn: formData.mrn?.toUpperCase(),
                dob: formData.dob,
                gender: formData.gender,
                primaryDiagnosis: formData.primaryDiagnosis,
                allergies: formData.allergies || [],
                currentMedications: formData.currentMedications || [],
                phoneNumber: formData.phoneNumber,
                emergencyContact: formData.emergencyContact,
                primaryClinic: formData.primaryClinic,
                preferredEMR: formData.preferredEMR,
                treatmentHistory: [],
                status: 'active',
                isActive: true,
                noteCount: 0,
                createdAt: now,
                updatedAt: now,
                lastModified: now
            };

            // Add directly to Firestore (client-side)
            const docRef = await addDoc(collection(db, 'patients'), patientData);

            const newPatient = {
                id: docRef.id,
                ...patientData
            };

            // Success!
            onPatientCreated(newPatient);
            handleClose();
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

    const handleClose = () => {
        setFormData({
            name: '',
            mrn: '',
            dob: '',
            gender: undefined,
            primaryDiagnosis: '',
            allergies: [],
            currentMedications: [],
            phoneNumber: '',
            emergencyContact: { name: '', relationship: '', phone: '' },
            primaryClinic: 'hmhi-downtown',
            preferredEMR: 'epic'
        });
        setCurrentStep(1);
        setErrors({});
        setNewAllergy('');
        setNewMedication('');
        onClose();
    };

    const calculateAge = (dob: string) => {
        if (!dob) return null;
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Add New Patient</h2>
                        <p className="text-sm text-gray-600 mt-1">Step {currentStep} of 3</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 py-3 bg-gray-50">
                    <div className="flex items-center space-x-4">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step <= currentStep
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {step}
                                </div>
                                <span className={`ml-2 text-sm font-medium ${step <= currentStep ? 'text-blue-600' : 'text-gray-500'
                                    }`}>
                                    {step === 1 ? 'Basic Info' : step === 2 ? 'Clinical Info' : 'Settings'}
                                </span>
                                {step < 3 && <div className="w-8 h-px bg-gray-300 ml-4" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form Content - Same as before, just keeping the rest of the component identical */}
                <div className="px-6 py-6 max-h-96 overflow-y-auto">
                    {/* Step 1: Basic Information */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <User className="w-6 h-6 text-blue-600" />
                                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Name */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="Enter patient's full name"
                                    />
                                    {errors.name && (
                                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                    )}
                                </div>

                                {/* MRN */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Medical Record Number (MRN)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.mrn}
                                        onChange={(e) => handleInputChange('mrn', e.target.value.toUpperCase())}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.mrn ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="e.g., MRN12345"
                                    />
                                    {errors.mrn && (
                                        <p className="mt-1 text-sm text-red-600">{errors.mrn}</p>
                                    )}
                                </div>

                                {/* Date of Birth */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Date of Birth
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={formData.dob}
                                            onChange={(e) => handleInputChange('dob', e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.dob ? 'border-red-300' : 'border-gray-300'
                                                }`}
                                        />
                                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                                    </div>
                                    {formData.dob && (
                                        <p className="mt-1 text-sm text-gray-600">
                                            Age: {calculateAge(formData.dob)} years
                                        </p>
                                    )}
                                    {errors.dob && (
                                        <p className="mt-1 text-sm text-red-600">{errors.dob}</p>
                                    )}
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Gender
                                    </label>
                                    <select
                                        value={formData.gender || ''}
                                        onChange={(e) => handleInputChange('gender', e.target.value || undefined)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                        <option value="prefer-not-to-say">Prefer not to say</option>
                                    </select>
                                </div>

                                {/* Phone Number */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            value={formData.phoneNumber}
                                            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                            className={`w-full px-3 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                                                }`}
                                            placeholder="(555) 123-4567"
                                        />
                                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    </div>
                                    {errors.phoneNumber && (
                                        <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Steps 2 and 3 remain the same as original - keeping them identical for brevity */}
                    {/* You can copy the rest from the original PatientCreationForm component */}

                    {/* Step 2: Clinical Information */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <FileText className="w-6 h-6 text-green-600" />
                                <h3 className="text-lg font-medium text-gray-900">Clinical Information</h3>
                            </div>

                            {/* Primary Diagnosis */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Primary Diagnosis
                                </label>
                                <input
                                    type="text"
                                    value={formData.primaryDiagnosis}
                                    onChange={(e) => handleInputChange('primaryDiagnosis', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., Major Depressive Disorder, Generalized Anxiety Disorder"
                                />
                            </div>

                            {/* Allergies */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <AlertCircle className="w-4 h-4 inline mr-1 text-orange-500" />
                                    Allergies
                                </label>
                                <div className="flex space-x-2 mb-2">
                                    <input
                                        type="text"
                                        value={newAllergy}
                                        onChange={(e) => setNewAllergy(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Add allergy (e.g., Penicillin)"
                                    />
                                    <button
                                        type="button"
                                        onClick={addAllergy}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                                {formData.allergies && formData.allergies.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.allergies.map((allergy, index) => (
                                            <span key={index} className="inline-flex items-center bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                                                {allergy}
                                                <button
                                                    onClick={() => removeAllergy(index)}
                                                    className="ml-2 text-orange-600 hover:text-orange-800"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Current Medications */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Pill className="w-4 h-4 inline mr-1 text-blue-500" />
                                    Current Medications
                                </label>
                                <div className="flex space-x-2 mb-2">
                                    <input
                                        type="text"
                                        value={newMedication}
                                        onChange={(e) => setNewMedication(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addMedication()}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Add medication (e.g., Sertraline 100mg)"
                                    />
                                    <button
                                        type="button"
                                        onClick={addMedication}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                                {formData.currentMedications && formData.currentMedications.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.currentMedications.map((medication, index) => (
                                            <span key={index} className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                                {medication}
                                                <button
                                                    onClick={() => removeMedication(index)}
                                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Emergency Contact */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-3">Emergency Contact (Optional)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={formData.emergencyContact?.name || ''}
                                            onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Contact name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                                        <input
                                            type="text"
                                            value={formData.emergencyContact?.relationship || ''}
                                            onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="e.g., Spouse, Parent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.emergencyContact?.phone || ''}
                                            onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="(555) 123-4567"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Clinical Settings */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <MapPin className="w-6 h-6 text-purple-600" />
                                <h3 className="text-lg font-medium text-gray-900">Clinical Settings</h3>
                            </div>

                            {/* Primary Clinic */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Primary Clinic *
                                </label>
                                <select
                                    value={formData.primaryClinic}
                                    onChange={(e) => handleInputChange('primaryClinic', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.primaryClinic ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                >
                                    <option value="hmhi-downtown">HMHI Downtown</option>
                                    <option value="dbh">Davis Behavioral Health</option>
                                    <option value="other">Other</option>
                                </select>
                                {errors.primaryClinic && (
                                    <p className="mt-1 text-sm text-red-600">{errors.primaryClinic}</p>
                                )}
                            </div>

                            {/* Preferred EMR */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Preferred EMR System *
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                                        <input
                                            type="radio"
                                            name="preferredEMR"
                                            value="epic"
                                            checked={formData.preferredEMR === 'epic'}
                                            onChange={(e) => handleInputChange('preferredEMR', e.target.value)}
                                            className="mr-3"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">Epic</div>
                                            <div className="text-sm text-gray-600">SmartPhrases & Templates</div>
                                        </div>
                                    </label>
                                    <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                                        <input
                                            type="radio"
                                            name="preferredEMR"
                                            value="credible"
                                            checked={formData.preferredEMR === 'credible'}
                                            onChange={(e) => handleInputChange('preferredEMR', e.target.value)}
                                            className="mr-3"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">Credible</div>
                                            <div className="text-sm text-gray-600">Plain Text Format</div>
                                        </div>
                                    </label>
                                </div>
                                {errors.preferredEMR && (
                                    <p className="mt-1 text-sm text-red-600">{errors.preferredEMR}</p>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-3">Patient Summary</h4>
                                <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Name:</span> {formData.name || 'Not provided'}</div>
                                    {formData.mrn && <div><span className="font-medium">MRN:</span> {formData.mrn}</div>}
                                    {formData.dob && <div><span className="font-medium">Age:</span> {calculateAge(formData.dob)} years</div>}
                                    {formData.gender && <div><span className="font-medium">Gender:</span> {formData.gender}</div>}
                                    {formData.primaryDiagnosis && <div><span className="font-medium">Diagnosis:</span> {formData.primaryDiagnosis}</div>}
                                    <div><span className="font-medium">Clinic:</span> {
                                        formData.primaryClinic === 'hmhi-downtown' ? 'HMHI Downtown' :
                                            formData.primaryClinic === 'dbh' ? 'Davis Behavioral Health' : 'Other'
                                    }</div>
                                    <div><span className="font-medium">EMR:</span> {formData.preferredEMR.toUpperCase()}</div>
                                </div>
                            </div>

                            {/* Submit Error */}
                            {errors.submit && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 text-red-800">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="font-medium">Error: {errors.submit}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                    <div className="flex space-x-3">
                        {currentStep > 1 && (
                            <button
                                onClick={prevStep}
                                disabled={isSubmitting}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Previous
                            </button>
                        )}
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        {currentStep < 3 ? (
                            <button
                                onClick={nextStep}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                            >
                                <span>Next</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !user}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        <span>Create Patient</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientCreationForm;