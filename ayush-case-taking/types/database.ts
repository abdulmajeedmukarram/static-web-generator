export interface AiAnalysis {
  summary?: string;
  chief_complaint?: string;
  symptoms?: string[];
  red_flags?: string[];
  differential_diagnoses?: Array<{ condition: string; confidence?: number; rationale?: string; }>;
  ayush_recommendations?: string[];
  [key: string]: unknown;
}

export interface DashavidhaPariksha {
  prakriti?: string; vikriti?: string; sara?: string; samhanana?: string; pramana?: string;
  satmya?: string; sattva?: string; ahara_shakti?: string; vyayama_shakti?: string; vaya?: string;
  [key: string]: unknown;
}

export interface MedicalDocument {
  file_name: string;
  doc_type: string;
  extracted: Record<string, unknown>;
  uploaded_at: string;
}

export interface Patient {
  id: string;
  created_by: string;
  name: string;
  age: number | null;
  gender: string | null;
  contact: string | null;
  past_history?: string;
  patient_code?: string | null;
  medical_documents?: MedicalDocument[];
  created_at: string;
}

export interface Consultation {
  id: string;
  patient_id: string;
  raw_transcript: string;
  ai_analysis: AiAnalysis;
  is_reviewed: boolean;
  doctor_notes?: string;
  treatment_plan?: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  email: string;
  name: string | null;
  pass_hash: string;
  created_at: string;
}
