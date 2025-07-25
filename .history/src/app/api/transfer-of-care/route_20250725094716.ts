// src/app/api/transfer-of-care/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    doc,
    setDoc,
    getDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TransferOfCareData {
    patientId: string;
    previousNote: string;
    parsedNote: {
        format: 'SOAP' | 'NARRATIVE';
        emrType: 'epic' | 'credible';
        sections: Array<{
            type: string;
            content: string;
            wordCount: number;
            hasEpicSyntax: boolean;
        }>;
        confidence: number;
    };
    uploadedAt: Date;
    uploadedBy: string;
}

// POST: Store transfer of care data
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as TransferOfCareData;

        // Validate required fields
        if (!body.patientId || !body.previousNote || !body.uploadedBy) {
            return NextResponse.json(
                { error: 'Missing required fields: patientId, previousNote, uploadedBy' },
                { status: 400 }
            );
        }

        // Prepare data for Firestore
        const transferData = {
            patientId: body.patientId,
            previousNote: body.previousNote,
            parsedNote: body.parsedNote,
            uploadedAt: Timestamp.fromDate(new Date()),
            uploadedBy: body.uploadedBy,
            // Additional metadata
            metadata: {
                noteLength: body.previousNote.length,
                sectionCount: body.parsedNote?.sections?.length || 0,
                hasEpicSyntax: body.parsedNote?.sections?.some(s => s.hasEpicSyntax) || false,
                confidence: body.parsedNote?.confidence || 0,
                format: body.parsedNote?.format || 'NARRATIVE',
                emrType: body.parsedNote?.emrType || 'credible'
            }
        };

        // Store in transfer-of-care collection with patient reference
        const transferRef = collection(db, 'transfer-of-care');

        // Use patient-specific document ID to allow only one transfer note per patient
        // This ensures we always get the most recent transfer note for a patient
        const docId = `${body.patientId}_${Date.now()}`;

        await setDoc(doc(db, 'transfer-of-care', docId), transferData);

        console.log(`📝 Transfer of care data saved for patient: ${body.patientId}`);

        return NextResponse.json({
            success: true,
            message: 'Transfer of care data saved successfully',
            transferId: docId,
            metadata: transferData.metadata
        });

    } catch (error) {
        console.error('❌ Error saving transfer of care data:', error);
        return NextResponse.json(
            {
                error: 'Failed to save transfer of care data',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET: Retrieve transfer of care data for a patient
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('patientId');
        const userId = searchParams.get('userId');

        if (!patientId) {
            return NextResponse.json(
                { error: 'patientId parameter is required' },
                { status: 400 }
            );
        }

        // Query for the most recent transfer of care data for this patient
        const transferRef = collection(db, 'transfer-of-care');
        const q = query(
            transferRef,
            where('patientId', '==', patientId),
            // Optionally filter by user if provided
            ...(userId ? [where('uploadedBy', '==', userId)] : []),
            orderBy('uploadedAt', 'desc'),
            limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return NextResponse.json({
                success: true,
                transferData: null,
                message: 'No transfer of care data found for this patient'
            });
        }

        // Get the most recent transfer data
        const doc = querySnapshot.docs[0];
        const transferData = {
            id: doc.id,
            ...doc.data(),
            // Convert Firestore Timestamp back to Date
            uploadedAt: doc.data().uploadedAt?.toDate() || new Date()
        };

        console.log(`📖 Retrieved transfer of care data for patient: ${patientId}`);

        return NextResponse.json({
            success: true,
            transferData,
            metadata: {
                found: true,
                uploadedAt: transferData.uploadedAt,
                sectionCount: transferData.parsedNote?.sections?.length || 0,
                confidence: transferData.parsedNote?.confidence || 0
            }
        });

    } catch (error) {
        console.error('❌ Error retrieving transfer of care data:', error);
        return NextResponse.json(
            {
                error: 'Failed to retrieve transfer of care data',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// DELETE: Remove transfer of care data (optional cleanup)
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const transferId = searchParams.get('transferId');
        const patientId = searchParams.get('patientId');

        if (!transferId && !patientId) {
            return NextResponse.json(
                { error: 'Either transferId or patientId parameter is required' },
                { status: 400 }
            );
        }

        if (transferId) {
            // Delete specific transfer document
            await setDoc(doc(db, 'transfer-of-care', transferId), {}, { merge: false });

            return NextResponse.json({
                success: true,
                message: 'Transfer of care data deleted successfully'
            });
        } else if (patientId) {
            // Delete all transfer data for a patient
            const transferRef = collection(db, 'transfer-of-care');
            const q = query(transferRef, where('patientId', '==', patientId));
            const querySnapshot = await getDocs(q);

            const deletePromises = querySnapshot.docs.map(doc =>
                setDoc(doc.ref, {}, { merge: false })
            );

            await Promise.all(deletePromises);

            return NextResponse.json({
                success: true,
                message: `Deleted ${querySnapshot.docs.length} transfer records for patient ${patientId}`
            });
        }

    } catch (error) {
        console.error('❌ Error deleting transfer of care data:', error);
        return NextResponse.json(
            {
                error: 'Failed to delete transfer of care data',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// PUT: Update existing transfer of care data
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { transferId, ...updateData } = body;

        if (!transferId) {
            return NextResponse.json(
                { error: 'transferId is required for updates' },
                { status: 400 }
            );
        }

        // Update the document
        const transferRef = doc(db, 'transfer-of-care', transferId);
        const updatePayload = {
            ...updateData,
            updatedAt: Timestamp.fromDate(new Date())
        };

        await setDoc(transferRef, updatePayload, { merge: true });

        console.log(`📝 Updated transfer of care data: ${transferId}`);

        return NextResponse.json({
            success: true,
            message: 'Transfer of care data updated successfully',
            transferId
        });

    } catch (error) {
        console.error('❌ Error updating transfer of care data:', error);
        return NextResponse.json(
            {
                error: 'Failed to update transfer of care data',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}