// src/app/api/patients/route.ts - Enhanced Patient CRUD API

import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/lib/firebase/patients';
import { PatientCreateRequest, PatientSearchFilters } from '@/types/patient';

// Mock auth helper (replace with your actual auth)
function getUserId(request: NextRequest): string | null {
    // This should extract the user ID from your authentication system
    // For now, using a header - replace with your actual auth implementation
    const userId = request.headers.get('user-id') || request.headers.get('x-user-id');
    return userId;
}

// GET /api/patients - List patients with search/filter
export async function GET(request: NextRequest) {
    try {
        const userId = getUserId(request);
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);

        // Handle different GET endpoints
        const action = searchParams.get('action');
        const patientId = searchParams.get('id');

        // Get single patient with details
        if (patientId) {
            const patient = await patientService.getPatientById(patientId);
            if (!patient) {
                return NextResponse.json(
                    { error: 'Not Found', message: 'Patient not found' },
                    { status: 404 }
                );
            }

            // Verify ownership
            if (patient.userId !== userId) {
                return NextResponse.json(
                    { error: 'Forbidden', message: 'Access denied' },
                    { status: 403 }
                );
            }

            return NextResponse.json({
                success: true,
                patient
            });
        }

        // Get patient statistics
        if (action === 'stats') {
            const stats = await patientService.getPatientStats(userId);
            return NextResponse.json({
                success: true,
                stats
            });
        }

        // Get recent patients
        if (action === 'recent') {
            const limit = parseInt(searchParams.get('limit') || '10');
            const patients = await patientService.getRecentPatients(userId, limit);
            return NextResponse.json({
                success: true,
                patients
            });
        }

        // Get patients needing follow-up
        if (action === 'follow-up') {
            const patients = await patientService.getPatientsNeedingFollowUp(userId);
            return NextResponse.json({
                success: true,
                patients
            });
        }

        // Search/filter patients
        const filters: PatientSearchFilters = {};

        if (searchParams.get('search')) {
            filters.searchTerm = searchParams.get('search')!;
        }

        if (searchParams.get('gender')) {
            filters.gender = searchParams.get('gender') as PatientSearchFilters['gender'];
        }

        if (searchParams.get('status')) {
            filters.status = searchParams.get('status') as PatientSearchFilters['status'];
        }

        if (searchParams.get('clinic')) {
            filters.primaryClinic = searchParams.get('clinic') as PatientSearchFilters['primaryClinic'];
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

        const result = await patientService.searchPatients(userId, filters);

        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Error in GET /api/patients:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// POST /api/patients - Create new patient
export async function POST(request: NextRequest) {
    try {
        const userId = getUserId(request);
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();

        // Validate required fields
        if (!body.name?.trim()) {
            return NextResponse.json(
                { error: 'Validation Error', message: 'Patient name is required' },
                { status: 400 }
            );
        }

        if (!body.primaryClinic) {
            return NextResponse.json(
                { error: 'Validation Error', message: 'Primary clinic is required' },
                { status: 400 }
            );
        }

        if (!body.preferredEMR) {
            return NextResponse.json(
                { error: 'Validation Error', message: 'Preferred EMR is required' },
                { status: 400 }
            );
        }

        const patientData: PatientCreateRequest = {
            name: body.name.trim(),
            mrn: body.mrn?.trim(),
            dob: body.dob,
            gender: body.gender,
            primaryDiagnosis: body.primaryDiagnosis?.trim(),
            allergies: body.allergies || [],
            currentMedications: body.currentMedications || [],
            phoneNumber: body.phoneNumber?.trim(),
            emergencyContact: body.emergencyContact,
            primaryClinic: body.primaryClinic,
            preferredEMR: body.preferredEMR
        };

        const patient = await patientService.createPatient(userId, patientData);

        return NextResponse.json({
            success: true,
            patient,
            message: 'Patient created successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('Error in POST /api/patients:', error);

        if (error instanceof Error && error.message.includes('Invalid')) {
            return NextResponse.json(
                { error: 'Validation Error', message: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// PUT /api/patients - Update patient
export async function PUT(request: NextRequest) {
    try {
        const userId = getUserId(request);
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { patientId, ...updateData } = body;

        if (!patientId) {
            return NextResponse.json(
                { error: 'Validation Error', message: 'Patient ID is required' },
                { status: 400 }
            );
        }

        // Verify patient exists and user has access
        const existingPatient = await patientService.getPatientById(patientId);
        if (!existingPatient) {
            return NextResponse.json(
                { error: 'Not Found', message: 'Patient not found' },
                { status: 404 }
            );
        }

        if (existingPatient.userId !== userId) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Access denied' },
                { status: 403 }
            );
        }

        const updatedPatient = await patientService.updatePatient(patientId, updateData);

        return NextResponse.json({
            success: true,
            patient: updatedPatient,
            message: 'Patient updated successfully'
        });

    } catch (error) {
        console.error('Error in PUT /api/patients:', error);

        if (error instanceof Error && error.message.includes('Invalid')) {
            return NextResponse.json(
                { error: 'Validation Error', message: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// DELETE /api/patients - Delete patient (soft delete by default)
export async function DELETE(request: NextRequest) {
    try {
        const userId = getUserId(request);
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('id');
        const hard = searchParams.get('hard') === 'true'; // For complete deletion

        if (!patientId) {
            return NextResponse.json(
                { error: 'Validation Error', message: 'Patient ID is required' },
                { status: 400 }
            );
        }

        // Verify patient exists and user has access
        const existingPatient = await patientService.getPatientById(patientId);
        if (!existingPatient) {
            return NextResponse.json(
                { error: 'Not Found', message: 'Patient not found' },
                { status: 404 }
            );
        }

        if (existingPatient.userId !== userId) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Access denied' },
                { status: 403 }
            );
        }

        if (hard) {
            await patientService.hardDeletePatient(patientId);
        } else {
            await patientService.deletePatient(patientId);
        }

        return NextResponse.json({
            success: true,
            message: hard ? 'Patient permanently deleted' : 'Patient deactivated'
        });

    } catch (error) {
        console.error('Error in DELETE /api/patients:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}