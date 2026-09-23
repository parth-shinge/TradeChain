import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuthContext();

  if (loading) return <LoadingSpinner />;
  
  if (!user) return <Navigate to="/" replace />;
  
  if (!user.approved) {
    return (
      <div className="flex h-screen items-center justify-center bg-light">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-warning mb-4">Pending Approval</h2>
          <p className="text-gray-600">Your account is pending admin approval. Please check back later.</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dashboard = user.role === 'ADMIN' ? '/admin' : `/${user.role.toLowerCase()}`;
    return <Navigate to={dashboard} replace />;
  }

  return children;
}