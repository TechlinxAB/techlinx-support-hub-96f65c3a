
import React from 'react';
import CaseList from '@/components/cases/CaseList';

const CasesPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Cases</h1>
      <CaseList />
    </div>
  );
};

export default CasesPage;
