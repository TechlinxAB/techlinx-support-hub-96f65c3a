
import React from 'react';
import { useAppContext } from '@/context/AppContext';
import UserDashboard from '@/components/dashboard/UserDashboard';
import ConsultantDashboard from '@/components/dashboard/ConsultantDashboard';

const Dashboard = () => {
  const { currentUser } = useAppContext();
  
  return (
    <>
      {currentUser?.role === 'consultant' ? (
        <ConsultantDashboard />
      ) : (
        <UserDashboard />
      )}
    </>
  );
};

export default Dashboard;
