export default function TestRootPatientsPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-green-600">✅ ROOT Test Route Working!</h1>
            <p>This route is at: /test-patients</p>
            <p>If this works but /dashboard/patients doesn't, the issue is with route groups.</p>
        </div>
    );
}