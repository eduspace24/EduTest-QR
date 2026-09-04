import { Client, Databases, Account, ID, Query } from 'appwrite';

const meta = import.meta as any;

export const APPWRITE_ENDPOINT = meta.env?.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = meta.env?.VITE_APPWRITE_PROJECT_ID || '6a9a2281000770a85575';
export const APPWRITE_DATABASE_ID = meta.env?.VITE_APPWRITE_DATABASE_ID || '6a9a32130018d9b3e0a1';

// Collection IDs
export const COLLECTIONS = {
  PROFILES: 'profiles',
  STUDENTS: 'students',
  CLASSES: 'classes',
  EXAMS: 'exams',
  EXAM_RESULTS: 'exam_results'
};

export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const account = new Account(client);

export { ID, Query };
