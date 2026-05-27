import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building2, BookOpen, ChevronRight, Loader2, Sparkles, X, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { cn } from '../lib/utils';
import { getOrCreateRootFolder, saveJsonToDrive } from '../lib/googleDrive';
import { saveCollection } from '../lib/db';

const PRESET_SUBJECTS = [
  'Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA', 'IPS', 'Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Sejarah', 'Geografi', 'Sosiologi', 'Agama Islam', 'Agama Kristen', 'Agama Katolik', 'PJOK', 'Seni Budaya', 'TIK'
];

export default function ProfileSetup() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  
  // Schools State
  const [schools, setSchools] = useState<string[]>([]);
  const [currentSchool, setCurrentSchool] = useState('');
  
  // Subjects State
  const [subjects, setSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState('');
  const [showSubjectInput, setShowSubjectInput] = useState(false);

  const addSchool = () => {
    if (currentSchool.trim() && !schools.includes(currentSchool.trim())) {
      setSchools([...schools, currentSchool.trim()]);
      setCurrentSchool('');
    }
  };

  const removeSchool = (index: number) => {
    setSchools(schools.filter((_, i) => i !== index));
  };

  const togglePresetSubject = (subj: string) => {
    if (subjects.includes(subj)) {
      setSubjects(subjects.filter(s => s !== subj));
    } else {
      setSubjects([...subjects, subj]);
    }
  };

  const addCustomSubject = () => {
    if (customSubject.trim() && !subjects.includes(customSubject.trim())) {
      setSubjects([...subjects, customSubject.trim()]);
      setCustomSubject('');
      setShowSubjectInput(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (schools.length === 0 || subjects.length === 0) {
      alert('Mohon isi minimal satu sekolah dan satu mata pelajaran.');
      return;
    }
    setLoading(true);

    try {
      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const updatedUser = { 
        ...session.user, 
        profileCompleted: true,
        name: name || session.user.name,
        schools: schools,
        subjects: subjects,
        // For backward compatibility or single display
        schoolName: schools[0],
        subject: subjects[0]
      };
      
      localStorage.setItem('edu_session', JSON.stringify({ ...session, user: updatedUser }));
      localStorage.setItem('edu_profile', JSON.stringify(updatedUser));
      
      // Sync to IndexedDB (so sync can track it)
      try {
        await saveCollection('profile', updatedUser);
      } catch (e) {
        console.error('Failed to save profile to IndexedDB:', e);
      }

      // Sync to Google Drive
      try {
        const folderId = await getOrCreateRootFolder();
        await saveJsonToDrive(folderId, 'profile.json', updatedUser);
        console.log('Profile synced to Drive');
      } catch (driveErr) {
        console.error('Failed to sync profile to Drive:', driveErr);
        // We continue anyway since it's saved locally
      }
      
      await new Promise(r => setTimeout(r, 1500));
      window.location.href = '/dashboard';
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 md:p-10 relative z-10 overflow-y-auto max-h-[90vh] custom-scrollbar"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-950 text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-950/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight">Konfigurasi Profil Guru</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Personalisasi pengalaman pengajaran digital Anda.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Section: Basic Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg"><User className="w-3.5 h-3.5" /></div>
              <h3 className="text-sm font-bold text-indigo-950">Nama Lengkap</h3>
            </div>
            <input 
              type="text" required placeholder="Gunakan nama lengkap dan gelar jika perlu"
              className="w-full px-5 py-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-indigo-950 transition-all text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Section: Schools */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg"><Building2 className="w-3.5 h-3.5" /></div>
              <h3 className="text-sm font-bold text-indigo-950">Unit Kerja/Sekolah</h3>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-2">
              <AnimatePresence>
                {schools.map((s, i) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    key={s} className="bg-indigo-950 text-white pl-3 pr-1 py-1 rounded-lg flex items-center gap-2 font-bold text-[11px] shadow-sm"
                  >
                    {s}
                    <button type="button" onClick={() => removeSchool(i)} className="p-1 hover:bg-white/10 rounded-md transition-all"><X className="w-3 h-3" /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {schools.length === 0 && <p className="text-slate-400 text-xs font-medium italic">Belum ada sekolah yang ditambahkan.</p>}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" placeholder="Masukkan nama sekolah..."
                className="flex-1 px-5 py-3 rounded-xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-indigo-950 transition-all text-sm"
                value={currentSchool}
                onChange={(e) => setCurrentSchool(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSchool())}
              />
              <button 
                type="button" onClick={addSchool}
                className="bg-indigo-100 text-indigo-600 px-4 rounded-xl hover:bg-indigo-200 transition-all flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Section: Subjects */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg"><BookOpen className="w-3.5 h-3.5" /></div>
              <h3 className="text-sm font-bold text-indigo-950">Mata Pelajaran</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESET_SUBJECTS.map(subj => (
                <button
                  key={subj} type="button"
                  onClick={() => togglePresetSubject(subj)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                    subjects.includes(subj) 
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
                      : "bg-white text-slate-500 border-slate-200 hover:border-emerald-600 hover:text-emerald-600"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {subjects.includes(subj) && <Check className="w-3 h-3" />}
                    {subj}
                  </div>
                </button>
              ))}

              {/* Custom Subjects added by user */}
              {subjects.filter(s => !PRESET_SUBJECTS.includes(s)).map(subj => (
                <button
                  key={subj} type="button"
                  onClick={() => togglePresetSubject(subj)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white border border-emerald-600 shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3" />
                    {subj}
                  </div>
                </button>
              ))}
              
              {!showSubjectInput ? (
                <button 
                  type="button" onClick={() => setShowSubjectInput(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-dashed border-slate-300 hover:bg-slate-200"
                >
                  + Tambah Lainnya
                </button>
              ) : (
                <div className="flex gap-2 w-full mt-1">
                  <input 
                    type="text" autoFocus placeholder="Nama Mapel Baru..."
                    className="flex-1 px-4 py-2 rounded-xl bg-white border border-emerald-600 outline-none font-bold text-indigo-950 text-sm"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSubject())}
                  />
                  <button type="button" onClick={addCustomSubject} className="bg-emerald-600 text-white px-4 rounded-xl font-bold text-sm">Ok</button>
                </div>
              )}
            </div>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-indigo-950 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all hover:bg-indigo-900 active:scale-95 shadow-xl shadow-indigo-950/20 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Simpan Konfigurasi <ChevronRight className="w-5 h-5" /></>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}