import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Login/LoginPage';
import { RegisterPage } from './pages/Login/RegisterPage';
import { RiverPage } from './pages/River/RiverPage';
import { AccountingPage } from './pages/Accounting/AccountingPage';
import { MoneyInPage } from './pages/MoneyIn/MoneyInPage';
import { MoneyOutPage } from './pages/MoneyOut/MoneyOutPage';
import { InvestingPage } from './pages/Investing/InvestingPage';
import { RealEstatePage } from './pages/RealEstate/RealEstatePage';

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
        <Route index             element={<RiverPage />} />
        <Route path="accounting" element={<AccountingPage />} />
        <Route path="money-in"   element={<MoneyInPage />} />
        <Route path="money-out"  element={<MoneyOutPage />} />
        <Route path="investing"  element={<InvestingPage />} />
        <Route path="real-estate" element={<RealEstatePage />} />
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
