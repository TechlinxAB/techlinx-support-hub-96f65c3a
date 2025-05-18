
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';

// Global redirect state to prevent loops with rate limiting
const REDIRECT_STATE = {
  LAST_AUTH_REDIRECT: 0,
  LAST_HOME_REDIRECT: 0,
  REDIRECT_COOLDOWN_MS: 2000,
};

const ProtectedRoute = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toastShownRef = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any pending redirects when unmounting
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Main auth redirection logic
  useEffect(() => {
    // Skip if still loading
    if (loading) {
      return;
    }
    
    // If we're already at the auth page, don't redirect
    if (location.pathname === '/auth') {
      return;
    }
    
    const now = Date.now();
    
    // Check if we need to redirect to auth
    if (!user) {
      // Don't redirect if we've redirected recently (anti-loop)
      if (now - REDIRECT_STATE.LAST_AUTH_REDIRECT < REDIRECT_STATE.REDIRECT_COOLDOWN_MS) {
        return;
      }
      
      REDIRECT_STATE.LAST_AUTH_REDIRECT = now;
      console.log("No authenticated user, redirecting to auth");
      
      // Only show toast once
      if (!toastShownRef.current) {
        toast.error("Please sign in to continue");
        toastShownRef.current = true;
      }
      
      // Use timeout to prevent immediate execution
      redirectTimeoutRef.current = setTimeout(() => {
        navigate('/auth', { replace: true });
        redirectTimeoutRef.current = null;
      }, 100);
    } else {
      // Reset toast flag when user is authenticated
      toastShownRef.current = false;
    }
  }, [user, loading, navigate, location.pathname]);
  
  // Role-based access protection - only runs if user is authenticated
  useEffect(() => {
    // Skip if still loading or no user/profile
    if (loading || !user || !profile) {
      return;
    }
    
    const requiresConsultantRole = location.pathname.includes('company-dashboard-builder');
    
    if (requiresConsultantRole && profile.role !== 'consultant') {
      console.log("Access denied: User is not a consultant");
      toast.error("You don't have permission to access this page");
      
      // Use timeout to avoid immediate redirect conflicts
      redirectTimeoutRef.current = setTimeout(() => {
        navigate('/');
        redirectTimeoutRef.current = null;
      }, 100);
    }
  }, [user, profile, loading, location.pathname, navigate]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return user ? <Outlet /> : null;
};

export default ProtectedRoute;
