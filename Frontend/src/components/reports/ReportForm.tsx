import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { submitReport } from '@/services/reportApi';
import { useToast } from '@/hooks/use-toast';
import { Severity } from '@/types/report';

export const ReportForm = () => {
  const { toast } = useToast();
  const [form, setForm] = useState<{
    type: string;
    severity: Severity;
    description: string;
    location: string;
  }>({
    type: '',
    severity: 'low' as Severity,
    description: '',
    location: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!form.type.trim() || !form.location.trim() || !form.description.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReport(form);
      toast({
        title: 'Success',
        description: 'Report submitted successfully',
      });
      setForm({ type: '', severity: 'low' as Severity, description: '', location: '' });
    } catch (error) {
      console.error('Report submission error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const severityOptions: Severity[] = ['low', 'medium', 'high', 'critical'];

  return (
    <div className="glow-card p-6 space-y-4">
      <h2 className="text-xl font-semibold">Report an Issue</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium">Problem Type</label>
        <Input
          placeholder="Accident, Signal issue, Road damage..."
          value={form.type}
          onChange={e => setForm({ ...form, type: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Severity Level</label>
        <select
          className="w-full px-3 py-2 border border-border rounded-md bg-background"
          value={form.severity}
          onChange={e => setForm({ ...form, severity: e.target.value as Severity })}
        >
          {severityOptions.map(option => (
            <option key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Location</label>
        <Input
          placeholder="Street name or intersection"
          value={form.location}
          onChange={e => setForm({ ...form, location: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          placeholder="Describe the issue in detail"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          rows={4}
        />
      </div>

      <Button onClick={submit} disabled={isSubmitting} className="gradient-bg w-full">
        {isSubmitting ? 'Submitting...' : 'Submit Report'}
      </Button>
    </div>
  );
};