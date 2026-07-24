import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter, navigate } from '@/components/Router';
import { useEffect } from 'react';
import CaptureFormPage from '@/pages/CaptureFormPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import LeadDetailPage from '@/pages/LeadDetailPage';
import NewLeadPage from '@/pages/NewLeadPage';
import TeamPage from '@/pages/TeamPage';
import ProfilePage from '@/pages/ProfilePage';
import { Zap } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center animate-pulse">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const { route, params } = useRouter();

  useEffect(() => {
    if (loading) return;
    const publicRoutes = ['/', '/login', '/signup'];
    if (!user && route && !publicRoutes.includes(route)) {
      navigate('/login');
    }
    if (user && (route === '/login' || route === '/signup')) {
      navigate('/dashboard');
    }
    if (route === '/') {
      navigate(user ? '/dashboard' : '/');
    }
  }, [user, loading, route]);

  if (loading) return <LoadingScreen />;

  // Public routes
  if (route === '/' || route === null) return <CaptureFormPage />;
  if (route === '/login') return <LoginPage />;
  if (route === '/signup') return <SignupPage />;

  // Protected routes
  if (!user) return <LoadingScreen />;

  if (route === '/dashboard') return <DashboardPage />;
  if (route === '/leads/new') return <NewLeadPage />;
  if (route === '/leads/:id') return <LeadDetailPage leadId={params.id ?? ''} />;
  if (route === '/team') return <TeamPage />;
  if (route === '/profile') return <ProfilePage />;

  return <CaptureFormPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
