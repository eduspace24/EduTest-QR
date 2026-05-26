import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  User,
  Menu,
  GraduationCap,
  LogOut,
  LayoutDashboard,
  LayoutGrid,
  Users,
  BarChart3,
  BookOpen,
  PlusCircle,
  ListTodo,
  CheckCircle2,
  X,
  QrCode
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlert } from '../context/AlertContext';
import { useSchool } from '../context/SchoolContext';

interface LayoutProps {
  session: any;
}

export default function Layout({ session }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { showAlert } = useAlert();
  const { schools, activeSchool, setActiveSchool, loading: schoolLoading } = useSchool();

  const userRole = session?.user?.role || 'guru';
  const userName = session?.user?.name || session?.user?.email?.split('@')[0];

  const teacherMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: LayoutGrid, label: 'Kelola Kelas', path: '/kelola-kelas' },
    { icon: Users, label: 'Kelola Siswa', path: '/kelola-siswa' },
    { icon: BookOpen, label: 'Bank Soal', path: '/bank-soal' },
    { icon: PlusCircle, label: 'Buat Ujian', path: '/buat-ujian' },
    { icon: ListTodo, label: 'Daftar Ujian', path: '/daftar-ujian' },
    { icon: CheckCircle2, label: 'Hasil Ujian', path: '/hasil-ujian' },
    { icon: BarChart3, label: 'Analisis', path: '/analisis' },
    { icon: QrCode, label: 'Pindai QR', path: '/scan-qr' },
    { icon: User, label: 'Profil Saya', path: '/profil' },
  ];

  const studentMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: ListTodo, label: 'Ujian Saya', path: '/daftar-ujian' },
    { icon: User, label: 'Profil Saya', path: '/profil' },
  ];

  const menuItems = userRole === 'guru' ? teacherMenuItems : studentMenuItems;

  const handleLogout = () => {
    localStorage.removeItem('edu_session');
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="w-[240px] bg-white/70 backdrop-blur-3xl border-r border-white/40 hidden lg:flex flex-col sticky top-0 h-screen z-40 transition-all duration-300">
        <div className="p-6 flex items-center gap-3 relative z-10">
          <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 p-2 rounded-xl shadow-md text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-indigo-950">Edu<span className="text-blue-600">Test</span> <span className="text-sm font-medium text-slate-400">Lite</span></span>
        </div>

        <nav className="flex-1 px-4 py-3 space-y-1 relative z-10">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                location.pathname === item.path
                  ? "bg-indigo-950 text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-50 hover:text-indigo-950"
              )}
            >
              <item.icon className={cn(
                "w-[18px] h-[18px]",
                location.pathname === item.path ? "text-white" : "text-slate-400 group-hover:text-indigo-950"
              )} />
              <span className="font-bold text-[13px] tracking-wide">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 relative z-10">
          <button
            onClick={() => showAlert({
              title: 'Yakin Ingin Keluar?', message: 'Sesi Anda akan berakhir.',
              type: 'confirm', confirmText: 'Ya, Keluar', onConfirm: handleLogout
            })}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all group"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span className="font-bold text-[13px] tracking-wide">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-scroll overflow-x-hidden relative z-10">
        <header className="h-16 shrink-0 bg-white/60 backdrop-blur-xl shadow-sm flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 border-b border-white/50">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600">
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            
            <div className="flex items-center gap-2.5 p-1 px-3 rounded-full hover:bg-white transition-all">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-white shadow-sm overflow-hidden">
                {session?.user?.picture ? (
                  <img src={session.user.picture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-black text-indigo-950 leading-none">{userName}</p>
                <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-indigo-950/40 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-[101] lg:hidden flex flex-col border-r border-slate-100"
            >
              <div className="p-5 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 p-2 rounded-xl text-white">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <span className="text-lg font-bold tracking-tight text-indigo-950">Edu<span className="text-blue-600">Test</span> <span className="text-xs font-medium text-slate-400">Lite</span></span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-indigo-950">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                      location.pathname === item.path
                        ? "bg-indigo-950 text-white shadow-lg"
                        : "text-slate-500 hover:bg-slate-50 hover:text-indigo-950"
                    )}
                  >
                    <item.icon className={cn(
                      "w-[18px] h-[18px]",
                      location.pathname === item.path ? "text-white" : "text-slate-400 group-hover:text-indigo-950"
                    )} />
                    <span className="font-bold text-[13px] tracking-wide">{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="p-5 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    showAlert({
                      title: 'Yakin Ingin Keluar?', message: 'Sesi Anda akan berakhir.',
                      type: 'confirm', confirmText: 'Ya, Keluar', onConfirm: handleLogout
                    });
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all group"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                  <span className="font-bold text-[13px] tracking-wide">Keluar</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
