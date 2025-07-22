import CreatePatientForm from '@/components/medical/CreatePatientForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CreatePatientPage() {
    return (
        <div className="p-6">
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

            {/* Form */}
            <div className="max-w-2xl mx-auto">
                <CreatePatientForm />
            </div>
        </div>
    );
}