import EnhancedSuperAdminCandidatesTable from '@/components/superadmin/EnhancedSuperAdminCandidatesTable';

export default function SuperAdminCandidates() {
  return (
    <div className="container mx-auto py-2 px-1">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <EnhancedSuperAdminCandidatesTable />
      </div>
    </div>
  );
} 