export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface Report {
  id: number;
  type: string;
  severity: Severity;
  description: string;
  location: string;
  status: ReportStatus;
  createdAt: string;
}
