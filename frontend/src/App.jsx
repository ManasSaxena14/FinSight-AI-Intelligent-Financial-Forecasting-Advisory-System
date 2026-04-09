import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const AddExpense = React.lazy(() => import('./pages/AddExpense'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Advisor = React.lazy(() => import('./pages/Advisor'));
const Plans = React.lazy(() => import('./pages/Plans'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Goals = React.lazy(() => import('./pages/Goals'));
const HowItWorks = React.lazy(() => import('./pages/HowItWorks'));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a]">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#d4af37] border-t-transparent"></div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'premium-toast',
          duration: 4000,
          style: {
            background: 'rgba(17, 17, 17, 0.8)',
            color: '#ffffff',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            padding: '16px 24px',
            fontSize: '13px',
            fontWeight: '900',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 20px rgba(212, 175, 55, 0.05)',
            fontFamily: 'Outfit, system-ui, sans-serif',
          },
          success: {
            iconTheme: {
              primary: '#d4af37',
              secondary: '#111111',
            },
            style: {
              border: '1px solid rgba(212, 175, 55, 0.2)',
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#111111',
            },
            style: {
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }
          },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes enclosed by Dashboard Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add-expense" element={<AddExpense />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/advisor" element={<Advisor />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
