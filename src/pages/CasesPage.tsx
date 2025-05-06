
import React from 'react';
import CaseList from '@/components/cases/CaseList';
import { useAppContext } from '@/context/AppContext';
import { Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const CasesPage = () => {
  const { loadingCases } = useAppContext();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Cases</h1>
        <Link to="/cases/new">
          <Button className="bg-primary hover:bg-primary/90 text-white">
            New Case
          </Button>
        </Link>
      </div>
      
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
