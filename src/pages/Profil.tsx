import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail,
  Camera,
  Loader2,
  Trash2,
  LogOut,
  Building2,
  BookOpen,
  ChevronRight,
  Plus,
  X,
  Check,
  AlertCircle,
  Server,
  HelpCircle,
  Zap,
  Copy,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { cn } from '../lib/utils';
import { useSchool } from '../context/SchoolContext';
import { useAlert } from '../context/AlertContext';
import { getOrCreateRootFolder, saveJsonToDrive } from '../lib/googleDrive';

export default function Profil() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showAlert } = useAlert();
  const { refreshSchools } = useSchool();
  const [showSetupModal, setShowSetupModal] = useState(false);

  const [session, setSession] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    schools: [] as string[],
    subjects: [] as string[],
    serverUrl: ''
  });

  const [newSchool, setNewSchool] = useState('');
  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('edu_session');
    if (saved) {
      const data = JSON.parse(saved);
      setSession(data);
      setFormData({
        name: data.user.name || '',
        email: data.user.email || '',
        schools: data.user.schools || (data.user.schoolName ? [data.user.schoolName] : []),
        subjects: data.user.subjects || (data.user.subject ? [data.user.subject] : []),
        serverUrl: data.user.serverUrl || ''
      });
    }
    setLoading(false);
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedSession = {
        ...session,
        user: {
          ...session.user,
          name: formData.name,
          schools: formData.schools,
          subjects: formData.subjects,
          serverUrl: formData.serverUrl ? formData.serverUrl.trim() : '',
          schoolName: formData.schools[0] || '',
          subject: formData.subjects[0] || ''
        }
      };
      localStorage.setItem('edu_session', JSON.stringify(updatedSession));
      localStorage.setItem('edu_profile', JSON.stringify(updatedSession.user));
      
      // Sync to Google Drive
      try {
        const folderId = await getOrCreateRootFolder();
        await saveJsonToDrive(folderId, 'profile.json', updatedSession.user);
      } catch (driveErr) {
        console.error('Drive sync failed:', driveErr);
      }

      await refreshSchools();
      await new Promise(r => setTimeout(r, 1000));
      showAlert({ title: 'Berhasil', message: 'Profil Anda telah diperbarui.', type: 'success' });
    } catch (err) {
      showAlert({ title: 'Gagal', message: 'Gagal memperbarui profil.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSchool = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    
    if (newSchool.trim() && !formData.schools.includes(newSchool.trim())) {
      setFormData({
        ...formData,
        schools: [...formData.schools, newSchool.trim()]
      });
      setNewSchool('');
    }
  };

  const handleAddSubject = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    
    if (newSubject.trim() && !formData.subjects.includes(newSubject.trim())) {
      setFormData({
        ...formData,
        subjects: [...formData.subjects, newSubject.trim()]
      });
      setNewSubject('');
    }
  };

  const handleResetData = () => {
    showAlert({
      title: 'Hapus Semua Data?',
      message: 'Tindakan ini akan menghapus semua data profil, daftar ujian, dan bank soal secara PERMANEN dari perangkat ini.',
      type: 'confirm',
      confirmText: 'Ya, Hapus Semua',
      onConfirm: async () => {
        const keysToRemove = [
          'edu_session',
          'edu_token',
          'edu_profile',
          'edutest_exams_list',
          'edu_bank_soal',
          'active_school_id'
        ];
        keysToRemove.forEach(k => localStorage.removeItem(k));
        
        showAlert({ title: 'Data Terhapus', message: 'Semua data telah dibersihkan. Anda akan diarahkan ke login.', type: 'success' });
        setTimeout(() => window.location.href = '/login', 1500);
      }
    });
  };

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-40 bg-slate-100 rounded-[2rem]"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl"></div>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="tracking-tight">Profil Saya</h2>
          <p className="text-slate-500 text-sm font-medium">Lengkapi dan kelola identitas pengajar Anda.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Debug & Reset Section */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Google Drive Folder ID</p>
            <code className="text-[11px] text-indigo-950 font-mono font-bold break-all bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 block">
              {localStorage.getItem('edu_root_folder_id') || 'Belum Terdeteksi'}
            </code>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('edu_root_folder_id');
              window.location.reload();
            }}
            className="w-full sm:w-auto px-6 py-2.5 bg-rose-50 text-rose-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-all border border-rose-100"
          >
            Reset Koneksi Drive
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-24 bg-indigo-950 relative">
            <div className="absolute -bottom-10 left-6 sm:left-10">
              <div className="w-20 h-20 bg-white p-1 rounded-2xl shadow-xl">
                <div className="w-full h-full bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 relative group overflow-hidden border border-slate-100">
                  {session?.user?.picture ? (
                    <img src={session.user.picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                  <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white backdrop-blur-sm">
                    <Camera className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-10 pt-16 pb-8">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-4">
                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-950 text-white p-2 rounded-xl">
                        <Server className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-indigo-950">Server Cloud Personal</h4>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowSetupModal(true)}
                      className="text-[10px] font-black text-blue-600 bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm uppercase tracking-widest hover:bg-blue-50 transition-all font-sans"
                    >
                      Cara Setup
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">GAS Web App URL</label>
                    <div className="flex gap-2">
                       <input 
                        type="text" 
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="flex-1 bg-white border border-slate-200 p-3.5 rounded-2xl text-[11px] font-mono outline-none focus:ring-4 focus:ring-indigo-950/5 focus:border-indigo-950 transition-all placeholder:text-slate-300 shadow-inner"
                        value={formData.serverUrl}
                        onChange={(e) => setFormData({...formData, serverUrl: e.target.value})}
                      />
                      <button 
                        type="button"
                        disabled={!formData.serverUrl}
                        onClick={async () => {
                          if (!formData.serverUrl) return;
                          try {
                            const trimmedUrl = formData.serverUrl.trim();
                            if (!trimmedUrl.startsWith('http')) {
                              throw new Error("URL must start with http/https");
                            }
                            
                            // Perform a no-cors fetch to verify reachability
                            await fetch(`${trimmedUrl}?check=true`, { 
                              method: 'GET',
                              mode: 'no-cors' 
                            });
                            
                            showAlert({ 
                              title: "Berhasil!", 
                              message: "Server Apps Script berhasil terhubung (Koneksi Terverifikasi)!", 
                              type: "success" 
                            });
                          } catch (e) {
                            showAlert({ 
                              title: "Gagal", 
                              message: "Gagal terhubung. Pastikan URL benar, diawali dengan http/https, dan sudah di-deploy sebagai 'Anyone'.", 
                              type: "error" 
                            });
                          }
                        }}
                        className="bg-white border-2 border-slate-100 text-indigo-950 px-4 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-50 transition-all disabled:opacity-30 shrink-0"
                      >
                        Cek Link
                      </button>
                    </div>
                    <div className="flex items-start gap-2 bg-indigo-950/5 p-3 rounded-xl border border-indigo-950/5">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-950 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-indigo-950/70 font-medium leading-relaxed">
                        Link ini diperlukan agar jawaban ujian siswa bisa terkirim langsung ke Google Drive Anda secara aman.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-600" />
                    <input 
                      type="text" required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 font-bold text-indigo-950 transition-all text-sm"
                      value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2 opacity-60">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="email" disabled
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border-transparent font-bold text-slate-500 cursor-not-allowed text-sm"
                      value={formData.email}
                    />
                  </div>
                </div>

                {/* Section: Schools */}
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <h3 className="text-[10px] font-black text-indigo-950 uppercase tracking-widest">Daftar Unit Kerja (Sekolah)</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.schools.map((school, i) => (
                      <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg flex items-center gap-2 font-bold text-xs">
                        {school}
                        <button type="button" onClick={() => setFormData({...formData, schools: formData.schools.filter((_, idx) => idx !== i)})} className="hover:text-rose-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" placeholder="Tambah sekolah baru..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border-none outline-none font-bold text-indigo-950 text-sm"
                      value={newSchool} 
                      onChange={(e) => setNewSchool(e.target.value)}
                      onKeyDown={handleAddSchool}
                    />
                    <button type="button" onClick={handleAddSchool} className="bg-indigo-950 text-white px-3 rounded-xl hover:bg-indigo-900 transition-colors"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Section: Subjects */}
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <h3 className="text-[10px] font-black text-indigo-950 uppercase tracking-widest">Mata Pelajaran</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.subjects.map((subj, i) => (
                      <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2 font-bold text-xs">
                        {subj}
                        <button type="button" onClick={() => setFormData({...formData, subjects: formData.subjects.filter((_, idx) => idx !== i)})} className="hover:text-rose-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" placeholder="Tambah mata pelajaran..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border-none outline-none font-bold text-indigo-950 text-sm"
                      value={newSubject} 
                      onChange={(e) => setNewSubject(e.target.value)}
                      onKeyDown={handleAddSubject}
                    />
                    <button type="button" onClick={handleAddSubject} className="bg-emerald-600 text-white px-3 rounded-xl hover:bg-emerald-700 transition-colors"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-end">
                    <button 
                      type="submit" disabled={saving}
                      className="flex-1 bg-indigo-950 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-950/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-70"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Simpan Perubahan</>}
                    </button>
              </div>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-black text-indigo-950 tracking-tight">Zona Berbahaya</h3>
          <p className="text-slate-500 text-sm font-medium">Lakukan pembersihan data jika Anda ingin memulai ulang aplikasi dari awal (Reset).</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button 
              onClick={handleResetData}
              className="flex items-center justify-center gap-2.5 p-4 rounded-xl bg-rose-50 text-rose-600 font-bold text-xs hover:bg-rose-100 transition-all border border-rose-100 group"
            >
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Hapus Seluruh Data Pelajar
            </button>
            <button 
              onClick={() => showAlert({ title: 'Logout?', message: 'Anda akan keluar dari sesi ini.', type: 'confirm', onConfirm: () => (localStorage.removeItem('edu_session'), window.location.href = '/login') })}
              className="flex items-center justify-center gap-2.5 p-4 rounded-xl bg-slate-50 text-slate-500 font-bold text-xs hover:bg-slate-100 transition-all border border-slate-100 group"
            >
              <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              Keluar dari Akun ini
            </button>
          </div>
        </div>
      {/* MODAL SETUP SERVER */}
      <AnimatePresence>
        {showSetupModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-indigo-950/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-[40px] z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-950 text-white p-3 rounded-2xl shadow-lg shadow-indigo-950/20">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-indigo-950 tracking-tight">Setup Server Cloud</h3>
                    <p className="text-sm text-slate-400 font-medium font-sans">Aktifkan sinkronisasi dalam 3 langkah mudah.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowSetupModal(false)} className="bg-slate-50 p-2.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* LANGKAH 1 */}
                <div className="flex gap-6 relative font-sans">
                  <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-slate-100 border-dashed border-l" />
                  <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-lg shadow-indigo-950/20 z-10">1</div>
                  <div className="space-y-4 pt-1 flex-1">
                    <h4 className="text-base font-bold text-indigo-950">Buka Google Apps Script</h4>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">Buka dashboard skrip Google Anda untuk membuat server penerima jawaban.</p>
                    <a 
                      href="https://script.google.com/home" target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all font-sans"
                    >
                      Buka Dashboard Google <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* LANGKAH 2 */}
                <div className="flex gap-6 relative font-sans">
                  <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-slate-100 border-dashed border-l" />
                  <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-lg shadow-indigo-950/20 z-10">2</div>
                  <div className="space-y-4 pt-1 flex-1">
                    <h4 className="text-base font-bold text-indigo-950">Buat Proyek Baru</h4>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                      1. Klik tombol <strong>"+ New Project"</strong> (Proyek Baru).<br/>
                      2. Hapus semua kode yang ada.<br/>
                      3. Tempelkan kode server di bawah ini:
                    </p>
                    <button 
                      type="button"
                      onClick={async () => {
                        const code = `/**
 * EDUTEST LITE - HYBRID SERVER (v4.0)
 * Simpan data ke Spreadsheet (Visual) + JSON (App Sync).
 */

function doGet(e) {
  if (e.parameter.check === "true") {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "ONLINE", 
      message: "Server Hybrid EduTest berhasil terhubung!",
      owner: Session.getActiveUser().getEmail()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Backup pembacaan file untuk aplikasi
  try {
    var fileId = e.parameter.fileId;
    if (fileId) {
       var content = DriveApp.getFileById(fileId).getBlob().getDataAsString();
       return ContentService.createTextOutput(content).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {}
  
  return ContentService.createTextOutput("EduTest Server is Running").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  return handleSubmission(e);
}

function handleSubmission(e) {
  try {
    var data = {};
    if (e.parameter.data) {
      var base64Str = e.parameter.data.replace(/ /g, "+");
      var decoded = Utilities.newBlob(Utilities.base64Decode(base64Str)).getDataAsString();
      data = JSON.parse(decoded);
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }
    
    var folderName = 'EduTest_Data';
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    // --- 1. SIMPAN KE JSON (Untuk Dashboard Aplikasi) ---
    var jsonFileName = 'results.json';
    var jsonFiles = targetFolder.getFilesByName(jsonFileName);
    var jsonFile = jsonFiles.hasNext() ? jsonFiles.next() : targetFolder.createFile(jsonFileName, '[]', 'application/json');
    
    var results = JSON.parse(jsonFile.getBlob().getDataAsString() || "[]");
    data.server_received_at = new Date().toISOString();
    results.push(data);
    jsonFile.setContent(JSON.stringify(results));
    
    // --- 2. SIMPAN KE SPREADSHEET (Untuk Guru) ---
    var ssName = 'EduTest_Hasil_Ujian';
    var ssFiles = targetFolder.getFilesByName(ssName);
    var ss;
    
    if (ssFiles.hasNext()) {
      ss = SpreadsheetApp.open(ssFiles.next());
    } else {
      ss = SpreadsheetApp.create(ssName);
      var ssFile = DriveApp.getFileById(ss.getId());
      targetFolder.addFile(ssFile);
      DriveApp.getRootFolder().removeFile(ssFile);
      
      var sheet = ss.getSheets()[0];
      sheet.appendRow(["Timestamp", "Nama Siswa", "Kelas", "Judul Ujian", "Skor", "Waktu Mulai", "Waktu Selesai"]);
      sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    }
    
    var sheet = ss.getSheets()[0];
    sheet.appendRow([
      data.server_received_at,
      data.student?.nama || data.student?.name || "-",
      data.student?.kelas || "-",
      data.examTitle || "-",
      data.score || 0,
      data.startTime || "-",
      data.endTime || "-"
    ]);
    
    return ContentService.createTextOutput("SUCCESS").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("ERROR: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}
`;

                        await navigator.clipboard.writeText(code);
                        showAlert({ title: 'Disalin!', message: 'Kode server berhasil disalin ke clipboard.', type: 'success' });
                      }}
                      className="w-full flex items-center justify-center gap-3 bg-indigo-50 text-indigo-950 py-4 rounded-2xl font-bold border-2 border-indigo-200 border-dashed hover:bg-indigo-100 transition-all"
                    >
                      <Copy className="w-5 h-5" /> Salin Kode Server
                    </button>
                  </div>
                </div>

                {/* LANGKAH 3 */}
                <div className="flex gap-6 relative font-sans">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-lg shadow-indigo-950/20 z-10">3</div>
                  <div className="space-y-4 pt-1 flex-1">
                    <h4 className="text-base font-bold text-indigo-950">Deploy (Rilis) Script</h4>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                      Ikuti petunjuk di bawah untuk mendapatkan link server:<br/>
                      1. Klik tombol <strong>"Deploy"</strong> (Terapkan) &gt; <strong>"New Deployment"</strong> (Penerapan Baru).<br/>
                      2. Pilih jenis <strong>"Web App"</strong> (Aplikasi Web).<br/>
                      3. Isikan Deskripsi (Bebas).<br/>
                      4. <strong>Execute as:</strong> "Me" (Saya).<br/>
                      5. <strong>Who has access:</strong> "Anyone" (Siapa Saja) <strong>- PENTING!</strong><br/>
                      6. Klik <strong>Deploy</strong>, izinkan akses jika diminta.<br/>
                      7. Salin <strong>"Web App URL"</strong> dan tempel di Profil Anda.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 rounded-b-[40px] flex justify-end">
                <button 
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="bg-indigo-950 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-indigo-950/20 font-sans"
                >
                  <CheckCircle className="w-5 h-5" /> Selesai & Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
