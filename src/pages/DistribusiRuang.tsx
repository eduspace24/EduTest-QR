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
  ArrowLeft,
  ListOrdered,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Plus
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
  method?: string;
  classes?: string[];
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
  const [seatingMethod, setSeatingMethod] = useState<'cross_grade' | 'standard_class' | 'class_shuffled_seats' | 'full_random'>('cross_grade');
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

  // Manual Assignment Modal States
  const [showManualAssignModal, setShowManualAssignModal] = useState(false);
  const [manualTargetRoomId, setManualTargetRoomId] = useState<string>('');
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualFilterClass, setManualFilterClass] = useState('ALL');
  const [manualFilterGrade, setManualFilterGrade] = useState('ALL');
  const [manualFilterStatus, setManualFilterStatus] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [manualSelectedStudentIds, setManualSelectedStudentIds] = useState<string[]>([]);
  const [manualCurrentPage, setManualCurrentPage] = useState(1);
  const itemsPerPage = 40;

  // Modals for Single Seat / Room Actions
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomNameInput, setNewRoomNameInput] = useState('');
  const [newRoomCapInput, setNewRoomCapInput] = useState(36);

  const [quickAssignDeskModal, setQuickAssignDeskModal] = useState<{ open: boolean; roomId: string; seatNumber: number } | null>(null);
  const [quickDeskSearch, setQuickDeskSearch] = useState('');

  const [moveStudentModal, setMoveStudentModal] = useState<{ open: boolean; student: Student; fromRoomId: string; currentSeat: number } | null>(null);
  const [moveTargetRoomId, setMoveTargetRoomId] = useState('');

  const [swapSeatModal, setSwapSeatModal] = useState<{ open: boolean; student: Student; roomId: string; currentSeat: number } | null>(null);
  const [swapTargetSeatNumber, setSwapTargetSeatNumber] = useState<number | ''>('');

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
            nama_kelas: s.nama_kelas || s.kelas || '',
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

  // Keep selectedRoomDetail in sync with rooms state
  useEffect(() => {
    if (selectedRoomDetail) {
      const found = rooms.find(r => r.id === selectedRoomDetail.id);
      if (found) {
        setSelectedRoomDetail(found);
      }
    }
  }, [rooms]);

  // Set default manualTargetRoomId when rooms change
  useEffect(() => {
    if (rooms.length > 0 && !manualTargetRoomId) {
      setManualTargetRoomId(rooms[0].id);
    }
  }, [rooms, manualTargetRoomId]);

  // Filter available students matching selected grades
  const eligibleStudents = useMemo(() => {
    return students.filter(s => s.grade && selectedGrades.includes(s.grade));
  }, [students, selectedGrades]);

  const studentsByGrade = useMemo(() => {
    const grouped: Record<string, Student[]> = { X: [], XI: [], XII: [] };
    students.forEach(s => {
      if (s.grade && grouped[s.grade]) {
        grouped[s.grade].push(s);
      }
    });
    return grouped;
  }, [students]);

  // List of all unique classes
  const allClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.nama_kelas) set.add(s.nama_kelas);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  // Map each assigned student ID / NISN to room and seat info
  const studentAssignmentMap = useMemo(() => {
    const map = new Map<string, { roomId: string; roomName: string; seatNumber: number }>();
    rooms.forEach(r => {
      r.seats.forEach(s => {
        if (s.student) {
          if (s.student.id) map.set(s.student.id, { roomId: r.id, roomName: r.name, seatNumber: s.seat_number });
          if (s.student.nisn) map.set(s.student.nisn, { roomId: r.id, roomName: r.name, seatNumber: s.seat_number });
        }
      });
    });
    return map;
  }, [rooms]);

  // Unassigned students among eligible students
  const unassignedEligibleStudents = useMemo(() => {
    return eligibleStudents.filter(s => {
      const isAssigned = (s.id && studentAssignmentMap.has(s.id)) || (s.nisn && studentAssignmentMap.has(s.nisn));
      return !isAssigned;
    });
  }, [eligibleStudents, studentAssignmentMap]);

  // Toggle individual grade on/off
  const handleToggleGrade = (gradeId: string) => {
    if (selectedGrades.includes(gradeId)) {
      if (selectedGrades.length <= 1) {
        showAlert({
          title: 'Minimal 1 Angkatan Aktif',
          message: 'Minimal harus memilih 1 angkatan kelas yang aktif untuk ujian.',
          type: 'warning'
        });
        return;
      }
      setSelectedGrades(selectedGrades.filter(g => g !== gradeId));
    } else {
      const order = ['X', 'XI', 'XII'];
      const updated = [...selectedGrades, gradeId].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      setSelectedGrades(updated);
    }
  };

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

  // Color and badge helper for grades (X, XI, XII)
  const getGradeBadgeStyle = (grade?: string) => {
    switch (grade) {
      case 'X':
        return {
          pill: 'bg-indigo-50 text-indigo-900 border-indigo-200',
          badge: 'bg-indigo-950 text-white',
          border: 'border-indigo-300',
          box: 'bg-indigo-50/50'
        };
      case 'XI':
        return {
          pill: 'bg-purple-50 text-purple-900 border-purple-200',
          badge: 'bg-purple-900 text-white',
          border: 'border-purple-300',
          box: 'bg-purple-50/50'
        };
      case 'XII':
        return {
          pill: 'bg-emerald-50 text-emerald-900 border-emerald-200',
          badge: 'bg-emerald-900 text-white',
          border: 'border-emerald-300',
          box: 'bg-emerald-50/50'
        };
      default:
        return {
          pill: 'bg-slate-50 text-slate-800 border-slate-200',
          badge: 'bg-slate-800 text-white',
          border: 'border-slate-300',
          box: 'bg-slate-50'
        };
    }
  };

  // ==========================================
  // GENERATE ROOMS (AUTOMATIC SEATING)
  // ==========================================
  const handleGenerateDistribution = async () => {
    if (eligibleStudents.length === 0) {
      showAlert({ title: 'Murid Kosong', message: 'Tidak ada murid yang cocok dengan jenjang terpilih.', type: 'warning' });
      return;
    }

    let totalRooms = 1;
    let capPerRoom = capacityPerRoom;

    if (distributionMode === 'capacity') {
      capPerRoom = Math.max(4, Number(capacityPerRoom) || 36);
      totalRooms = Math.ceil(eligibleStudents.length / capPerRoom);
    } else {
      totalRooms = Math.max(1, Number(targetRoomsCount) || 24);
      capPerRoom = Math.ceil(eligibleStudents.length / totalRooms);
    }

    const newRooms: ExamRoom[] = [];

    // 1. STANDAR (SESUAI ROMBEL & NO. ABSEN)
    if (seatingMethod === 'standard_class') {
      const sortedStudents = [...eligibleStudents].sort((a, b) => {
        const gradeOrder: Record<string, number> = { X: 1, XI: 2, XII: 3, OTHER: 4 };
        const ga = gradeOrder[a.grade || 'OTHER'] || 99;
        const gb = gradeOrder[b.grade || 'OTHER'] || 99;
        if (ga !== gb) return ga - gb;

        const classComp = (a.nama_kelas || '').localeCompare(b.nama_kelas || '', undefined, { numeric: true });
        if (classComp !== 0) return classComp;

        const absA = parseInt(a.nomor_absen || '0', 10) || 0;
        const absB = parseInt(b.nomor_absen || '0', 10) || 0;
        if (absA !== absB) return absA - absB;

        return (a.nama || '').localeCompare(b.nama || '');
      });

      let stuIdx = 0;
      for (let r = 1; r <= totalRooms; r++) {
        const roomSeats: AssignedSeat[] = [];
        for (let s = 1; s <= capPerRoom; s++) {
          if (stuIdx < sortedStudents.length) {
            const student = sortedStudents[stuIdx++];
            roomSeats.push({
              seat_number: s,
              student,
              grade: student.grade || 'OTHER'
            });
          }
        }
        if (roomSeats.length > 0) {
          const roomClasses = Array.from(new Set(roomSeats.map(st => st.student.nama_kelas)));
          newRooms.push({
            id: `room_${r}_${Date.now()}`,
            room_number: r,
            name: `Ruang ${String(r).padStart(2, '0')}`,
            capacity: capPerRoom,
            pengawas_1: '',
            pengawas_2: '',
            seats: roomSeats,
            method: 'Standar Rombel & Absen',
            classes: roomClasses
          });
        }
      }
    } 
    // 2. PER KELAS / ROMBEL (ABSEN DIACAK)
    else if (seatingMethod === 'class_shuffled_seats') {
      const classMap = new Map<string, Student[]>();
      eligibleStudents.forEach(s => {
        const k = s.nama_kelas || 'Lainnya';
        if (!classMap.has(k)) classMap.set(k, []);
        classMap.get(k)!.push(s);
      });

      const sortedClasses = Array.from(classMap.keys()).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );

      const orderedStudents: Student[] = [];
      sortedClasses.forEach(cls => {
        const classStudents = classMap.get(cls)!;
        const shuffled = shuffleArray(classStudents);
        orderedStudents.push(...shuffled);
      });

      let stuIdx = 0;
      for (let r = 1; r <= totalRooms; r++) {
        const roomSeats: AssignedSeat[] = [];
        for (let s = 1; s <= capPerRoom; s++) {
          if (stuIdx < orderedStudents.length) {
            const student = orderedStudents[stuIdx++];
            roomSeats.push({
              seat_number: s,
              student,
              grade: student.grade || 'OTHER'
            });
          }
        }
        if (roomSeats.length > 0) {
          const roomClasses = Array.from(new Set(roomSeats.map(st => st.student.nama_kelas)));
          newRooms.push({
            id: `room_${r}_${Date.now()}`,
            room_number: r,
            name: `Ruang ${String(r).padStart(2, '0')}`,
            capacity: capPerRoom,
            pengawas_1: '',
            pengawas_2: '',
            seats: roomSeats,
            method: 'Per Kelas (Absen Diacak)',
            classes: roomClasses
          });
        }
      }
    }
    // 3. ACAK BEBAS / CAMPUR PENUH
    else if (seatingMethod === 'full_random') {
      const shuffledAll: Student[] = shuffleArray<Student>(eligibleStudents);
      let stuIdx = 0;
      for (let r = 1; r <= totalRooms; r++) {
        const roomSeats: AssignedSeat[] = [];
        for (let s = 1; s <= capPerRoom; s++) {
          if (stuIdx < shuffledAll.length) {
            const student = shuffledAll[stuIdx++];
            roomSeats.push({
              seat_number: s,
              student,
              grade: student.grade || 'OTHER'
            });
          }
        }
        if (roomSeats.length > 0) {
          const roomClasses = Array.from(new Set(roomSeats.map(st => st.student.nama_kelas)));
          newRooms.push({
            id: `room_${r}_${Date.now()}`,
            room_number: r,
            name: `Ruang ${String(r).padStart(2, '0')}`,
            capacity: capPerRoom,
            pengawas_1: '',
            pengawas_2: '',
            seats: roomSeats,
            method: 'Acak Bebas Penuh',
            classes: roomClasses
          });
        }
      }
    }
    // 4. SILANG ANTAR-JENJANG (ASAT ANTI-NYONTEK)
    else {
      if (selectedGrades.length === 1) {
        const singleGrade = selectedGrades[0];
        const classMap = new Map<string, Student[]>();
        eligibleStudents.forEach(s => {
          const k = s.nama_kelas || 'Lainnya';
          if (!classMap.has(k)) classMap.set(k, []);
          classMap.get(k)!.push(s);
        });

        const classKeys = Array.from(classMap.keys()).sort();
        const classPools: Record<string, Student[]> = {};
        const classIndices: Record<string, number> = {};
        classKeys.forEach(k => {
          classPools[k] = shuffleArray(classMap.get(k)!);
          classIndices[k] = 0;
        });

        let currentClassPtr = 0;
        for (let r = 1; r <= totalRooms; r++) {
          const roomSeats: AssignedSeat[] = [];
          for (let s = 1; s <= capPerRoom; s++) {
            let assignedStudent: Student | null = null;
            for (let tries = 0; tries < classKeys.length; tries++) {
              const cls = classKeys[(currentClassPtr + tries) % classKeys.length];
              if (classIndices[cls] < classPools[cls].length) {
                assignedStudent = classPools[cls][classIndices[cls]++];
                currentClassPtr = (currentClassPtr + tries + 1) % classKeys.length;
                break;
              }
            }
            if (assignedStudent) {
              roomSeats.push({
                seat_number: s,
                student: assignedStudent,
                grade: (assignedStudent.grade || singleGrade) as any
              });
            }
          }
          if (roomSeats.length > 0) {
            newRooms.push({
              id: `room_${r}_${Date.now()}`,
              room_number: r,
              name: `Ruang ${String(r).padStart(2, '0')}`,
              capacity: capPerRoom,
              pengawas_1: '',
              pengawas_2: '',
              seats: roomSeats,
              method: 'Silang Antar-Kelas',
              classes: Array.from(new Set(roomSeats.map(st => st.student.nama_kelas)))
            });
          }
        }
      } else {
        const gradePools: Record<string, Student[]> = {};
        const gradeIndices: Record<string, number> = {};
        selectedGrades.forEach(g => {
          gradePools[g] = shuffleArray(studentsByGrade[g] || []);
          gradeIndices[g] = 0;
        });

        const M = selectedGrades.length;

        for (let r = 1; r <= totalRooms; r++) {
          const roomSeats: AssignedSeat[] = [];
          for (let s = 1; s <= capPerRoom; s++) {
            let targetGradeIdx = 0;
            if (seatingPattern === 'alternate_column') {
              targetGradeIdx = (s - 1) % M;
            } else {
              const row = Math.floor((s - 1) / 4);
              const col = (s - 1) % 4;
              targetGradeIdx = (row + col) % M;
            }

            let chosenGrade: string | null = null;
            for (let offset = 0; offset < M; offset++) {
              const candGrade = selectedGrades[(targetGradeIdx + offset) % M];
              if (gradeIndices[candGrade] < gradePools[candGrade].length) {
                chosenGrade = candGrade;
                break;
              }
            }

            if (chosenGrade) {
              const student = gradePools[chosenGrade][gradeIndices[chosenGrade]++];
              roomSeats.push({
                seat_number: s,
                student,
                grade: chosenGrade as any
              });
            }
          }

          if (roomSeats.length > 0) {
            newRooms.push({
              id: `room_${r}_${Date.now()}`,
              room_number: r,
              name: `Ruang ${String(r).padStart(2, '0')}`,
              capacity: capPerRoom,
              pengawas_1: '',
              pengawas_2: '',
              seats: roomSeats,
              method: 'Silang Antar-Angkatan',
              classes: Array.from(new Set(roomSeats.map(st => st.student.nama_kelas)))
            });
          }
        }
      }
    }

    setRooms(newRooms);
    await saveCollection('exam_rooms_distribution', newRooms);
    showAlert({
      title: 'Distribusi Ruang Berhasil!',
      message: `${eligibleStudents.length} murid berhasil ditempatkan ke ${newRooms.length} ruangan. Anda tetap dapat menambah, memindahkan, atau mengubah tempat duduk murid secara manual.`,
      type: 'success'
    });
  };

  // ==========================================
  // MANUAL ASSIGNMENT & MIXING HANDLERS
  // ==========================================

  // Batch Assign selected students to a target room
  const handleBatchAssignStudents = async () => {
    if (!manualTargetRoomId) {
      showAlert({ title: 'Pilih Ruangan', message: 'Silakan pilih ruangan tujuan penempatan.', type: 'warning' });
      return;
    }
    if (manualSelectedStudentIds.length === 0) {
      showAlert({ title: 'Pilih Murid', message: 'Tandai setidaknya satu murid dengan checkbox.', type: 'warning' });
      return;
    }

    const targetRoom = rooms.find(r => r.id === manualTargetRoomId);
    if (!targetRoom) return;

    const studentsToPlace = students.filter(s =>
      manualSelectedStudentIds.includes(s.id) || (s.nisn && manualSelectedStudentIds.includes(s.nisn))
    );

    // 1. Remove these students from any other rooms they currently reside in
    let updatedRooms = rooms.map(room => {
      if (room.id === manualTargetRoomId) return room;
      const filteredSeats = room.seats.filter(st =>
        !manualSelectedStudentIds.includes(st.student.id) &&
        (!st.student.nisn || !manualSelectedStudentIds.includes(st.student.nisn))
      );
      // Re-index seats 1..N
      const reindexed = filteredSeats.map((st, idx) => ({ ...st, seat_number: idx + 1 }));
      return {
        ...room,
        seats: reindexed,
        classes: Array.from(new Set(reindexed.map(st => st.student.nama_kelas)))
      };
    });

    // 2. In target room, filter out any students who are already inside
    const currentTarget = updatedRooms.find(r => r.id === manualTargetRoomId)!;
    const existingTargetIds = new Set(currentTarget.seats.map(st => st.student.id || st.student.nisn));

    const freshStudents = studentsToPlace.filter(s =>
      !existingTargetIds.has(s.id) && (!s.nisn || !existingTargetIds.has(s.nisn))
    );

    // Find next available seat numbers
    const occupiedSeats = new Set(currentTarget.seats.map(s => s.seat_number));
    const newAssignedSeats: AssignedSeat[] = [];
    let curSeat = 1;

    freshStudents.forEach(stu => {
      while (occupiedSeats.has(curSeat)) {
        curSeat++;
      }
      occupiedSeats.add(curSeat);
      newAssignedSeats.push({
        seat_number: curSeat,
        student: stu,
        grade: stu.grade || 'OTHER'
      });
    });

    const combinedSeats = [...currentTarget.seats, ...newAssignedSeats].sort((a, b) => a.seat_number - b.seat_number);
    const newCap = Math.max(currentTarget.capacity, combinedSeats.length);

    updatedRooms = updatedRooms.map(room => {
      if (room.id === manualTargetRoomId) {
        return {
          ...room,
          capacity: newCap,
          seats: combinedSeats,
          classes: Array.from(new Set(combinedSeats.map(st => st.student.nama_kelas)))
        };
      }
      return room;
    });

    setRooms(updatedRooms);
    await saveCollection('exam_rooms_distribution', updatedRooms);
    setManualSelectedStudentIds([]);
    setShowManualAssignModal(false);

    showAlert({
      title: 'Penempatan Manual Berhasil',
      message: `${freshStudents.length} murid berhasil ditempatkan ke ${targetRoom.name}.`,
      type: 'success'
    });
  };

  // Batch Remove selected students from their rooms
  const handleBatchRemoveStudents = async () => {
    if (manualSelectedStudentIds.length === 0) {
      showAlert({ title: 'Pilih Murid', message: 'Tandai murid yang ingin dikeluarkan dari ruangan.', type: 'warning' });
      return;
    }

    let removedCount = 0;
    const updatedRooms = rooms.map(room => {
      const initialCount = room.seats.length;
      const remainingSeats = room.seats.filter(st =>
        !manualSelectedStudentIds.includes(st.student.id) &&
        (!st.student.nisn || !manualSelectedStudentIds.includes(st.student.nisn))
      );
      removedCount += (initialCount - remainingSeats.length);
      const reindexed = remainingSeats.map((st, idx) => ({ ...st, seat_number: idx + 1 }));
      return {
        ...room,
        seats: reindexed,
        classes: Array.from(new Set(reindexed.map(st => st.student.nama_kelas)))
      };
    });

    setRooms(updatedRooms);
    await saveCollection('exam_rooms_distribution', updatedRooms);
    setManualSelectedStudentIds([]);

    showAlert({
      title: 'Murid Dikeluarkan',
      message: `${removedCount} murid berhasil dikeluarkan dan berstatus 'Belum Ada Ruang'.`,
      type: 'success'
    });
  };

  // Move a single student to another room
  const handleMoveSingleStudent = async () => {
    if (!moveStudentModal || !moveTargetRoomId) return;
    const { student, fromRoomId } = moveStudentModal;

    const targetRoom = rooms.find(r => r.id === moveTargetRoomId);
    if (!targetRoom) return;

    let updatedRooms = rooms.map(room => {
      if (room.id === fromRoomId) {
        const remaining = room.seats.filter(st => st.student.id !== student.id && st.student.nisn !== student.nisn);
        const reindexed = remaining.map((st, idx) => ({ ...st, seat_number: idx + 1 }));
        return {
          ...room,
          seats: reindexed,
          classes: Array.from(new Set(reindexed.map(st => st.student.nama_kelas)))
        };
      }
      return room;
    });

    const destRoom = updatedRooms.find(r => r.id === moveTargetRoomId)!;
    const occupied = new Set(destRoom.seats.map(s => s.seat_number));
    let nextSeat = 1;
    while (occupied.has(nextSeat)) {
      nextSeat++;
    }

    const newSeatObj: AssignedSeat = {
      seat_number: nextSeat,
      student,
      grade: student.grade || 'OTHER'
    };

    const combined = [...destRoom.seats, newSeatObj].sort((a, b) => a.seat_number - b.seat_number);
    const newCap = Math.max(destRoom.capacity, combined.length);

    updatedRooms = updatedRooms.map(room => {
      if (room.id === moveTargetRoomId) {
        return {
          ...room,
          capacity: newCap,
          seats: combined,
          classes: Array.from(new Set(combined.map(st => st.student.nama_kelas)))
        };
      }
      return room;
    });

    setRooms(updatedRooms);
    await saveCollection('exam_rooms_distribution', updatedRooms);
    setMoveStudentModal(null);
    setMoveTargetRoomId('');

    showAlert({
      title: 'Murid Berhasil Dipindahkan',
      message: `${formatStudentName(student.nama)} dipindahkan ke ${targetRoom.name} (Meja ${nextSeat}).`,
      type: 'success'
    });
  };

  // Swap seats between two seat numbers in the same room
  const handleSwapSeatsInRoom = async () => {
    if (!swapSeatModal || swapTargetSeatNumber === '') return;
    const { roomId, currentSeat } = swapSeatModal;
    const targetSeatNum = Number(swapTargetSeatNumber);

    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const seatA = room.seats.find(s => s.seat_number === currentSeat);
    const seatB = room.seats.find(s => s.seat_number === targetSeatNum);

    if (!seatA) return;

    const updatedSeats = room.seats.map(s => {
      if (s.seat_number === currentSeat) {
        return { ...s, seat_number: targetSeatNum };
      }
      if (seatB && s.seat_number === targetSeatNum) {
        return { ...s, seat_number: currentSeat };
      }
      return s;
    }).sort((a, b) => a.seat_number - b.seat_number);

    const updatedRooms = rooms.map(r => r.id === roomId ? { ...r, seats: updatedSeats } : r);
    setRooms(updatedRooms);
    await saveCollection('exam_rooms_distribution', updatedRooms);
    setSwapSeatModal(null);
    setSwapTargetSeatNumber('');

    showAlert({
      title: 'Posisi Meja Ditukar',
      message: `Nomor meja berhasil diperbarui.`,
      type: 'success'
    });
  };

  // Assign specific student to a specific desk (from quick assign modal)
  const handleAssignToSpecificDesk = async (student: Student) => {
    if (!quickAssignDeskModal) return;
    const { roomId, seatNumber } = quickAssignDeskModal;

    // Remove from any room first
    let updatedRooms = rooms.map(room => {
      const filtered = room.seats.filter(st => st.student.id !== student.id && st.student.nisn !== student.nisn);
      return {
        ...room,
        seats: filtered,
        classes: Array.from(new Set(filtered.map(st => st.student.nama_kelas)))
      };
    });

    // Add to target room at specific seatNumber
    updatedRooms = updatedRooms.map(room => {
      if (room.id === roomId) {
        const withoutOldSeat = room.seats.filter(st => st.seat_number !== seatNumber);
        const newSeat: AssignedSeat = {
          seat_number: seatNumber,
          student,
          grade: student.grade || 'OTHER'
        };
        const allSeats = [...withoutOldSeat, newSeat].sort((a, b) => a.seat_number - b.seat_number);
        return {
          ...room,
          seats: allSeats,
          classes: Array.from(new Set(allSeats.map(st => st.student.nama_kelas)))
        };
      }
      return room;
    });

    setRooms(updatedRooms);
    await saveCollection('exam_rooms_distribution', updatedRooms);
    setQuickAssignDeskModal(null);
    setQuickDeskSearch('');

    showAlert({
      title: 'Meja Diisi',
      message: `${formatStudentName(student.nama)} berhasil ditempatkan di Meja ${seatNumber}.`,
      type: 'success'
    });
  };

  // Remove a single student from room
  const handleRemoveSingleStudent = async (roomId: string, studentIdOrNisn: string) => {
    const updatedRooms = rooms.map(room => {
      if (room.id === roomId) {
        const remaining = room.seats.filter(st => st.student.id !== studentIdOrNisn && st.student.nisn !== studentIdOrNisn);
        const reindexed = remaining.map((st, idx) => ({ ...st, seat_number: idx + 1 }));
        return {
          ...room,
          seats: reindexed,
          classes: Array.from(new Set(reindexed.map(st => st.student.nama_kelas)))
        };
      }
      return room;
    });

    setRooms(updatedRooms);
    await saveCollection('exam_rooms_distribution', updatedRooms);
    showAlert({ title: 'Murid Dikeluarkan', message: 'Murid telah dikembalikan ke daftar belum dialokasikan.', type: 'info' });
  };

  // Create a new custom room manually
  const handleCreateNewRoom = async () => {
    const nextNum = rooms.length > 0 ? Math.max(...rooms.map(r => r.room_number)) + 1 : 1;
    const name = newRoomNameInput.trim() || `Ruang ${String(nextNum).padStart(2, '0')}`;
    const cap = Math.max(4, Number(newRoomCapInput) || 36);

    const newRoom: ExamRoom = {
      id: `room_${nextNum}_${Date.now()}`,
      room_number: nextNum,
      name,
      capacity: cap,
      pengawas_1: '',
      pengawas_2: '',
      seats: [],
      method: 'Manual',
      classes: []
    };

    const updated = [...rooms, newRoom];
    setRooms(updated);
    await saveCollection('exam_rooms_distribution', updated);
    setNewRoomNameInput('');
    setShowCreateRoomModal(false);

    showAlert({
      title: 'Ruangan Baru Dibuat',
      message: `${newRoom.name} dengan kapasitas ${cap} meja siap digunakan.`,
      type: 'success'
    });
  };

  // Delete a room
  const handleDeleteRoom = async (roomId: string) => {
    const roomToDelete = rooms.find(r => r.id === roomId);
    if (!roomToDelete) return;

    if (!confirm(`Hapus ${roomToDelete.name}? ${roomToDelete.seats.length} murid di dalamnya akan berstatus belum memiliki ruangan.`)) {
      return;
    }

    const updated = rooms.filter(r => r.id !== roomId);
    setRooms(updated);
    await saveCollection('exam_rooms_distribution', updated);
    if (selectedRoomDetail?.id === roomId) {
      setSelectedRoomDetail(null);
    }
    showAlert({ title: 'Ruangan Dihapus', message: `${roomToDelete.name} berhasil dihapus.`, type: 'info' });
  };

  // Update room capacity
  const handleUpdateRoomCapacity = async (roomId: string, newCap: number) => {
    const updated = rooms.map(r => {
      if (r.id === roomId) {
        return { ...r, capacity: Math.max(r.seats.length, newCap) };
      }
      return r;
    });
    setRooms(updated);
    await saveCollection('exam_rooms_distribution', updated);
  };

  // Reset all rooms
  const handleResetAllRooms = async () => {
    if (!confirm('Kosongkan seluruh ruangan yang sudah dibentuk? Tindakan ini tidak dapat dibatalkan.')) return;
    setRooms([]);
    await saveCollection('exam_rooms_distribution', []);
    setSelectedRoomDetail(null);
    showAlert({ title: 'Ruangan Dikosongkan', message: 'Semua ruangan telah direset.', type: 'info' });
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

  // ==========================================
  // FILTERED STUDENTS FOR MANUAL ASSIGNMENT MODAL
  // ==========================================
  const filteredManualStudents = useMemo(() => {
    return students.filter(s => {
      // 1. Filter Grade
      if (manualFilterGrade !== 'ALL' && s.grade !== manualFilterGrade) return false;

      // 2. Filter Class
      if (manualFilterClass !== 'ALL' && s.nama_kelas !== manualFilterClass) return false;

      // 3. Filter Status
      const isAssigned = (s.id && studentAssignmentMap.has(s.id)) || (s.nisn && studentAssignmentMap.has(s.nisn));
      if (manualFilterStatus === 'unassigned' && isAssigned) return false;
      if (manualFilterStatus === 'assigned' && !isAssigned) return false;

      // 4. Search Query (Nama or NISN)
      if (manualSearchQuery.trim()) {
        const q = manualSearchQuery.toLowerCase().trim();
        const matchName = (s.nama || '').toLowerCase().includes(q);
        const matchNisn = (s.nisn || '').toLowerCase().includes(q);
        const matchClass = (s.nama_kelas || '').toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchClass) return false;
      }

      return true;
    });
  }, [students, manualFilterGrade, manualFilterClass, manualFilterStatus, manualSearchQuery, studentAssignmentMap]);

  // Paginated students for modal
  const totalPages = Math.ceil(filteredManualStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (manualCurrentPage - 1) * itemsPerPage;
    return filteredManualStudents.slice(start, start + itemsPerPage);
  }, [filteredManualStudents, manualCurrentPage]);

  // Toggle single student selection
  const toggleStudentSelection = (id: string) => {
    setManualSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Toggle select all on current page
  const handleSelectAllCurrentPage = () => {
    const pageIds = paginatedStudents.map(s => s.id || s.nisn);
    const allSelected = pageIds.every(id => manualSelectedStudentIds.includes(id));
    if (allSelected) {
      setManualSelectedStudentIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setManualSelectedStudentIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // Select all filtered results (up to 500)
  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredManualStudents.slice(0, 500).map(s => s.id || s.nisn);
    setManualSelectedStudentIds(allFilteredIds);
    showAlert({ title: 'Murid Dipilih', message: `${allFilteredIds.length} murid telah ditandai.`, type: 'info' });
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
              Sistem Penataan Ruang Ujian (Otomatis & Manual)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">
            Distribusi Ruang & Pengawas Ujian
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Kombinasi pengacakan silang otomatis dan fleksibilitas penempatan manual/pindah murid spesifik dengan sistem pencarian & checkbox.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setManualFilterStatus('unassigned');
              setShowManualAssignModal(true);
            }}
            className="bg-indigo-950 hover:bg-indigo-900 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4 text-blue-300" /> Alokasi Manual Murid
          </button>
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
          { id: 'config', label: '1. Penataan & Pengacakan Ruangan', icon: Sliders },
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
          {/* Banner Peringatan jika ada murid belum dapat ruangan */}
          {rooms.length > 0 && unassignedEligibleStudents.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300/80 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-amber-950 text-sm">
                    {unassignedEligibleStudents.length} Murid Belum Memiliki Ruangan Ujian
                  </h4>
                  <p className="text-xs text-amber-800 font-medium mt-0.5">
                    Terdapat murid dari angkatan terpilih yang belum ditempatkan ke meja ujian. Anda dapat menempatkannya secara manual sekaligus ke ruangan mana saja.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setManualFilterStatus('unassigned');
                    setShowManualAssignModal(true);
                  }}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <UserPlus className="w-4 h-4" /> Tempatkan Sekaligus
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel Pengaturan Otomatis */}
            <div className="lg:col-span-1 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-5">
              <h3 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" /> Parameter Penataan Otomatis
              </h3>

              {/* 1. Pemilihan Jenjang Berbasis Toggle Aktif/Nonaktif */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Pilih Angkatan yang Ujian:</label>
                  <span className="text-[10px] font-black text-indigo-950 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                    {eligibleStudents.length} Murid Terpilih
                  </span>
                </div>

                {/* Toggle Angkatan: Kelas X, XI, XII */}
                <div className="space-y-2">
                  {[
                    { id: 'X', label: 'Kelas X', desc: 'Angkatan Kelas 10', count: studentsByGrade['X']?.length || 0, color: 'indigo' },
                    { id: 'XI', label: 'Kelas XI', desc: 'Angkatan Kelas 11', count: studentsByGrade['XI']?.length || 0, color: 'purple' },
                    { id: 'XII', label: 'Kelas XII', desc: 'Angkatan Kelas 12', count: studentsByGrade['XII']?.length || 0, color: 'emerald' }
                  ].map(g => {
                    const isSelected = selectedGrades.includes(g.id);
                    const style = getGradeBadgeStyle(g.id);

                    return (
                      <div
                        key={g.id}
                        onClick={() => handleToggleGrade(g.id)}
                        className={cn(
                          "p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 select-none",
                          isSelected
                            ? cn("border-slate-300 shadow-xs", style.box)
                            : "bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-80"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-all",
                            isSelected ? style.badge : "bg-slate-200 text-slate-500"
                          )}>
                            {g.id}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={cn("text-xs font-black transition-colors", isSelected ? "text-indigo-950" : "text-slate-500")}>
                                {g.label}
                              </h4>
                              <span className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded-md",
                                isSelected ? "bg-white/90 text-slate-700 border" : "bg-slate-200 text-slate-500"
                              )}>
                                {g.count} Murid
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {isSelected ? 'Aktif mengikuti ujian' : 'Nonaktif (tidak ikut ujian)'}
                            </p>
                          </div>
                        </div>

                        {/* Modern Toggle Switch */}
                        <div className={cn(
                          "w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 flex items-center",
                          isSelected 
                            ? (g.color === 'emerald' ? 'bg-emerald-600' : g.color === 'purple' ? 'bg-purple-600' : 'bg-indigo-950') 
                            : "bg-slate-300"
                        )}>
                          <div className={cn(
                            "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 flex items-center justify-center",
                            isSelected ? "translate-x-5" : "translate-x-0"
                          )}>
                            {isSelected && (
                              <Check className={cn("w-3 h-3", 
                                g.color === 'emerald' ? 'text-emerald-600' : 
                                g.color === 'purple' ? 'text-purple-600' : 
                                'text-indigo-950'
                              )} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>Angkatan Terpilih:</span>
                  <span className="text-indigo-950 font-black">
                    {selectedGrades.length === 3 
                      ? 'Seluruh Angkatan (X, XI, XII)' 
                      : selectedGrades.map(g => `Kelas ${g}`).join(' & ')}
                  </span>
                </div>
              </div>

              {/* 2. Metode Penataan Meja & Urutan Duduk */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700">Metode Penataan & Urutan Meja:</label>
                <div className="space-y-2">
                  {/* Standar Rombel & Absen */}
                  <label 
                    onClick={() => setSeatingMethod('standard_class')}
                    className={cn(
                      "flex items-start gap-2.5 p-2.5 rounded-2xl border cursor-pointer transition-all",
                      seatingMethod === 'standard_class'
                        ? "bg-blue-50/50 border-blue-600 shadow-xs"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="seatingMethod" 
                      checked={seatingMethod === 'standard_class'} 
                      onChange={() => setSeatingMethod('standard_class')}
                      className="mt-1 accent-indigo-950" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                          <ListOrdered className="w-3.5 h-3.5 text-blue-600" />
                          Standar Rombel & No. Absen
                        </p>
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Sesuai rombel (A-Z) dan nomor absen urut (1, 2, 3...).
                      </p>
                    </div>
                  </label>

                  {/* Per Kelas Namun Absen Diacak */}
                  <label 
                    onClick={() => setSeatingMethod('class_shuffled_seats')}
                    className={cn(
                      "flex items-start gap-2.5 p-2.5 rounded-2xl border cursor-pointer transition-all",
                      seatingMethod === 'class_shuffled_seats'
                        ? "bg-purple-50/50 border-purple-600 shadow-xs"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="seatingMethod" 
                      checked={seatingMethod === 'class_shuffled_seats'} 
                      onChange={() => setSeatingMethod('class_shuffled_seats')}
                      className="mt-1 accent-indigo-950" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-purple-600" />
                          Per Rombel (Absen Diacak)
                        </p>
                        <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                          1 Kelas 1 Ruang
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Tetap berkumpul per kelas di ruangan yang sama, nomor meja diacak.
                      </p>
                    </div>
                  </label>

                  {/* Silang Antar-Jenjang (ASAT Anti-Nyontek) */}
                  <label 
                    onClick={() => setSeatingMethod('cross_grade')}
                    className={cn(
                      "flex items-start gap-2.5 p-2.5 rounded-2xl border cursor-pointer transition-all",
                      seatingMethod === 'cross_grade'
                        ? "bg-indigo-50/50 border-indigo-950 shadow-xs"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="seatingMethod" 
                      checked={seatingMethod === 'cross_grade'} 
                      onChange={() => setSeatingMethod('cross_grade')}
                      className="mt-1 accent-indigo-950" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                          <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                          Silang Antar-Jenjang (ASAT)
                        </p>
                        <span className="text-[9px] font-bold bg-indigo-100 text-indigo-950 px-1.5 py-0.5 rounded">
                          Rekomendasi
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Peserta antar angkatan duduk berselang (selang-seling meja).
                      </p>
                    </div>
                  </label>

                  {/* Acak Bebas Campur Penuh */}
                  <label 
                    onClick={() => setSeatingMethod('full_random')}
                    className={cn(
                      "flex items-start gap-2.5 p-2.5 rounded-2xl border cursor-pointer transition-all",
                      seatingMethod === 'full_random'
                        ? "bg-emerald-50/50 border-emerald-600 shadow-xs"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="seatingMethod" 
                      checked={seatingMethod === 'full_random'} 
                      onChange={() => setSeatingMethod('full_random')}
                      className="mt-1 accent-indigo-950" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Acak Bebas Campur Penuh
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Seluruh murid dari jenjang terpilih diacak bebas ke seluruh ruangan.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 3. Kapasitas & Jumlah Ruang */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
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
                    <p className="text-[10px] text-slate-400 font-medium">Isi meja per ruang</p>
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
                    <p className="text-[10px] text-slate-400 font-medium">Bagi rata ke N ruang</p>
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

              {/* Tombol Eksekusi Otomatis */}
              <button
                onClick={handleGenerateDistribution}
                className="w-full bg-indigo-950 hover:bg-indigo-900 text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                {seatingMethod === 'standard_class' && <ListOrdered className="w-4 h-4" />}
                {seatingMethod === 'class_shuffled_seats' && <Users className="w-4 h-4" />}
                {seatingMethod === 'cross_grade' && <Shuffle className="w-4 h-4" />}
                {seatingMethod === 'full_random' && <Sparkles className="w-4 h-4" />}
                {seatingMethod === 'standard_class' ? 'Bentuk Ruangan Standar (Urut Absen)' :
                 seatingMethod === 'class_shuffled_seats' ? 'Bentuk Ruangan (Per Kelas Absen Acak)' :
                 seatingMethod === 'full_random' ? 'Bentuk & Acak Ruangan Bebas' :
                 'Bentuk & Acak Ruangan Bersilang'}
              </button>
            </div>

            {/* Panel Ringkasan & Ruang yang Terbentuk */}
            <div className="lg:col-span-2 space-y-5">
              {/* Statistik Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Murid Ujian</p>
                  <p className="text-xl font-black text-indigo-950 mt-1">{eligibleStudents.length}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {selectedGrades.map(g => `${g}: ${studentsByGrade[g]?.length || 0}`).join(' • ')}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumlah Ruangan</p>
                  <p className="text-xl font-black text-blue-600 mt-1">{rooms.length}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{rooms.length > 0 ? 'Ruang Aktif' : 'Belum dibentuk'}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Murid Teralokasi</p>
                  <p className="text-xl font-black text-emerald-600 mt-1">
                    {eligibleStudents.length - unassignedEligibleStudents.length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {unassignedEligibleStudents.length > 0 ? `${unassignedEligibleStudents.length} belum ada ruang` : 'Semua dapat ruang'}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fleksibilitas</p>
                  <p className="text-xs font-black text-purple-600 mt-1.5 line-clamp-1">
                    Mix Auto & Manual
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Bisa ubah & pindah kursi
                  </p>
                </div>
              </div>

              {/* Grid Ruangan & Toolbar Manajemen Manual */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h3 className="font-bold text-indigo-950 text-sm">
                      Daftar Ruang Ujian ({rooms.length} Ruang)
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Klik salah satu ruang untuk mengelola denah, pindah murid, atau menambah peserta manual.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCreateRoomModal(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" /> Tambah Ruang Baru
                    </button>
                    <button
                      onClick={() => {
                        setManualFilterStatus('all');
                        setShowManualAssignModal(true);
                      }}
                      className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Kelola / Pindah Murid
                    </button>
                    {rooms.length > 0 && (
                      <button
                        onClick={handleResetAllRooms}
                        title="Kosongkan Semua Ruang"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {rooms.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 border-dashed">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="font-bold text-indigo-950 text-base">Belum Ada Ruangan yang Dibentuk</h4>
                    <p className="text-slate-400 text-xs max-w-md mx-auto mt-1 mb-4">
                      Tentukan parameter di panel kiri lalu klik bentuk ruang otomatis, atau buat ruang manual secara mandiri.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setShowCreateRoomModal(true)}
                        className="px-4 py-2 bg-indigo-950 text-white rounded-xl font-bold text-xs flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> + Buat Ruang Manual
                      </button>
                      <button
                        onClick={() => {
                          setManualFilterStatus('all');
                          setShowManualAssignModal(true);
                        }}
                        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" /> Alokasi Manual
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {rooms.map(room => {
                      const presentGrades: string[] = (Array.from(new Set(room.seats.map(s => String(s.grade || 'OTHER')))) as string[]).sort();
                      const isFull = room.seats.length >= room.capacity;
                      const remaining = Math.max(0, room.capacity - room.seats.length);

                      return (
                        <div
                          key={room.id}
                          className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-blue-400 hover:shadow-lg transition-all flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span 
                                onClick={() => setSelectedRoomDetail(room)}
                                className="font-black text-indigo-950 text-sm group-hover:text-blue-600 transition-colors cursor-pointer"
                              >
                                {room.name}
                              </span>
                              <span className={cn(
                                "text-[10px] font-black px-2 py-0.5 rounded-md",
                                isFull ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-600"
                              )}>
                                {room.seats.length} / {room.capacity} Meja
                              </span>
                            </div>

                            {/* Badge Jenjang Dinamis */}
                            <div className="flex flex-wrap items-center gap-1 mb-2">
                              {presentGrades.length === 0 ? (
                                <span className="text-[10px] text-slate-400 italic">Ruangan masih kosong</span>
                              ) : (
                                presentGrades.map(g => {
                                  const cnt = room.seats.filter(s => s.grade === g).length;
                                  const style = getGradeBadgeStyle(g);
                                  return (
                                    <span key={g} className={cn("px-2 py-0.5 rounded text-[10px] font-black border", style.pill)}>
                                      Kelas {g}: {cnt}
                                    </span>
                                  );
                                })
                              )}
                            </div>

                            {/* Info Rombel */}
                            {room.classes && room.classes.length > 0 && (
                              <p className="text-[10px] text-slate-500 font-medium line-clamp-1 mb-2">
                                Rombel: <span className="font-bold text-slate-700">{room.classes.join(', ')}</span>
                              </p>
                            )}

                            {/* Sisa Meja */}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-3">
                              <span>Status Meja:</span>
                              <span className={cn("font-bold", remaining > 0 ? "text-emerald-600" : "text-slate-500")}>
                                {remaining > 0 ? `Sisa ${remaining} Meja Kosong` : 'Kapasitas Penuh'}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <button
                              onClick={() => {
                                setManualTargetRoomId(room.id);
                                setManualFilterStatus('unassigned');
                                setShowManualAssignModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Isi Murid
                            </button>
                            <button
                              onClick={() => setSelectedRoomDetail(room)}
                              className="text-indigo-950 hover:text-blue-600 font-black flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
                            >
                              Buka Denah <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
                            size={56} 
                          />
                        </div>
                      </div>

                      {/* Footer Kartu */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-500">
                          {seat.room_name}
                        </span>
                        <span className="font-black text-indigo-950 bg-slate-100 px-2 py-0.5 rounded">
                          MEJA {String(seat.seat_number).padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* DOKUMEN CETAK 2: DENAH MEJA RUANG */}
          {printDocType === 'denah' && (
            <div className="space-y-8">
              {rooms
                .filter(r => printFilterRoom === 'ALL' || r.name === printFilterRoom)
                .map(room => (
                  <div key={room.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm print:border-none print:p-0 page-break">
                    {/* Kop Denah */}
                    <div className="text-center pb-4 border-b-2 border-slate-900 mb-6">
                      <h4 className="font-black text-sm text-indigo-950">DENAH TEMPAT DUDUK PESERTA UJIAN (ASAT)</h4>
                      <h3 className="font-black text-lg text-indigo-950 uppercase mt-0.5">SMAN 19 BANDUNG - {room.name}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Kapasitas: {room.capacity} Meja • Terisi: {room.seats.length} Siswa • Pola: {room.method || 'Silang'}
                      </p>
                    </div>

                    {/* Area Depan (Papan Tulis & Pengawas) */}
                    <div className="border-2 border-slate-800 bg-slate-100 p-2.5 rounded-xl text-center font-black text-xs text-slate-800 tracking-wider mb-6">
                      PAPAN TULIS / MEJA PENGAWAS (DEPAN RUANGAN)
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

      {/* ========================================================================= */}
      {/* MODAL 1: BATCH MANUAL ASSIGNMENT (CHECKBOX, SEARCH & FILTER MURID)         */}
      {/* ========================================================================= */}
      {showManualAssignModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-950 text-white flex items-center justify-center font-black">
                  <UserPlus className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-black text-indigo-950 text-base">
                    Input & Alokasi Murid Manual (Multi-Select Checkbox)
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Filter dan tandai murid sekaligus untuk ditempatkan ke ruangan tertentu, atau keluarkan dari ruangan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManualAssignModal(false)}
                className="p-2 hover:bg-slate-200/60 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Toolbar */}
            <div className="p-4 border-b border-slate-100 bg-white space-y-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama murid, NISN, atau kelas..."
                    value={manualSearchQuery}
                    onChange={(e) => {
                      setManualSearchQuery(e.target.value);
                      setManualCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-bold text-indigo-950 bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                  {manualSearchQuery && (
                    <button
                      onClick={() => setManualSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Kelas */}
                <div className="flex items-center gap-2">
                  <select
                    value={manualFilterGrade}
                    onChange={(e) => {
                      setManualFilterGrade(e.target.value);
                      setManualCurrentPage(1);
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-indigo-950 bg-slate-50 outline-none"
                  >
                    <option value="ALL">Semua Jenjang</option>
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>

                  <select
                    value={manualFilterClass}
                    onChange={(e) => {
                      setManualFilterClass(e.target.value);
                      setManualCurrentPage(1);
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-indigo-950 bg-slate-50 outline-none max-w-[150px]"
                  >
                    <option value="ALL">Semua Kelas</option>
                    {allClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filter Status Tabs */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setManualFilterStatus('all');
                      setManualCurrentPage(1);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                      manualFilterStatus === 'all'
                        ? "bg-indigo-950 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    Semua Murid ({students.length})
                  </button>
                  <button
                    onClick={() => {
                      setManualFilterStatus('unassigned');
                      setManualCurrentPage(1);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1",
                      manualFilterStatus === 'unassigned'
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                    )}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Belum Ada Ruang ({unassignedEligibleStudents.length})
                  </button>
                  <button
                    onClick={() => {
                      setManualFilterStatus('assigned');
                      setManualCurrentPage(1);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                      manualFilterStatus === 'assigned'
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                    )}
                  >
                    Sudah Ditempatkan ({studentAssignmentMap.size / 2})
                  </button>
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAllCurrentPage}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-indigo-950 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                  >
                    Pilih Halaman Ini
                  </button>
                  <button
                    onClick={handleSelectAllFiltered}
                    className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                  >
                    Pilih Semua ({Math.min(filteredManualStudents.length, 500)})
                  </button>
                  {manualSelectedStudentIds.length > 0 && (
                    <button
                      onClick={() => setManualSelectedStudentIds([])}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      Batal Pilih
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Student List Table */}
            <div className="flex-1 overflow-y-auto">
              {filteredManualStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-sm text-slate-600">Tidak ada data murid yang sesuai filter.</p>
                  <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian atau ganti filter status.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-black text-[10px] tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={paginatedStudents.length > 0 && paginatedStudents.every(s => manualSelectedStudentIds.includes(s.id || s.nisn))}
                          onChange={handleSelectAllCurrentPage}
                          className="accent-indigo-950 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-4">Nama Lengkap Murid</th>
                      <th className="py-2.5 px-4">NISN</th>
                      <th className="py-2.5 px-4">Kelas / Rombel</th>
                      <th className="py-2.5 px-4">Status & Ruang Saat Ini</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStudents.map(student => {
                      const sid = student.id || student.nisn;
                      const isSelected = manualSelectedStudentIds.includes(sid);
                      const assignInfo = studentAssignmentMap.get(student.id) || (student.nisn ? studentAssignmentMap.get(student.nisn) : undefined);
                      const style = getGradeBadgeStyle(student.grade);

                      return (
                        <tr
                          key={sid}
                          onClick={() => toggleStudentSelection(sid)}
                          className={cn(
                            "hover:bg-slate-50/80 cursor-pointer transition-colors select-none",
                            isSelected ? "bg-blue-50/50" : ""
                          )}
                        >
                          <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudentSelection(sid)}
                              className="accent-indigo-950 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-4 font-black text-indigo-950">
                            <div className="flex items-center gap-2">
                              <span className={cn("w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shrink-0", style.badge)}>
                                {student.grade || '-'}
                              </span>
                              <span className="line-clamp-1">{formatStudentName(student.nama)}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-500 font-bold">
                            {student.nisn || '-'}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-700">
                            {student.nama_kelas}
                          </td>
                          <td className="py-2.5 px-4">
                            {assignInfo ? (
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                                {assignInfo.roomName} • Meja {String(assignInfo.seatNumber).padStart(2, '0')}
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                Belum Ada Ruang
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 bg-slate-50/50">
              <p>
                Menampilkan {(manualCurrentPage - 1) * itemsPerPage + 1} - {Math.min(manualCurrentPage * itemsPerPage, filteredManualStudents.length)} dari {filteredManualStudents.length} murid
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={manualCurrentPage <= 1}
                  onClick={() => setManualCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                >
                  Sebelumnya
                </button>
                <span className="px-2 font-black text-indigo-950">
                  {manualCurrentPage} / {totalPages}
                </span>
                <button
                  disabled={manualCurrentPage >= totalPages}
                  onClick={() => setManualCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>

            {/* Sticky Action Footer Bar */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">
                  Terpilih: <span className="font-black text-blue-600 text-sm">{manualSelectedStudentIds.length}</span> Murid
                </span>
                {manualSelectedStudentIds.length > 0 && (
                  <button
                    onClick={handleBatchRemoveStudents}
                    className="ml-2 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <UserMinus className="w-3.5 h-3.5" /> Keluarkan dari Ruang
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <span className="text-xs font-bold text-slate-600 hidden sm:inline">Tempatkan ke:</span>
                <select
                  value={manualTargetRoomId}
                  onChange={(e) => setManualTargetRoomId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-indigo-950 px-3 py-2.5 rounded-xl outline-none min-w-[200px]"
                >
                  <option value="">-- Pilih Ruang Tujuan --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Terisi {r.seats.length}/{r.capacity} Meja)
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleBatchAssignStudents}
                  disabled={manualSelectedStudentIds.length === 0 || !manualTargetRoomId}
                  className="px-5 py-2.5 bg-indigo-950 hover:bg-indigo-900 disabled:opacity-40 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" /> Tempatkan Sekarang
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETAIL DENAH RUANG DENGAN KONTROL EDIT KURSI & PINDAH SISWA       */}
      {/* ========================================================================= */}
      {selectedRoomDetail && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <motion.div
            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-950 text-white p-2.5 rounded-2xl">
                  <Building2 className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-indigo-950 text-base">{selectedRoomDetail.name}</h3>
                    <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                      {selectedRoomDetail.seats.length} / {selectedRoomDetail.capacity} Meja
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">
                    Pengawas: {selectedRoomDetail.pengawas_1 || 'Belum diatur'} • Pola: {selectedRoomDetail.method || 'Silang'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setManualTargetRoomId(selectedRoomDetail.id);
                    setManualFilterStatus('unassigned');
                    setShowManualAssignModal(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> + Tambah Murid ke Ruang Ini
                </button>
                <button
                  onClick={() => handleDeleteRoom(selectedRoomDetail.id)}
                  title="Hapus Ruangan Ini"
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setSelectedRoomDetail(null)} className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid Meja Denah Interaktif */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-center font-black text-xs text-slate-600">
                PAPAN TULIS & MEJA PENGAWAS (BAGIAN DEPAN)
              </div>

              {/* Denah Kursi */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {/* 1. Kursi yang sudah terisi */}
                {selectedRoomDetail.seats.map(seat => {
                  const style = getGradeBadgeStyle(seat.grade);
                  return (
                    <div
                      key={seat.seat_number}
                      className={cn(
                        "p-3 rounded-2xl border-2 flex flex-col justify-between transition-all relative group/card",
                        style.box, style.border
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-md border text-slate-700">
                            Meja {String(seat.seat_number).padStart(2, '0')}
                          </span>
                          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded text-white", style.badge)}>
                            Kelas {seat.grade}
                          </span>
                        </div>
                        <p className="font-black text-indigo-950 text-xs line-clamp-1">
                          {formatStudentName(seat.student.nama)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          {seat.student.nama_kelas} • {seat.student.nisn}
                        </p>
                      </div>

                      {/* Tombol Aksi Meja (Pindah, Tukar, Keluarkan) */}
                      <div className="pt-2 mt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                        <button
                          onClick={() => {
                            setMoveStudentModal({
                              open: true,
                              student: seat.student,
                              fromRoomId: selectedRoomDetail.id,
                              currentSeat: seat.seat_number
                            });
                          }}
                          className="font-bold text-blue-700 hover:underline flex items-center gap-0.5"
                          title="Pindahkan murid ini ke ruangan lain"
                        >
                          <ArrowRight className="w-3 h-3" /> Pindah
                        </button>

                        <button
                          onClick={() => {
                            setSwapSeatModal({
                              open: true,
                              student: seat.student,
                              roomId: selectedRoomDetail.id,
                              currentSeat: seat.seat_number
                            });
                          }}
                          className="font-bold text-purple-700 hover:underline flex items-center gap-0.5"
                          title="Tukar nomor meja dengan murid lain"
                        >
                          <ArrowRightLeft className="w-3 h-3" /> Tukar
                        </button>

                        <button
                          onClick={() => handleRemoveSingleStudent(selectedRoomDetail.id, seat.student.id || seat.student.nisn)}
                          className="font-bold text-rose-600 hover:underline flex items-center gap-0.5"
                          title="Keluarkan dari ruangan"
                        >
                          <X className="w-3 h-3" /> Hapus
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Slot Meja Kosong jika kapasitas lebih besar dari jumlah siswa terisi */}
                {Array.from({ length: Math.max(0, selectedRoomDetail.capacity - selectedRoomDetail.seats.length) }).map((_, idx) => {
                  const seatNum = selectedRoomDetail.seats.length + idx + 1;
                  return (
                    <div
                      key={`empty_${seatNum}`}
                      onClick={() => setQuickAssignDeskModal({ open: true, roomId: selectedRoomDetail.id, seatNumber: seatNum })}
                      className="p-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 transition-all flex flex-col justify-between items-center text-center cursor-pointer group min-h-[95px]"
                    >
                      <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border">
                        Meja {String(seatNum).padStart(2, '0')} (Kosong)
                      </span>
                      <div className="text-blue-600 font-bold text-xs flex items-center gap-1 group-hover:scale-105 transition-transform">
                        <Plus className="w-3.5 h-3.5" /> Isi Meja Ini
                      </div>
                      <span className="text-[9px] text-slate-400">Klik untuk tempatkan murid</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                <span>Ubah Kapasitas Meja:</span>
                <input
                  type="number"
                  min={selectedRoomDetail.seats.length}
                  max={60}
                  value={selectedRoomDetail.capacity}
                  onChange={(e) => handleUpdateRoomCapacity(selectedRoomDetail.id, parseInt(e.target.value) || 36)}
                  className="w-16 px-2 py-1 rounded-lg border border-slate-200 font-black text-indigo-950 bg-white text-center"
                />
                <span>Meja</span>
              </div>

              <button
                onClick={() => setSelectedRoomDetail(null)}
                className="px-5 py-2.5 bg-indigo-950 text-white rounded-xl font-bold text-xs active:scale-95 transition-all"
              >
                Selesai & Tutup Denah
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BUAT RUANGAN BARU SECARA MANUAL                                  */}
      {/* ========================================================================= */}
      {showCreateRoomModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <motion.div
            initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-black text-indigo-950 text-sm flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-600" /> Tambah Ruangan Baru
              </h3>
              <button onClick={() => setShowCreateRoomModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Nama Ruangan:</label>
                <input
                  type="text"
                  placeholder={`Contoh: Ruang ${String(rooms.length + 1).padStart(2, '0')} atau Ruang Cadangan`}
                  value={newRoomNameInput}
                  onChange={e => setNewRoomNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-indigo-950 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Kapasitas Meja Duduk:</label>
                <input
                  type="number"
                  min={4}
                  max={60}
                  value={newRoomCapInput}
                  onChange={e => setNewRoomCapInput(parseInt(e.target.value) || 36)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-indigo-950 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCreateRoomModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-500 text-xs bg-white"
              >
                Batal
              </button>
              <button
                onClick={handleCreateNewRoom}
                className="flex-1 py-2.5 rounded-xl bg-indigo-950 text-white font-bold text-xs"
              >
                Simpan Ruangan
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PINDAH RUANG SISWA INDIVIDUAL                                    */}
      {/* ========================================================================= */}
      {moveStudentModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <motion.div
            initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-black text-indigo-950 text-sm flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-blue-600" /> Pindahkan Murid ke Ruang Lain
              </h3>
              <button onClick={() => setMoveStudentModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p className="font-black text-indigo-950">{formatStudentName(moveStudentModal.student.nama)}</p>
              <p className="text-slate-500 font-medium">
                {moveStudentModal.student.nama_kelas} • NISN {moveStudentModal.student.nisn}
              </p>
              <p className="text-blue-600 font-bold text-[11px] pt-1">
                Posisi Saat Ini: Meja {moveStudentModal.currentSeat}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Pilih Ruangan Baru:</label>
              <select
                value={moveTargetRoomId}
                onChange={(e) => setMoveTargetRoomId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-indigo-950 outline-none"
              >
                <option value="">-- Pilih Ruangan Tujuan --</option>
                {rooms
                  .filter(r => r.id !== moveStudentModal.fromRoomId)
                  .map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Terisi {r.seats.length}/{r.capacity} Meja)
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setMoveStudentModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-500 text-xs bg-white"
              >
                Batal
              </button>
              <button
                onClick={handleMoveSingleStudent}
                disabled={!moveTargetRoomId}
                className="flex-1 py-2.5 rounded-xl bg-indigo-950 text-white font-bold text-xs disabled:opacity-40"
              >
                Pindahkan Sekarang
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: TUKAR POSISI MEJA DUDUK (SWAP SEATS)                              */}
      {/* ========================================================================= */}
      {swapSeatModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <motion.div
            initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-black text-indigo-950 text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-purple-600" /> Tukar Nomor Meja Duduk
              </h3>
              <button onClick={() => setSwapSeatModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p className="font-black text-indigo-950">{formatStudentName(swapSeatModal.student.nama)}</p>
              <p className="text-slate-500 font-medium">Saat ini duduk di: <span className="font-bold text-indigo-950">Meja {swapSeatModal.currentSeat}</span></p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Tukar Dengan Nomor Meja:</label>
              <select
                value={swapTargetSeatNumber}
                onChange={(e) => setSwapTargetSeatNumber(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-indigo-950 outline-none"
              >
                <option value="">-- Pilih Nomor Meja Tujuan --</option>
                {rooms.find(r => r.id === swapSeatModal.roomId)?.seats
                  .filter(s => s.seat_number !== swapSeatModal.currentSeat)
                  .map(s => (
                    <option key={s.seat_number} value={s.seat_number}>
                      Meja {String(s.seat_number).padStart(2, '0')} - {formatStudentName(s.student.nama)} ({s.student.nama_kelas})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSwapSeatModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-500 text-xs bg-white"
              >
                Batal
              </button>
              <button
                onClick={handleSwapSeatsInRoom}
                disabled={swapTargetSeatNumber === ''}
                className="flex-1 py-2.5 rounded-xl bg-purple-900 text-white font-bold text-xs disabled:opacity-40"
              >
                Tukar Posisi
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: QUICK ASSIGN TO SPECIFIC EMPTY DESK                              */}
      {/* ========================================================================= */}
      {quickAssignDeskModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <motion.div
            initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-indigo-950 text-sm">
                  Pilih Murid untuk Meja {quickAssignDeskModal.seatNumber}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Klik nama murid untuk langsung menempatkannya di meja ini.
                </p>
              </div>
              <button onClick={() => setQuickAssignDeskModal(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari murid..."
                  value={quickDeskSearch}
                  onChange={(e) => setQuickDeskSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-indigo-950 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {students
                .filter(s => {
                  if (!quickDeskSearch.trim()) return true;
                  const q = quickDeskSearch.toLowerCase();
                  return s.nama.toLowerCase().includes(q) || s.nama_kelas.toLowerCase().includes(q) || s.nisn.includes(q);
                })
                .slice(0, 50)
                .map(s => {
                  const isAssigned = studentAssignmentMap.has(s.id) || (s.nisn && studentAssignmentMap.has(s.nisn));
                  return (
                    <div
                      key={s.id || s.nisn}
                      onClick={() => handleAssignToSpecificDesk(s)}
                      className="p-2.5 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-200 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-black text-indigo-950 text-xs">{formatStudentName(s.nama)}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{s.nama_kelas} • {s.nisn}</p>
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded",
                        isAssigned ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-800"
                      )}>
                        {isAssigned ? 'Sudah Ada Ruang' : 'Belum Ada Ruang'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: INPUT PENGAWAS KUSTOM (PPL / MAHASISWA / EKSTERNAL)               */}
      {/* ========================================================================= */}
      {showAddProctorModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
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
