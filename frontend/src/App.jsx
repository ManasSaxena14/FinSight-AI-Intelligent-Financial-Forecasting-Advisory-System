import React, { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute, { FullScreenLoader } from './components/ProtectedRoute';
import Layout from './components/Layout';

const Landing = React.lazy(() => import('./pages/Landing'));
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

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'rgba(17, 19, 24, 0.92)',
            color: '#eceef1',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px',
            padding: '10px 14px',
            fontSize: '14px',
            fontFamily: 'Geist, system-ui, sans-serif',
            boxShadow: '0 20px 40px -12px rgba(0,0,0,0.7)',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#08090c' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#08090c' } },
        }}
      />
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route path="/welcome" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Suspense fallback={null}><Dashboard /></Suspense>} />
              <Route path="/add-expense" element={<Suspense fallback={null}><AddExpense /></Suspense>} />
              <Route path="/analytics" element={<Suspense fallback={null}><Analytics /></Suspense>} />
              <Route path="/advisor" element={<Suspense fallback={null}><Advisor /></Suspense>} />
              <Route path="/plans" element={<Suspense fallback={null}><Plans /></Suspense>} />
              <Route path="/profile" element={<Suspense fallback={null}><Profile /></Suspense>} />
              <Route path="/goals" element={<Suspense fallback={null}><Goals /></Suspense>} />
              <Route path="/how-it-works" element={<Suspense fallback={null}><HowItWorks /></Suspense>} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
