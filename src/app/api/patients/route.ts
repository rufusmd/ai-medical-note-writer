// src/app/api/patients/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { patientService, Patient, PatientSearchFilters } from '@/lib/firebase/patients';
import { noteService } from '@/lib/firebase/notes';

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);

        // Handle different GET endpoints
        const action = searchParams.get('action');
        const patientId = searchParams.get('id');

        // Get single patient
        if (patientId) {
            const patient = await patientService.getPatientById(patientId);
            if (!patient) {
                return NextResponse.json(
                    { error: 'Not Found', message: 'Patient not found' },
                    { status: 404 }
                );
            }

            // Get patient's recent notes
            const recentNotes = await noteService.getPatientNotes(patientId, 5);

            return NextResponse.json({
                success: true,
                patient,
                recentNotes: recentNotes.map(note => ({
                    id: note.id,
                    status: note.status,
                    aiProvider: note.aiProvider,
                    qualityScore: note.metadata.qualityScore,
                    generationTime: note.metadata.generationTime,
                    category: note.category,
                })),
            });
        }

        // Get patient statistics
        if (action === 'stats') {
            const stats = await patientService.getPatientStats();
            return NextResponse.json({
                success: true,
                stats,
            });
        }

        // List patients with filters
        const filters: PatientSearchFilters = {};

        // Parse search parameters
        if (searchParams.get('search')) {
            filters.searchTerm = searchParams.get('search')!;
        }

        if (searchParams.get('status')) {
            filters.status = searchParams.get('status') as Patient['status'];
        }

        if (searchParams.get('gender')) {
            filters.gender = searchParams.get('gender') as Patient['gender'];
        }

        if (searchParams.get('sortBy')) {
            filters.sortBy = searchParams.get('sortBy') as PatientSearchFilters['sortBy'];
        }

        if (searchParams.get('sortOrder')) {
            filters.sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc';
        }

        if (searchParams.get('limit')) {
            filters.limit = parseInt(searchParams.get('limit')!);
        }

        // Age range filtering
        if (searchParams.get('minAge') || searchParams.get('maxAge')) {
            filters.ageRange = {
                min: parseInt(searchParams.get('minAge') || '0'),
                max: parseInt(searchParams.get('maxAge') || '150'),
            };
        }

        // Condition filtering
        if (searchParams.get('condition')) {
            filters.hasCondition = searchParams.get('condition')!;
        }

        // Execute search
        const result = await patientService.listPatients(filters);

        return NextResponse.json({
            success: true,
            ...result,
        });

    } catch (error: any) {
        console.error('GET /api/patients error:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error.message || 'Failed to retrieve patients',
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const userId = session.user.id || session.user.email!;
        const body = await request.json();

        // Validate request body
        const validation = validatePatientData(body);
        if (!validation.isValid) {
            return NextResponse.json(
                {
                    error: 'Validation Error',
                    message: 'Invalid patient data',
                    details: validation.errors,
                },
                { status: 400 }
            );
        }

        // Additional server-side validation
        const serverValidation = patientService.constructor.validatePatientData(body);
        if (!serverValidation.isValid) {
            return NextResponse.json(
                {
                    error: 'Validation Error',
                    message: 'Patient data validation failed',
                    details: serverValidation.errors,
                },
                { status: 400 }
            );
        }

        // Check for duplicate MRN if provided
        if (body.mrn) {
            const existingPatient = await patientService.getPatientByMRN(body.mrn);
            if (existingPatient) {
                return NextResponse.json(
                    {
                        error: 'Conflict',
                        message: 'A patient with this MRN already exists',
                        details: { existingPatientId: existingPatient.id },
                    },
                    { status: 409 }
                );
            }
        }

        // Prepare patient data
        const patientData = {
            ...body,
            dateOfBirth: new Date(body.dateOfBirth),
            status: body.status || 'active',
            createdBy: userId,
            lastModifiedBy: userId,
        };

        // Create the patient
        const newPatient = await patientService.createPatient(patientData, userId);

        return NextResponse.json(
            {
                success: true,
                patient: newPatient,
                message: 'Patient created successfully',
            },
            { status: 201 }
        );

    } catch (error: any) {
        console.error('POST /api/patients error:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error.message || 'Failed to create patient',
            },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const userId = session.user.id || session.user.email!;
        const body = await request.json();
        const { patientId, ...updateData } = body;

        if (!patientId) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'Patient ID is required' },
                { status: 400 }
            );
        }

        // Check if patient exists
        const existingPatient = await patientService.getPatientById(patientId);
        if (!existingPatient) {
            return NextResponse.json(
                { error: 'Not Found', message: 'Patient not found' },
                { status: 404 }
            );
        }

        // Validate update data
        const validation = validatePatientData(updateData, true); // partial validation
        if (!validation.isValid) {
            return NextResponse.json(
                {
                    error: 'Validation Error',
                    message: 'Invalid update data',
                    details: validation.errors,
                },
                { status: 400 }
            );
        }

        // Convert dateOfBirth if provided
        if (updateData.dateOfBirth) {
            updateData.dateOfBirth = new Date(updateData.dateOfBirth);
        }

        // Check for MRN conflicts if MRN is being updated
        if (updateData.mrn && updateData.mrn !== existingPatient.mrn) {
            const conflictingPatient = await patientService.getPatientByMRN(updateData.mrn);
            if (conflictingPatient && conflictingPatient.id !== patientId) {
                return NextResponse.json(
                    {
                        error: 'Conflict',
                        message: 'Another patient already has this MRN',
                        details: { conflictingPatientId: conflictingPatient.id },
                    },
                    { status: 409 }
                );
            }
        }

        // Update the patient
        const updatedPatient = await patientService.updatePatient(patientId, updateData, userId);

        return NextResponse.json({
            success: true,
            patient: updatedPatient,
            message: 'Patient updated successfully',
        });

    } catch (error: any) {
        console.error('PUT /api/patients error:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error.message || 'Failed to update patient',
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const userId = session.user.id || session.user.email!;
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('id');
        const permanent = searchParams.get('permanent') === 'true';

        if (!patientId) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'Patient ID is required' },
                { status: 400 }
            );
        }

        // Check if patient exists
        const existingPatient = await patientService.getPatientById(patientId);
        if (!existingPatient) {
            return NextResponse.json(
                { error: 'Not Found', message: 'Patient not found' },
                { status: 404 }
            );
        }

        if (permanent) {
            // Permanent deletion (use with extreme caution)
            await patientService.permanentlyDeletePatient(patientId, userId);
            return NextResponse.json({
                success: true,
                message: 'Patient permanently deleted',
            });
        } else {
            // Soft delete (set status to inactive)
            await patientService.deletePatient(patientId, userId);
            return NextResponse.json({
                success: true,
                message: 'Patient deactivated successfully',
            });
        }

    } catch (error: any) {
        console.error('DELETE /api/patients error:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error.message || 'Failed to delete patient',
            },
            { status: 500 }
        );
    }
}

// Validation helper function
function validatePatientData(data: any, isPartial = false): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields for new patients
    if (!isPartial) {
        if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim().length === 0) {
            errors.push('First name is required');
        }

        if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim().length === 0) {
            errors.push('Last name is required');
        }

        if (!data.dateOfBirth) {
            errors.push('Date of birth is required');
        }

        if (!data.gender || !['male', 'female', 'other', 'prefer-not-to-say'].includes(data.gender)) {
            errors.push('Valid gender is required');
        }
    }

    // Validate data types and formats when provided
    if (data.firstName && (typeof data.firstName !== 'string' || data.firstName.trim().length === 0)) {
        errors.push('First name must be a non-empty string');
    }

    if (data.lastName && (typeof data.lastName !== 'string' || data.lastName.trim().length === 0)) {
        errors.push('Last name must be a non-empty string');
    }

    if (data.dateOfBirth) {
        const dob = new Date(data.dateOfBirth);
        if (isNaN(dob.getTime())) {
            errors.push('Invalid date of birth');
        } else {
            const age = new Date().getFullYear() - dob.getFullYear();
            if (age < 0 || age > 150) {
                errors.push('Date of birth results in invalid age');
            }
        }
    }

    if (data.gender && !['male', 'female', 'other', 'prefer-not-to-say'].includes(data.gender)) {
        errors.push('Gender must be one of: male, female, other, prefer-not-to-say');
    }

    if (data.phone && !/^[\d\s\-\(\)\+]{10,}$/.test(data.phone)) {
        errors.push('Invalid phone number format');
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Invalid email format');
    }

    if (data.status && !['active', 'inactive', 'deceased'].includes(data.status)) {
        errors.push('Status must be one of: active, inactive, deceased');
    }

    // Validate nested objects
    if (data.address && typeof data.address === 'object') {
        if (data.address.street && typeof data.address.street !== 'string') {
            errors.push('Address street must be a string');
        }
        if (data.address.city && typeof data.address.city !== 'string') {
            errors.push('Address city must be a string');
        }
        if (data.address.state && typeof data.address.state !== 'string') {
            errors.push('Address state must be a string');
        }
        if (data.address.zipCode && !/^\d{5}(-\d{4})?$/.test(data.address.zipCode)) {
            errors.push('Invalid ZIP code format');
        }
    }

    if (data.medicalHistory && typeof data.medicalHistory === 'object') {
        ['conditions', 'medications', 'allergies', 'surgeries'].forEach(field => {
            if (data.medicalHistory[field] && !Array.isArray(data.medicalHistory[field])) {
                errors.push(`Medical history ${field} must be an array`);
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}