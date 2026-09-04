import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, 
  Users, 
  Shuffle, 
  Printer, 
  Download, 
  CheckCircle2, 
  Layers, 
  UserCheck, 
  PlusCircle, 
  Trash2, 
  RefreshCw, 
  Grid, 
  Eye, 
  Search, 
  Check, 
  X, 
  ChevronRight, 
  GraduationCap, 
  FileText, 
  Calendar, 
  Clock, 
  Edit3,
  Sliders,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { getCollectionData, saveCollection } from '../lib/db';
import { formatStudentName, formatPersonName, cn } from '../lib/utils';
import { useAlert } from '../context/AlertContext';

interface Student {
  id: string;
  nama: string;
  nisn: string;
  email: string;
  nama_kelas: string;
  nomor_absen?: string;
  foto_url?: string;
  grade?: 'X' | 'XI' | 'XII' | 'OTHER';
}

interface AssignedSeat {
  seat_number: number;
  student: Student;
  grade: 'X' | 'XI' | 'XII' | 'OTHER';
}

interface ExamRoom {
  id: string;
  room_number: number;
  name: string;
  capacity: number;
  pengawas_1: string;
  pengawas_2: string;
  seats: AssignedSeat[];
}

interface CustomProctor {
  id: string;
  nama: string;
  keterangan: string;
}

interface ProctorOption {
  id: string;
  nama: string;
  badge: string;
  isOfficial: boolean;
}

export default function DistribusiRuang() {
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<'config' | 'proctors' | 'print'>('config');

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Configuration States
  const [selectedGrades, setSelectedGrades] = useState<string[]>(['X', 'XI']);
  const [distributionMode, setDistributionMode] = useState<'capacity' | 'rooms'>('capacity');
  const [capacityPerRoom, setCapacityPerRoom] = useState<number>(36);
  const [targetRoomsCount, setTargetRoomsCount] = useState<number>(24);
  const [seatingPattern, setSeatingPattern] = useState<'alternate_column' | 'zigzag'>('alternate_column');

  // Distribution Results
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [selectedRoomDetail, setSelectedRoomDetail] = useState<ExamRoom | null>(null);

  // Custom Proctors (PPL, Eksternal, Mahasiswa Magang)
  const [customProctors, setCustomProctors] = useState<CustomProctor[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('edu_custom_proctors') || '[]');
    } catch {
      return [];
    }
  });
  const [showAddProctorModal, setShowAddProctorModal] = useState(false);
  const [newProctorName, setNewProctorName] = useState('');
  const [newProctorDesc, setNewProctorDesc] = useState('Mahasiswa PPL');

  // Print Mode States
  const [printDocType, setPrintDocType] = useState<'kartu' | 'denah' | 'presensi'>('kartu');
  const [printFilterRoom, setPrintFilterRoom] = useState<string>('ALL');

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        let stuData = await getCollectionData('students');
        if (!stuData || stuData.length === 0) {
          const res = await fetch('/seed_murids.json');
          if (res.ok) {
            stuData = await res.json();
            await saveCollection('students', stuData);
          }
        }

        let tchData = await getCollectionData('teachers');
        if (!tchData || tchData.length === 0) {
          const res = await fetch('/seed_gurus.json');
          if (res.ok) {
            tchData = await res.json();
            await saveCollection('teachers', tchData);
          }
        }

        // Add parsed grade
        const mappedStudents: Student[] = (stuData || []).map((s: any) => {
          const k = (s.nama_kelas || s.kelas || '').toUpperCase().trim();
          let g: 'X' | 'XI' | 'XII' | 'OTHER' = 'OTHER';
          if (k.startsWith('XII') || k.includes('12')) g = 'XII';
          else if (k.startsWith('XI') || k.includes('11')) g = 'XI';
          else if (k.startsWith('X') || k.includes('10')) g = 'X';
          return {
            ...s,
            grade: g
          };
        });

        setStudents(mappedStudents);
        setTeachers(tchData || []);

        // Load existing distribution if stored
        const storedRooms = await getCollectionData('exam_rooms_distribution');
        if (storedRooms && storedRooms.length > 0) {
          setRooms(storedRooms);
        }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter available students matching selected grades
  const eligibleStudents = useMemo(() => {
    return students.filter(s => s.grade && selectedGrades.includes(s.grade));
  }, [students, selectedGrades]);

  const studentsByGrade = useMemo(() => {
    const grouped: Record<string, Student[]> = { X: [], XI: [], XII: [] };
    eligibleStudents.forEach(s => {
      if (s.grade && grouped[s.grade]) {
        grouped[s.grade].push(s);
      }
    });
    return grouped;
  }, [eligibleStudents]);

  // Handle Add Custom Proctor
  const handleAddCustomProctor = () => {
    if (!newProctorName.trim()) return;
    const item: CustomProctor = {
      id: `proctor_${Date.now()}`,
      nama: newProctorName.trim(),
      keterangan: newProctorDesc.trim() || 'Pengawas Eksternal'
    };
    const updated = [...customProctors, item];
    setCustomProctors(updated);
    localStorage.setItem('edu_custom_proctors', JSON.stringify(updated));
    setNewProctorName('');
    setShowAddProctorModal(false);
    showAlert({ title: 'Pengawas Ditambahkan', message: `${item.nama} siap ditugaskan ke ruangan.`, type: 'success' });
  };

  const handleDeleteCustomProctor = (id: string) => {
    const updated = customProctors.filter(p => p.id !== id);
    setCustomProctors(updated);
    localStorage.setItem('edu_custom_proctors', JSON.stringify(updated));
  };

  // Combine official teachers + custom proctors
  const allAvailableProctors: ProctorOption[] = useMemo(() => {
    const official: ProctorOption[] = teachers.map(t => ({
      id: String(t.id || t.email || Math.random()),
      nama: formatPersonName(t.nama || t.name, 'guru'),
      badge: t.mata_pelajaran || 'Guru SMAN 19',
      isOfficial: true
    }));
    const custom: ProctorOption[] = customProctors.map(c => ({
      id: c.id,
      nama: c.nama,
      badge: c.keterangan || 'Pengawas Kustom',
      isOfficial: false
    }));
    return [...official, ...custom];
  }, [teachers, customProctors]);

  // Fisher-Yates shuffle
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Generate Rooms with Cross-Grade Interleaving
  const handleGenerateDistribution = async () => {
    if (eligibleStudents.length === 0) {
      showAlert({ title: 'Murid Kosong', message: 'Tidak ada murid yang cocok dengan jenjang terpilih.', type: 'warning' });
      return;
    }

    if (selectedGrades.length < 2) {
      showAlert({ 
        title: 'Pilih Minimal 2 Jenjang', 
        message: 'Pengacakan bersilang membutuhkan minimal 2 jenjang (contoh: Kelas X & Kelas XI).', 
        type: 'warning' 
      });
      return;
    }

    // Determine total rooms count & capacity
    let totalRooms = 1;
    let capPerRoom = capacityPerRoom;

    if (distributionMode === 'capacity') {
      capPerRoom = Math.max(4, Number(capacityPerRoom) || 36);
      totalRooms = Math.ceil(eligibleStudents.length / capPerRoom);
    } else {
      totalRooms = Math.max(1, Number(targetRoomsCount) || 24);
      capPerRoom = Math.ceil(eligibleStudents.length / totalRooms);
    }

    // Shuffle each grade pool independently to mix classes
    const gradePools: Record<string, Student[]> = {};
    selectedGrades.forEach(g => {
      gradePools[g] = shuffleArray(studentsByGrade[g] || []);
    });

    const newRooms: ExamRoom[] = [];
    const gradeA = selectedGrades[0];
    const gradeB = selectedGrades[1];

    let poolAIndex = 0;
    let poolBIndex = 0;

    for (let r = 1; r <= totalRooms; r++) {
      const roomSeats: AssignedSeat[] = [];
      const roomCapacity = capPerRoom;

      for (let s = 1; s <= roomCapacity; s++) {
        let assignedStudent: Student | null = null;
        let assignedGrade: 'X' | 'XI' | 'XII' | 'OTHER' = gradeA as any;

        // Determine which grade sits here based on pattern
        let targetGradeForSeat = gradeA;
        if (seatingPattern === 'alternate_column') {
          // Odd seats = Grade A, Even seats = Grade B
          targetGradeForSeat = (s % 2 !== 0) ? gradeA : gradeB;
        } else {
          // Zigzag / Chessboard (Row by col, assume 4 cols)
          const row = Math.floor((s - 1) / 4);
          const col = (s - 1) % 4;
          targetGradeForSeat = ((row + col) % 2 === 0) ? gradeA : gradeB;
        }

        if (targetGradeForSeat === gradeA && poolAIndex < gradePools[gradeA].length) {
          assignedStudent = gradePools[gradeA][poolAIndex++];
          assignedGrade = gradeA as any;
        } else if (targetGradeForSeat === gradeB && poolBIndex < gradePools[gradeB].length) {
          assignedStudent = gradePools[gradeB][poolBIndex++];
          assignedGrade = gradeB as any;
        } else if (poolAIndex < gradePools[gradeA].length) {
          // Fallback if poolB is exhausted
          assignedStudent = gradePools[gradeA][poolAIndex++];
          assignedGrade = gradeA as any;
        } else if (poolBIndex < gradePools[gradeB].length) {
          // Fallback if poolA is exhausted
          assignedStudent = gradePools[gradeB][poolBIndex++];
          assignedGrade = gradeB as any;
        }

        if (assignedStudent) {
          roomSeats.push({
            seat_number: s,
            student: assignedStudent,
            grade: assignedGrade
          });
        }
      }

      const roomName = `Ruang ${String(r).padStart(2, '0')}`;
      newRooms.push({
        id: `room_${r}_${Date.now()}`,
        room_number: r,
        name: roomName,
        capacity: roomCapacity,
        pengawas_1: '',
        pengawas_2: '',
        seats: roomSeats
      });
    }

    setRooms(newRooms);
    await saveCollection('exam_rooms_distribution', newRooms);
    showAlert({
      title: 'Pengacakan Berhasil!',
      message: `${eligibleStudents.length} murid berhasil diacak dan didistribusikan secara bersilang ke ${newRooms.length} ruangan.`,
      type: 'success'
    });
  };

  // Auto assign proctors randomly
  const handleAutoAssignProctors = () => {
    if (rooms.length === 0) {
      showAlert({ title: 'Belum Ada Ruangan', message: 'Bentuk ruangan terlebih dahulu.', type: 'warning' });
      return;
    }

    const shuffled: ProctorOption[] = shuffleArray<ProctorOption>(allAvailableProctors);
    let pIdx = 0;

    const updatedRooms = rooms.map(room => {
      const p1 = shuffled[pIdx % shuffled.length]?.nama || '';
      pIdx++;
      const p2 = shuffled[pIdx % shuffled.length]?.nama || '';
      pIdx++;
      return {
        ...room,
        pengawas_1: p1,
        pengawas_2: p2
      };
    });

    setRooms(updatedRooms);
    saveCollection('exam_rooms_distribution', updatedRooms);
    showAlert({ title: 'Pengawas Terdistribusi', message: `Pengawas 1 & 2 berhasil diacak ke ${rooms.length} ruangan.`, type: 'success' });
  };

  // Update proctor manually
  const handleUpdateRoomProctor = (roomId: string, field: 'pengawas_1' | 'pengawas_2', value: string) => {
    const updated = rooms.map(r => r.id === roomId ? { ...r, [field]: value } : r);
    setRooms(updated);
    saveCollection('exam_rooms_distribution', updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin text-indigo-950">
          <RefreshCw className="w-8 h-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-100 text-indigo-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Sistem ASAT Bersilang
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">
            Distribusi Ruang & Pengawas Ujian
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Atur pengacakan tempat duduk bersilang antar jenjang (anti-nyontek) dan penugasan pengawas ruang resmi/PPL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {rooms.length > 0 && (
            <button
              onClick={() => setActiveTab('print')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" /> Cetak Dokumen Ujian
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        {[
          { id: 'config', label: '1. Pengacakan Ruangan Silang', icon: Sliders },
          { id: 'proctors', label: `2. Penugasan Pengawas (${rooms.length} Ruang)`, icon: UserCheck, disabled: rooms.length === 0 },
          { id: 'print', label: '3. Cetak Kartu, Denah & Presensi', icon: Printer, disabled: rooms.length === 0 }
        ].map(tab => (
          <button
            key={tab.id}
            disabled={tab.disabled}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === tab.id
                ? "bg-indigo-950 text-white shadow-sm"
                : tab.disabled
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: KONFIGURASI & PENGACAKAN RUANG */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel Pengaturan */}
            <div className="lg:col-span-1 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-5">
              <h3 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" /> Parameter Acak Bersilang
              </h3>

              {/* 1. Pemilihan Jenjang Bersilang */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Pilih Jenjang yang Digabung:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'X', label: 'Kelas X' },
                    { id: 'XI', label: 'Kelas XI' },
                    { id: 'XII', label: 'Kelas XII' }
                  ].map(g => {
                    const isSelected = selectedGrades.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (selectedGrades.length > 1) {
                              setSelectedGrades(selectedGrades.filter(x => x !== g.id));
                            }
                          } else {
                            setSelectedGrades([...selectedGrades, g.id]);
                          }
                        }}
                        className={cn(
                          "py-2 px-3 rounded-xl border text-xs font-black transition-all",
                          isSelected
                            ? "bg-indigo-950 text-white border-indigo-950 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  💡 Standar ASAT: Pilih minimal 2 jenjang (misal X & XI) untuk duduk bersilang.
                </p>
              </div>

              {/* 2. Mode Distribusi (Kapasitas vs Jumlah Ruang) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700">Metode Pembagian Ruang:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDistributionMode('capacity')}
                    className={cn(
                      "p-2.5 rounded-xl border text-left text-xs font-bold transition-all",
                      distributionMode === 'capacity'
                        ? "border-blue-600 bg-blue-50/40 text-blue-950 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <p className="font-black text-xs">Kapasitas Meja</p>
                    <p className="text-[10px] text-slate-400 font-medium">Berdasarkan isi per ruang</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistributionMode('rooms')}
                    className={cn(
                      "p-2.5 rounded-xl border text-left text-xs font-bold transition-all",
                      distributionMode === 'rooms'
                        ? "border-blue-600 bg-blue-50/40 text-blue-950 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <p className="font-black text-xs">Jumlah Ruang</p>
                    <p className="text-[10px] text-slate-400 font-medium">Bagi rata ke N ruangan</p>
                  </button>
                </div>

                {distributionMode === 'capacity' ? (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-600">Kapasitas Meja per Ruang:</label>
                      <span className="text-xs font-black text-blue-600">{capacityPerRoom} Meja</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[20, 24, 30, 36].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCapacityPerRoom(val)}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg border text-xs font-black transition-all",
                            capacityPerRoom === val
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-600 border-slate-200"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={4}
                      max={60}
                      value={capacityPerRoom}
                      onChange={(e) => setCapacityPerRoom(parseInt(e.target.value) || 20)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 font-bold text-xs text-indigo-950 bg-slate-50"
                      placeholder="Atau ketik kapasitas custom..."
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[11px] font-bold text-slate-600">Target Jumlah Ruangan Tersedia:</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={targetRoomsCount}
                      onChange={(e) => setTargetRoomsCount(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-xs text-indigo-950 bg-slate-50"
                      placeholder="Contoh: 24 ruangan"
                    />
                    <p className="text-[10px] text-slate-400">
                      Sistem akan membagi rata ~{Math.ceil(eligibleStudents.length / (targetRoomsCount || 1))} murid per ruang.
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Pola Duduk Silang */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700">Pola Duduk Bersilang:</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="seatingPattern"
                      value="alternate_column"
                      checked={seatingPattern === 'alternate_column'}
                      onChange={() => setSeatingPattern('alternate_column')}
                      className="accent-indigo-950"
                    />
                    <div>
                      <p className="text-xs font-bold text-indigo-950">Kolom Berselang-Seling</p>
                      <p className="text-[10px] text-slate-400">Meja ganjil ({selectedGrades[0]}) - Meja genap ({selectedGrades[1]})</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="seatingPattern"
                      value="zigzag"
                      checked={seatingPattern === 'zigzag'}
                      onChange={() => setSeatingPattern('zigzag')}
                      className="accent-indigo-950"
                    />
                    <div>
                      <p className="text-xs font-bold text-indigo-950">Pola Catur / Zig-Zag</p>
                      <p className="text-[10px] text-slate-400">Kanan-kiri dan depan-belakang selalu berbeda jenjang</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Tombol Eksekusi */}
              <button
                onClick={handleGenerateDistribution}
                className="w-full bg-indigo-950 hover:bg-indigo-900 text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <Shuffle className="w-4 h-4" /> Bentuk & Acak Ruangan Sekarang
              </button>
            </div>

            {/* Panel Ringkasan & Ruang yang Terbentuk */}
            <div className="lg:col-span-2 space-y-5">
              {/* Statistik Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Murid</p>
                  <p className="text-xl font-black text-indigo-950 mt-1">{eligibleStudents.length}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {selectedGrades.map(g => `${g}: ${studentsByGrade[g]?.length || 0}`).join(' • ')}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumlah Ruangan</p>
                  <p className="text-xl font-black text-blue-600 mt-1">{rooms.length}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{rooms.length > 0 ? 'Ruang Ujian' : 'Belum diacak'}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rata-rata/Ruang</p>
                  <p className="text-xl font-black text-emerald-600 mt-1">
                    {rooms.length > 0 ? Math.round(eligibleStudents.length / rooms.length) : capacityPerRoom}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Murid per ruang</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Acak</p>
                  <p className="text-xl font-black text-purple-600 mt-1">
                    {rooms.length > 0 ? 'Bersilang' : 'Standby'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Fisher-Yates 100%</p>
                </div>
              </div>

              {/* Grid Ruangan */}
              {rooms.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 border-dashed">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="font-bold text-indigo-950 text-base">Belum Ada Ruangan yang Dibentuk</h4>
                  <p className="text-slate-400 text-xs max-w-md mx-auto mt-1">
                    Silakan tentukan jenjang dan kapasitas meja di panel kiri, lalu klik <strong>"Bentuk & Acak Ruangan Sekarang"</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-indigo-950 text-sm">Daftar Ruang Ujian ({rooms.length} Ruang)</h3>
                    <span className="text-[11px] text-slate-400 font-medium">Klik ruang untuk melihat denah tempat duduk</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {rooms.map(room => {
                      const countA = room.seats.filter(s => s.grade === selectedGrades[0]).length;
                      const countB = room.seats.filter(s => s.grade === selectedGrades[1]).length;

                      return (
                        <div
                          key={room.id}
                          onClick={() => setSelectedRoomDetail(room)}
                          className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-black text-indigo-950 text-sm group-hover:text-blue-600 transition-colors">
                                {room.name}
                              </span>
                              <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                                {room.seats.length} / {room.capacity} Meja
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-3">
                              <span className="bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded text-[10px]">
                                Kelas {selectedGrades[0]}: {countA}
                              </span>
                              <span className="bg-purple-50 text-purple-900 px-2 py-0.5 rounded text-[10px]">
                                Kelas {selectedGrades[1]}: {countB}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-medium truncate max-w-[150px]">
                              {room.pengawas_1 ? `Pengawas: ${room.pengawas_1.split(' ')[0]}` : 'Belum ada pengawas'}
                            </span>
                            <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                              Denah <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAJEMEN PENGAWAS RUANG */}
      {activeTab === 'proctors' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="font-bold text-indigo-950 text-sm">Penugasan Pengawas Ruang</h3>
              <p className="text-slate-400 text-xs font-medium mt-0.5">
                Pilih pengawas dari 48 guru resmi atau tambah pengawas kustom (PPL / Mahasiswa / Eksternal).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddProctorModal(true)}
                className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" /> + Pengawas Kustom / PPL
              </button>
              <button
                onClick={handleAutoAssignProctors}
                className="px-4 py-2 bg-indigo-950 text-white hover:bg-indigo-900 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Shuffle className="w-3.5 h-3.5" /> Acak Pengawas Otomatis
              </button>
            </div>
          </div>

          {/* Daftar Pengawas Kustom Aktif */}
          {customProctors.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 mr-2">Pengawas Kustom/PPL:</span>
              {customProctors.map(p => (
                <div key={p.id} className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-950 flex items-center gap-2">
                  <span>{p.nama} ({p.keterangan})</span>
                  <button onClick={() => handleDeleteCustomProctor(p.id)} className="text-slate-400 hover:text-rose-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tabel Penugasan Pengawas */}
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Ruang Ujian</th>
                    <th className="py-3 px-4">Kapasitas</th>
                    <th className="py-3 px-4">Jumlah Peserta</th>
                    <th className="py-3 px-4">Pengawas 1 (Utama)</th>
                    <th className="py-3 px-4">Pengawas 2 (Pendamping)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {rooms.map(room => (
                    <tr key={room.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-black text-indigo-950">{room.name}</td>
                      <td className="py-3.5 px-4 font-bold">{room.capacity} Meja</td>
                      <td className="py-3.5 px-4 font-bold text-blue-600">{room.seats.length} Murid</td>
                      <td className="py-3.5 px-4">
                        <select
                          value={room.pengawas_1}
                          onChange={(e) => handleUpdateRoomProctor(room.id, 'pengawas_1', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl font-bold text-xs text-indigo-950 outline-none"
                        >
                          <option value="">-- Pilih Pengawas 1 --</option>
                          {allAvailableProctors.map(p => (
                            <option key={p.id} value={p.nama}>
                              {p.nama} ({p.badge})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={room.pengawas_2}
                          onChange={(e) => handleUpdateRoomProctor(room.id, 'pengawas_2', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl font-bold text-xs text-indigo-950 outline-none"
                        >
                          <option value="">-- Pilih Pengawas 2 --</option>
                          {allAvailableProctors.map(p => (
                            <option key={p.id} value={p.nama}>
                              {p.nama} ({p.badge})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CETAK DOKUMEN UJIAN */}
      {activeTab === 'print' && (
        <div className="space-y-6">
          {/* Print Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Jenis Dokumen:</span>
              {[
                { id: 'kartu', label: 'Kartu Peserta Ujian', icon: GraduationCap },
                { id: 'denah', label: 'Denah Ruang & Meja', icon: Grid },
                { id: 'presensi', label: 'Daftar Hadir & Berita Acara', icon: FileText }
              ].map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setPrintDocType(doc.id as any)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                    printDocType === doc.id
                      ? "bg-indigo-950 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <doc.icon className="w-3.5 h-3.5" />
                  {doc.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={printFilterRoom}
                onChange={e => setPrintFilterRoom(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-indigo-950 px-3 py-2 rounded-xl outline-none"
              >
                <option value="ALL">Semua Ruangan ({rooms.length})</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.name}>{r.name} ({r.seats.length} Murid)</option>
                ))}
              </select>

              <button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4" /> Cetak Sekarang (A4)
              </button>
            </div>
          </div>

          {/* DOKUMEN CETAK 1: KARTU PESERTA UJIAN (6 KARTU PER LEMBAR A4) */}
          {printDocType === 'kartu' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid print:grid-cols-2 print:gap-3">
                {rooms
                  .filter(r => printFilterRoom === 'ALL' || r.name === printFilterRoom)
                  .flatMap(r => r.seats.map(s => ({ ...s, room_name: r.name })))
                  .map((seat, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-2xl border-2 border-slate-200 print:border-slate-400 print:rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden"
                    >
                      {/* Kop Kartu */}
                      <div className="flex items-center gap-3 pb-2.5 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-indigo-950 text-white flex items-center justify-center font-black text-xs shrink-0">
                          19
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-black text-indigo-950 text-[11px] leading-tight">SMAN 19 BANDUNG</h5>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Kartu Peserta ASAT 2026/2027</p>
                        </div>
                        <span className="text-[9px] font-black bg-indigo-50 text-indigo-950 px-2 py-0.5 rounded">
                          Kelas {seat.grade}
                        </span>
                      </div>

                      {/* Isi Kartu */}
                      <div className="py-3 flex items-center justify-between gap-3">
                        <div className="space-y-1 text-xs">
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Nama Peserta</p>
                            <p className="font-black text-indigo-950 line-clamp-1 text-xs">{formatStudentName(seat.student.nama)}</p>
                          </div>
                          <div className="flex gap-4">
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">NIS / NISN</p>
                              <p className="font-bold text-slate-700 text-xs">{seat.student.nisn || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">Kelas Asal</p>
                              <p className="font-bold text-slate-700 text-xs">{seat.student.nama_kelas}</p>
                            </div>
                          </div>
                        </div>

                        {/* QR Code login */}
                        <div className="p-1 bg-white border border-slate-200 rounded-lg shrink-0">
                          <QRCodeSVG 
                            value={JSON.stringify({ code: seat.student.nisn, n: seat.student.nama })} 
                            size={52} 
                          />
                        </div>
                      </div>

                      {/* Footer Kartu (Ruang & No Meja) */}
                      <div className="pt-2 border-t border-slate-100 bg-slate-50/80 -mx-4 -mb-4 p-2.5 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-blue-600" />
                          <span className="text-xs font-black text-blue-900">{seat.room_name}</span>
                        </div>
                        <div className="bg-indigo-950 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md">
                          MEJA {String(seat.seat_number).padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* DOKUMEN CETAK 2: DENAH RUANG & MEJA */}
          {printDocType === 'denah' && (
            <div className="space-y-8">
              {rooms
                .filter(r => printFilterRoom === 'ALL' || r.name === printFilterRoom)
                .map(room => (
                  <div key={room.id} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm print:border-none print:p-0 page-break">
                    {/* Header Denah */}
                    <div className="text-center pb-4 border-b-2 border-slate-900 mb-6">
                      <h3 className="text-lg font-black text-indigo-950">DENAH TEMPAT DUDUK ASAT</h3>
                      <h4 className="text-xl font-black text-blue-700 mt-0.5">{room.name} • SMAN 19 BANDUNG</h4>
                      <p className="text-xs font-bold text-slate-500 mt-1">
                        Kapasitas: {room.capacity} Meja • Terisi: {room.seats.length} Murid (Sistem Bersilang)
                      </p>
                    </div>

                    {/* Simbol Depan / Meja Pengawas & Pintu */}
                    <div className="flex items-center justify-between bg-slate-100 p-3 rounded-2xl mb-8 border border-slate-200">
                      <div className="font-bold text-xs text-slate-500 px-3 py-1 bg-white rounded-lg border border-slate-200">
                        🚪 PINTU MASUK
                      </div>
                      <div className="font-black text-xs text-indigo-950 px-6 py-1.5 bg-indigo-950 text-white rounded-lg">
                        MEJA PENGAWAS RUANG
                      </div>
                      <div className="font-bold text-xs text-slate-500 px-3 py-1 bg-white rounded-lg border border-slate-200">
                        PAPAN TULIS
                      </div>
                    </div>

                    {/* Grid Meja Duduk Silang */}
                    <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-8">
                      {room.seats.map(seat => {
                        const isGradeA = seat.grade === selectedGrades[0];
                        return (
                          <div
                            key={seat.seat_number}
                            className={cn(
                              "p-3 rounded-xl border-2 flex flex-col justify-between text-center min-h-[90px]",
                              isGradeA 
                                ? "bg-indigo-50/50 border-indigo-300 text-indigo-950" 
                                : "bg-purple-50/50 border-purple-300 text-purple-950"
                            )}
                          >
                            <div className="flex justify-between items-center text-[10px] font-black">
                              <span className="px-1.5 py-0.5 bg-white rounded border">No. {seat.seat_number}</span>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-white font-bold",
                                isGradeA ? "bg-indigo-950" : "bg-purple-900"
                              )}>
                                {seat.grade}
                              </span>
                            </div>
                            <div className="my-1">
                              <p className="font-black text-xs line-clamp-1">{formatStudentName(seat.student.nama)}</p>
                              <p className="text-[10px] font-medium text-slate-500">{seat.student.nama_kelas}</p>
                            </div>
                            <p className="text-[9px] font-mono text-slate-400">{seat.student.nisn}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Tanda Tangan Pengawas */}
                    <div className="flex justify-between pt-6 border-t border-slate-200 text-xs">
                      <div className="text-center w-48">
                        <p className="font-bold text-slate-500 mb-12">Pengawas 1,</p>
                        <p className="font-black text-indigo-950 underline">{room.pengawas_1 || '( ..................................... )'}</p>
                      </div>
                      <div className="text-center w-48">
                        <p className="font-bold text-slate-500 mb-12">Pengawas 2,</p>
                        <p className="font-black text-indigo-950 underline">{room.pengawas_2 || '( ..................................... )'}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* DOKUMEN CETAK 3: PRESENSI & BERITA ACARA */}
          {printDocType === 'presensi' && (
            <div className="space-y-8">
              {rooms
                .filter(r => printFilterRoom === 'ALL' || r.name === printFilterRoom)
                .map(room => (
                  <div key={room.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm print:border-none print:p-0 page-break">
                    {/* Kop Presensi */}
                    <div className="text-center pb-3 border-b-2 border-slate-900 mb-4">
                      <h4 className="font-black text-sm text-indigo-950">DAFTAR HADIR & BERITA ACARA UJIAN (ASAT)</h4>
                      <h3 className="font-black text-base text-indigo-950 uppercase mt-0.5">SMAN 19 BANDUNG - TAHUN AJARAN 2026/2027</h3>
                    </div>

                    {/* Rincian Ruang & Mapel */}
                    <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-700 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <p>Ruang Ujian: <span className="font-black text-indigo-950">{room.name}</span></p>
                        <p className="mt-1">Mata Pelajaran: _________________________</p>
                      </div>
                      <div>
                        <p>Hari / Tanggal: _________________________</p>
                        <p className="mt-1">Sesi Ujian: Sesi 1 / Sesi 2</p>
                      </div>
                    </div>

                    {/* Tabel Presensi Murid */}
                    <table className="w-full text-left text-xs border border-slate-300 mb-6">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <tr>
                          <th className="p-2 border-r border-slate-300 w-10 text-center">No</th>
                          <th className="p-2 border-r border-slate-300 w-14 text-center">Meja</th>
                          <th className="p-2 border-r border-slate-300 w-28">NISN / NIS</th>
                          <th className="p-2 border-r border-slate-300">Nama Lengkap Murid</th>
                          <th className="p-2 border-r border-slate-300 w-20 text-center">Kelas</th>
                          <th className="p-2 w-32 text-center">Tanda Tangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {room.seats.map((seat, sIdx) => (
                          <tr key={seat.seat_number} className="h-8">
                            <td className="p-1.5 border-r border-slate-200 text-center font-bold text-[11px]">{sIdx + 1}</td>
                            <td className="p-1.5 border-r border-slate-200 text-center font-black text-indigo-950 text-[11px]">
                              {String(seat.seat_number).padStart(2, '0')}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-mono text-[10px]">{seat.student.nisn}</td>
                            <td className="p-1.5 border-r border-slate-200 font-bold text-indigo-950 text-[11px]">
                              {formatStudentName(seat.student.nama)}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-center font-bold text-[11px]">
                              {seat.student.nama_kelas}
                            </td>
                            <td className="p-1.5 text-center text-slate-300 text-[10px]">
                              {sIdx % 2 === 0 ? `${sIdx + 1}. .........` : `......... ${sIdx + 1}.`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Berita Acara Pelaksanaan */}
                    <div className="border border-slate-200 p-3.5 rounded-xl text-xs space-y-1 mb-6">
                      <p className="font-bold text-indigo-950">Catatan Berita Acara Pengawas:</p>
                      <p className="text-slate-500">Jumlah Peserta Hadir: ______ Orang | Tidak Hadir: ______ Orang</p>
                      <p className="text-slate-400 italic">Catatan Khusus: ____________________________________________________________________</p>
                    </div>

                    {/* Tanda Tangan Pengawas */}
                    <div className="flex justify-between pt-2 text-xs">
                      <div className="text-center w-56">
                        <p className="font-bold text-slate-600 mb-14">Tanda Tangan Pengawas 1,</p>
                        <p className="font-black text-indigo-950 underline">{room.pengawas_1 || '( ..................................... )'}</p>
                      </div>
                      <div className="text-center w-56">
                        <p className="font-bold text-slate-600 mb-14">Tanda Tangan Pengawas 2,</p>
                        <p className="font-black text-indigo-950 underline">{room.pengawas_2 || '( ..................................... )'}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DETAIL DENAH RUANG (SAAT KLIK KARTU RUANGAN DI TAB 1) */}
      {selectedRoomDetail && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <motion.div
            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white p-2 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-indigo-950 text-base">{selectedRoomDetail.name}</h3>
                  <p className="text-xs text-slate-400 font-bold">
                    {selectedRoomDetail.seats.length} Peserta • Pengawas: {selectedRoomDetail.pengawas_1 || 'Belum diatur'}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedRoomDetail(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-slate-100 p-2.5 rounded-xl text-center font-black text-xs text-slate-500 border">
                PAPAN TULIS & MEJA PENGAWAS (BAGIAN DEPAN)
              </div>

              {/* Grid Meja 4 Kolom */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selectedRoomDetail.seats.map(seat => {
                  const isGradeA = seat.grade === selectedGrades[0];
                  return (
                    <div
                      key={seat.seat_number}
                      className={cn(
                        "p-3 rounded-2xl border-2 flex flex-col justify-between transition-all",
                        isGradeA ? "bg-indigo-50/40 border-indigo-300" : "bg-purple-50/40 border-purple-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-md border text-slate-700">
                          Meja {String(seat.seat_number).padStart(2, '0')}
                        </span>
                        <span className={cn(
                          "text-[9px] font-black px-1.5 py-0.5 rounded text-white",
                          isGradeA ? "bg-indigo-950" : "bg-purple-900"
                        )}>
                          Kelas {seat.grade}
                        </span>
                      </div>
                      <p className="font-black text-indigo-950 text-xs line-clamp-1">{formatStudentName(seat.student.nama)}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{seat.student.nama_kelas} • NIS {seat.student.nisn}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setSelectedRoomDetail(null)}
                className="px-5 py-2.5 bg-indigo-950 text-white rounded-xl font-bold text-xs"
              >
                Tutup Denah
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL INPUT PENGAWAS KUSTOM (PPL / MAHASISWA / EKSTERNAL) */}
      {showAddProctorModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <motion.div
            initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-black text-indigo-950 text-sm flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-600" /> Tambah Pengawas Kustom / PPL
              </h3>
              <button onClick={() => setShowAddProctorModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Nama Lengkap Pengawas:</label>
                <input
                  type="text"
                  placeholder="Contoh: Ahmad Fauzi, S.Pd. atau Rina (PPL)"
                  value={newProctorName}
                  onChange={e => setNewProctorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-indigo-950 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Status / Instansi Asal:</label>
                <input
                  type="text"
                  placeholder="Contoh: Mahasiswa PPL UPI / Pengawas Eksternal / Staf TU"
                  value={newProctorDesc}
                  onChange={e => setNewProctorDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-indigo-950 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddProctorModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-500 text-xs bg-white"
              >
                Batal
              </button>
              <button
                onClick={handleAddCustomProctor}
                disabled={!newProctorName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-950 text-white font-bold text-xs disabled:opacity-50"
              >
                Simpan Pengawas
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
