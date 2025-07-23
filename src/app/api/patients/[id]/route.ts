// src/app/api/patients/[id]/route.ts - Patient-specific operations

import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/lib/firebase/patients';
import { Timestamp } from 'firebase/firestore';

// Mock auth helper (replace with your actual auth)
function getUserId(request: NextRequest): string | null {
    const userId = request.headers.get('user-id') || request.headers.get('x-user-id');
    return userId;
}

interface RouteParams {
    params: {
        id: string;
    };
}

// GET /api/patients/[id] - Get specific patient details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = getUserId(request);
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const patient = await patientService.getPatientById(params.id);
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

    } catch (error) {
        console.error('Error in GET /api/patients/[id]:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// PATCH /api/patients/[id] - Specific patient operations
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = getUserId(request);
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { action } = body;

        // Verify patient exists and user has access
        const patient = await patientService.getPatientById(params.id);
        if (!patient) {
            return NextResponse.json(
                { error: 'Not Found', message: 'Patient not found' },
                { status: 404 }
            );
        }

        if (patient.userId !== userId) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Access denied' },
                { status: 403 }
            );
        }

        switch (action) {
            case 'update-note-stats':
                const { qualityScore } = body;
                await patientService.updatePatientNoteStats(params.id, qualityScore);
                return NextResponse.json({
                    success: true,
                    message: 'Patient note statistics updated'
                });

            case 'add-treatment-history':
                const { treatmentEntry } = body;

                if (!treatmentEntry || !treatmentEntry.visitType || !treatmentEntry.summary) {
                    return NextResponse.json(
                        { error: 'Validation Error', message: 'Treatment entry must include visitType and summary' },
                        { status: 400 }
                    );
                }

                const historyEntry = {
                    date: treatmentEntry.date ? Timestamp.fromDate(new Date(treatmentEntry.date)) : Timestamp.now(),
                    visitType: treatmentEntry.visitType,
                    provider: treatmentEntry.provider || 'Current Provider',
                    summary: treatmentEntry.summary,
                    medications: treatmentEntry.medications || [],
                    diagnosisChanges: treatmentEntry.diagnosisChanges || []
                };

                await patientService.addTreatmentHistoryEntry(params.id, historyEntry);
                return NextResponse.json({
                    success: true,
                    message: 'Treatment history entry added'
                });

            case 'activate':
                await patientService.updatePatient(params.id, {
                    status: 'active',
                    isActive: true
                });
                return NextResponse.json({
                    success: true,
                    message: 'Patient activated'
                });

            case 'deactivate':
                await patientService.updatePatient(params.id, {
                    status: 'inactive',
                    isActive: false
                });
                return NextResponse.json({
                    success: true,
                    message: 'Patient deactivated'
                });

            case 'transfer':
                const { newClinic } = body;
                if (!newClinic) {
                    return NextResponse.json(
                        { error: 'Validation Error', message: 'New clinic is required for transfer' },
                        { status: 400 }
                    );
                }

                await patientService.updatePatient(params.id, {
                    status: 'transferred',
                    primaryClinic: newClinic
                });
                return NextResponse.json({
                    success: true,
                    message: 'Patient transferred successfully'
                });

            default:
                return NextResponse.json(
                    { error: 'Invalid Action', message: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('Error in PATCH /api/patients/[id]:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}