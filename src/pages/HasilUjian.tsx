import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Download, 
  Filter, 
  User, 
  ChevronRight,
  Trophy,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import React from 'react';
import { cn } from '../lib/utils';
import { getCollectionData } from '../lib/db';
import { useGoogleDrive } from '../context/GoogleDriveContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RefreshCw } from 'lucide-react';

export default function HasilUjian({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { syncNow, isSyncing } = useGoogleDrive();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const data = await getCollectionData('results');
    setResults(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    syncNow(true, 'results').then(fetchData).catch(fetchData);
  }, []);

  const handleRefresh = async () => {
    await syncNow(true, 'results');
    await fetchData();
  };

  const exportToExcel = () => {
    const dataToExport = filteredResults.map(res => ({
      Siswa: res.student?.nama,
      Kelas: res.student?.kelas,
      Ujian: res.examTitle,
      Waktu: new Date(res.timestamp).toLocaleString(),
      Skor: res.score || 0
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hasil Ujian");
    XLSX.writeFile(wb, `Hasil_Ujian_${new Date().getTime()}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Laporan Hasil Ujian - EduTest Lite", 14, 15);
    
    const tableData = filteredResults.map(res => [
      res.student?.nama,
      res.student?.kelas,
      res.examTitle,
      new Date(res.timestamp).toLocaleString(),
      res.score || 0
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Siswa', 'Kelas', 'Ujian', 'Waktu', 'Skor']],
      body: tableData,
    });

    doc.save(`Hasil_Ujian_${new Date().getTime()}.pdf`);
  };

  const filteredResults = results.filter(r => 
    r.student?.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.examTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="animate-pulse space-y-10">
      <div className="h-14 bg-slate-100 rounded-2xl w-full"></div>
      <div className="space-y-4">
        {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl"></div>)}
      </div>
    </div>
  );

  if (results.length === 0 && !loading) return (
    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
      <RefreshCw className="w-12 h-12 text-slate-300 mb-4 animate-spin-slow" />
      <h3 className="text-xl font-black text-indigo-950">Belum ada hasil ujian</h3>
      <p className="text-slate-400 text-sm max-w-sm text-center mt-2">Sinkronkan data dengan tombol "Tarik Data Terbaru" atau tunggu hingga siswa selesai mengerjakan ujian.</p>
      <button 
        onClick={handleRefresh}
        className="mt-6 bg-indigo-950 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-xl shadow-indigo-950/20 active:scale-95 transition-all"
      >
        Tarik Data Terbaru
      </button>
    </div>
  );

  return (
    <div className={cn(isEmbedded ? "space-y-6" : "space-y-10 pb-20")}>
      {!isEmbedded && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="tracking-tight">Hasil Ujian</h2>
            <p className="text-slate-500 text-sm font-medium">Laporan lengkap performa siswa pada setiap sesi ujian.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleRefresh}
              disabled={isSyncing}
              className="bg-slate-100 text-slate-600 px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
              Tarik Data Terbaru
            </button>
            <button 
              onClick={exportToExcel}
              className="bg-white border-2 border-slate-200 text-emerald-600 px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Excel
            </button>
            <button 
              onClick={exportToPDF}
              className="bg-indigo-950 text-white px-8 py-2.5 rounded-xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-indigo-950/20"
            >
              <Download className="w-5 h-5" />
              PDF
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" placeholder="Cari nama siswa atau judul ujian..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-950/5 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Ujian</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Waktu Kerjain</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredResults.map((res, i) => (
                <tr key={res.timestamp || i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5">
                    <div>
                      <p className="font-bold text-indigo-950">{res.student?.nama || res.student?.name}</p>
                      <p className="text-xs text-slate-400 font-bold uppercase">{res.student?.kelas}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-bold text-indigo-950">{res.examTitle || 'Ujian Tak Bernama'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-semibold text-slate-500">{new Date(res.timestamp).toLocaleString()}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg w-fit text-xs font-black">
                      <CheckCircle2 className="w-4 h-4" /> SELESAI
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-xl text-indigo-950">
                    {res.score || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredResults.length === 0 && (
            <div className="py-20 text-center">
              <div className="bg-slate-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-indigo-950">Belum Ada Hasil</h3>
              <p className="text-slate-400 mt-2 max-w-xs mx-auto font-medium">
                Hasil pengerjaan siswa akan muncul di sini setelah sinkronisasi Drive berhasil.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
