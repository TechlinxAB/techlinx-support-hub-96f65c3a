
import React from 'react';
import CaseList from '@/components/cases/CaseList';
import { useAppContext } from '@/context/AppContext';
import { Loader } from 'lucide-react';

const CasesPage = () => {
  const { loadingCases } = useAppContext();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-primary">Cases</h1>
      
      {loadingCases ? (
        <div className="flex items-center justify-center p-12">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <CaseList />
      )}
    </div>
  );
};

export default CasesPage;
