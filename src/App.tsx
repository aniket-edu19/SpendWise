import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { useAuth } from './contexts/AuthContext';
import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import CreateGroup from './pages/CreateGroup';
import AddExpense from './pages/AddExpense';
import GroupDetails from './pages/GroupDetails';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import ProfileSetup from './pages/ProfileSetup';
import Layout from './components/Layout';

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Splash />;

  const isSetupRoute = location.pathname === '/setup';

  if (user && !user.hasCompletedSetup && !isSetupRoute) {
    return <Navigate to="/setup" replace />;
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        {!user ? (
          <>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </>
        ) : (
          <>
            <Route path="/setup" element={<ProfileSetup />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/create" element={<CreateGroup />} />
              <Route path="/groups/:id" element={<GroupDetails />} />
              <Route path="/add-expense" element={<AddExpense />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </>
        )}
      </Routes>
    </AnimatePresence>
  );
}
