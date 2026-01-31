import { Severity } from 'src/types/report';

export const SeverityBadge = ({ severity }: { severity: Severity }) => {
  const map = {
    low: 'bg-green-500/10 text-green-600',
    medium: 'bg-yellow-500/10 text-yellow-600',
    high: 'bg-orange-500/10 text-orange-600',
    critical: 'bg-red-500/10 text-red-600',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${map[severity]}`}>
      {severity.toUpperCase()}
    </span>
  );
};
