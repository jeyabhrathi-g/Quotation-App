import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerDetails from './pages/CustomerDetails';
import ProductDashboard from './pages/ProductDashboard';
import ProductDetails from './pages/ProductDetails';
import QuotationDashboard from './pages/QuotationDashboard';
import QuotationBuilder from './pages/QuotationBuilder';
import InvoiceDashboard from './pages/InvoiceDashboard';
import Settings from './pages/Settings';
import './App.css';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, role } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && role !== allowedRole) return <Navigate to="/" replace />;

  return children;
};

function AppRoutes() {
  const { user, role } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            {role?.toLowerCase() === 'admin' ? <CustomerDashboard /> : <div>User Dashboard (Coming Soon)</div>}
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/customers/:id" element={
        <ProtectedRoute allowedRole="admin">
          <Layout>
            <CustomerDetails />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Full routes for Admin modules */}
      <Route path="/products" element={<ProtectedRoute allowedRole="admin"><Layout><ProductDashboard /></Layout></ProtectedRoute>} />
      <Route path="/products/:id" element={<ProtectedRoute allowedRole="admin"><Layout><ProductDetails /></Layout></ProtectedRoute>} />
      <Route path="/quotations" element={<ProtectedRoute allowedRole="admin"><Layout><QuotationDashboard /></Layout></ProtectedRoute>} />
      <Route path="/quotations/new" element={<ProtectedRoute allowedRole="admin"><Layout><QuotationBuilder /></Layout></ProtectedRoute>} />
      <Route path="/quotations/edit/:id" element={<ProtectedRoute allowedRole="admin"><Layout><QuotationBuilder /></Layout></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute allowedRole="admin"><Layout><InvoiceDashboard /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute allowedRole="admin"><Layout><Settings /></Layout></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
