import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, Suspense, lazy } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { useGoogleDrive } from './context/GoogleDriveContext';

// Eagerly loaded core components
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import Layout from './components/Layout';
import SyncWorker from './components/SyncWorker';

// Lazy loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const BuatUjian = lazy(() => import('./pages/BuatUjian'));
const BankSoal = lazy(() => import('./pages/BankSoal'));
const DaftarUjian = lazy(() => import('./pages/DaftarUjian'));
const HasilUjian = lazy(() => import('./pages/HasilUjian'));
const Analisis = lazy(() => import('./pages/Analisis'));
const Profil = lazy(() => import('./pages/Profil'));
const StudentExam = lazy(() => import('./pages/student/Exam'));
const StudentResult = lazy(() => import('./pages/student/Result'));
const KelolaKelas = lazy(() => import('./pages/KelolaKelas'));
const KelolaSiswa = lazy(() => import('./pages/KelolaSiswa'));
const ScanQR = lazy(() => import('./pages/ScanQR'));

export default function App() {
  const [session, setSession] = useState<any>(() => {
    const saved = localStorage.getItem('edu_session');
    return saved ? JSON.parse(saved) : null;
  });
  const { isInitialized } = useGoogleDrive();

  useEffect(() => {
    const savedSession = localStorage.getItem('edu_session');
    const savedProfile = localStorage.getItem('edu_profile');
    
    let parsedSession = savedSession ? JSON.parse(savedSession) : null;
    
    if (parsedSession?.user && !parsedSession.user.profileCompleted && savedProfile) {
      const driveProfile = JSON.parse(savedProfile);
      parsedSession.user = { ...parsedSession.user, ...driveProfile, profileCompleted: true };
      localStorage.setItem('edu_session', JSON.stringify(parsedSession));
    }
    
    if (JSON.stringify(parsedSession) !== JSON.stringify(session)) {
      setSession(parsedSession);
    }
  }, [isInitialized]);

  const userRole = session?.user?.role || 'guru';
  // Use localStorage as fallback to prevent race condition after fresh login & sync
  const profileCompleted = !!session?.user?.profileCompleted || !!localStorage.getItem('edu_profile');

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-10 w-10 text-indigo-950" />
          <p className="text-slate-500 font-bold animate-pulse text-sm">Menyingkronkan Data...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <SyncWorker />
      <ErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Loader2 className="w-10 h-10 text-indigo-950 animate-spin" />
          </div>
        }>
          <Routes>
            {/* Auth & Setup */}
            <Route path="/login" element={!session ? <Login /> : <Navigate to={profileCompleted ? "/dashboard" : "/profil-guru"} />} />
            <Route path="/profil-guru" element={session ? <ProfileSetup /> : <Navigate to="/login" />} />
            
            {/* Protected Routes with Layout */}
            <Route element={
              session ? (
                profileCompleted ? (
                  <Layout session={session} />
                ) : (
                  <Navigate to="/profil-guru" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }>
              <Route path="/dashboard" element={userRole === 'guru' ? <Dashboard /> : <StudentDashboard />} />
              <Route path="/buat-ujian" element={userRole === 'guru' ? <BuatUjian /> : <Navigate to="/dashboard" />} />
              <Route path="/bank-soal" element={userRole === 'guru' ? <BankSoal /> : <Navigate to="/dashboard" />} />
              <Route path="/daftar-ujian" element={<DaftarUjian />} />
              <Route path="/hasil-ujian" element={userRole === 'guru' ? <HasilUjian /> : <Navigate to="/dashboard" />} />
              <Route path="/analisis" element={userRole === 'guru' ? <Analisis /> : <Navigate to="/dashboard" />} />
              <Route path="/kelola-kelas" element={userRole === 'guru' ? <KelolaKelas /> : <Navigate to="/dashboard" />} />
              <Route path="/kelola-siswa" element={userRole === 'guru' ? <KelolaSiswa /> : <Navigate to="/dashboard" />} />
              <Route path="/profil" element={<Profil />} />
            </Route>

            {/* Exam & Scan Routes */}
            <Route path="/scan-qr" element={<ScanQR />} />
            <Route path="/test/:teacherId/:examId" element={<StudentExam />} />
            <Route path="/exam/result/:participantId" element={<StudentResult />} />

            {/* Fallback */}
            <Route path="/exam" element={<Navigate to="/login" />} />
            <Route path="/" element={<Navigate to={session ? (profileCompleted ? "/dashboard" : "/profil-guru") : "/login"} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}
