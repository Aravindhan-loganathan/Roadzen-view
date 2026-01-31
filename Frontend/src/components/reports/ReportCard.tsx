import { Report } from 'src/types/report';
import { MapPin, Clock } from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';

export const ReportCard = ({ report }: { report: Report }) => {
  return (
    <div className="glow-card p-4 border">
      <div className="flex justify-between mb-2">
        <h3 className="font-semibold">{report.type}</h3>
        <SeverityBadge severity={report.severity} />
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        {report.description}
      </p>

      <div className="flex justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="w-4 h-4" /> {report.location}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" /> {report.status}
        </span>
      </div>
    </div>
  );
};
