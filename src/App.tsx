
import React, { useEffect } from 'react';
import { AppRoutes } from "./AppRoutes";
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { Toaster } from './components/ui/toaster';
import { databaseService } from './services/databaseService';
import './App.css';

function App() {
  // Initialize database services on app startup
  useEffect(() => {
    const initDb = async () => {
      console.log("Initializing database services...");
      await databaseService.initialize();
    };
    
    initDb();
  }, []);

  return (
    <AuthProvider>
      <AppProvider>
        <SidebarProvider>
          <AppRoutes />
          <Toaster />
        </SidebarProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
