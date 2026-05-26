import { Building2, ChevronDown, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSchool } from '../context/SchoolContext';
import { cn } from '../lib/utils';

interface SchoolSwitcherProps {
  className?: string;
}

export default function SchoolSwitcher({ className }: SchoolSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { schools, activeSchool, setActiveSchool, loading } = useSchool();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading || !activeSchool || schools.length <= 1) return null;

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
      >
        <div className="bg-blue-50 text-blue-600 p-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="text-left pr-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Unit Kerja Aktif</p>
          <p className="text-sm font-bold text-indigo-950 truncate max-w-[200px]">{activeSchool.name}</p>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 p-2"
          >
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-4 pb-2">Pilih Unit Kerja</p>
            <div className="space-y-1">
              {schools.map((school) => (
                <button
                  key={school.id}
                  onClick={() => {
                    setActiveSchool(school);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all text-left group",
                    activeSchool.id === school.id 
                      ? "bg-blue-50 text-blue-700" 
                      : "hover:bg-slate-50 text-slate-600"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      activeSchool.id === school.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-indigo-950"
                    )}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold truncate pr-3">{school.name}</span>
                  </div>
                  {activeSchool.id === school.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
