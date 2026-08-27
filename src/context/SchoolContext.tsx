import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface School {
  id: string;
  name: string;
  address?: string;
}

interface SchoolContextType {
  schools: School[];
  activeSchool: School | null;
  setActiveSchool: (school: School | null) => Promise<void>;
  loading: boolean;
  refreshSchools: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [schools, setSchools] = useState<School[]>([]);
  const [activeSchool, setActiveSchoolState] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSchools = async () => {
    try {
      const sessionStr = localStorage.getItem('edu_session');
      if (!sessionStr) {
        setLoading(false);
        return;
      }
      
      const session = JSON.parse(sessionStr);
      // Priority: user.schools array -> user.schoolName fallback
      const userSchools = session.user?.schools || (session.user?.schoolName ? [session.user.schoolName] : []);
      
      if (userSchools.length > 0) {
        const schoolList = userSchools.map((name: string, index: number) => ({
          id: String(index + 1),
          name: name,
          address: 'Digital Location'
        }));
        
        setSchools(schoolList);
        
        // Load active school from storage or default to first
        const savedId = localStorage.getItem('active_school_id');
        let active = schoolList.find((s: School) => s.id === savedId);
        
        // If not found (maybe school was deleted or session cleared), default to first
        if (!active) {
          active = schoolList[0];
          localStorage.setItem('active_school_id', active.id);
        }
        
        setActiveSchoolState(active);
      } else {
        setSchools([]);
        setActiveSchoolState(null);
      }
    } catch (err) {
      console.error('Error refreshing schools:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSchools();
  }, []);

  const setActiveSchool = async (school: School | null) => {
    setActiveSchoolState(school);
    if (school) {
      localStorage.setItem('active_school_id', school.id);
    }
  };

  return (
    <SchoolContext.Provider value={{ schools, activeSchool, setActiveSchool, loading, refreshSchools }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
}
