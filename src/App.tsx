import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, Suspense, lazy } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Eagerly loaded core components
import Layout from './components/Layout';

// Lazy loaded pages
const Login = lazy(() => import('./pages/Login'));
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'));
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
const KelolaGuru = lazy(() => import('./pages/KelolaGuru'));
const DistribusiRuang = lazy(() => import('./pages/DistribusiRuang'));

export default function App() {
  const [session, setSession] = useState<any>(() => {
    const saved = localStorage.getItem('edu_session');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const savedSession = localStorage.getItem('edu_session');
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch {}
    }
  }, []);

  const userRole = session?.user?.role || 'guru';
  const isSuperAdmin = userRole === 'superadmin';
  const isMurid = userRole === 'murid' || userRole === 'siswa';
  const isStaff = userRole === 'guru' || isSuperAdmin;
  const profileCompleted = isSuperAdmin || isMurid || !!session?.user?.profileCompleted || !!localStorage.getItem('edu_profile');

  return (
    <Router>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Loader2 className="w-10 h-10 text-indigo-950 animate-spin" />
          </div>
        }>
          <Routes>
            {/* Auth & Setup */}
            <Route path="/login" element={!session ? <Login /> : <Navigate to={isMurid ? "/student/dashboard" : (profileCompleted ? "/dashboard" : "/profil-guru")} />} />
            <Route path="/profil-guru" element={session ? (isSuperAdmin || isMurid ? <Navigate to="/dashboard" /> : <ProfileSetup />) : <Navigate to="/login" />} />
            
            {/* Student Dedicated Portal */}
            <Route path="/student/dashboard" element={
              session ? (
                <Layout session={session} />
              ) : (
                <Navigate to="/login" replace />
              )
            }>
              <Route index element={<StudentDashboard />} />
            </Route>

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
              <Route path="/dashboard" element={isMurid ? <Navigate to="/student/dashboard" replace /> : <Dashboard />} />
              <Route path="/kelola-guru" element={isSuperAdmin ? <KelolaGuru /> : <Navigate to="/dashboard" />} />
              <Route path="/buat-ujian" element={isStaff ? <BuatUjian /> : <Navigate to="/dashboard" />} />
              <Route path="/bank-soal" element={isStaff ? <BankSoal /> : <Navigate to="/dashboard" />} />
              <Route path="/daftar-ujian" element={<DaftarUjian />} />
              <Route path="/hasil-ujian" element={isStaff ? <HasilUjian /> : <Navigate to="/dashboard" />} />
              <Route path="/analisis" element={isStaff ? <Analisis /> : <Navigate to="/dashboard" />} />
              <Route path="/kelola-kelas" element={isSuperAdmin ? <KelolaKelas /> : <Navigate to="/dashboard" />} />
              <Route path="/kelola-siswa" element={isSuperAdmin ? <KelolaSiswa /> : <Navigate to="/dashboard" />} />
              <Route path="/distribusi-ruang" element={isSuperAdmin ? <DistribusiRuang /> : <Navigate to="/dashboard" />} />
              <Route path="/profil" element={<Profil />} />
            </Route>

            {/* Exam & Scan Routes */}
            <Route path="/scan-qr" element={<ScanQR />} />
            <Route path="/test/:teacherId/:examId" element={<StudentExam />} />
            <Route path="/exam/result/:participantId" element={<StudentResult />} />

            {/* Fallbacks */}
            <Route path="/exam" element={<Navigate to="/login" />} />
            <Route path="/" element={<Navigate to={session ? (isMurid ? "/student/dashboard" : (profileCompleted ? "/dashboard" : "/profil-guru")) : "/login"} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}
