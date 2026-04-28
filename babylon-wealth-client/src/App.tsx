import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Login/LoginPage';
import { RegisterPage } from './pages/Login/RegisterPage';
import { RiverPage } from './pages/River/RiverPage';
import { StubPage } from './pages/Stub';

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<RiverPage />} />
        <Route path="ledger"            element={<StubPage name="Ledger" />} />
        <Route path="income"            element={<StubPage name="Income" />} />
        <Route path="spending"          element={<StubPage name="Spending" />} />
        <Route path="investment-income" element={<StubPage name="Passive Income" />} />
        <Route path="real-estate"       element={<StubPage name="Real Estate" />} />
        <Route path="wisdom"            element={<StubPage name="Wisdom" />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
