import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { createViolation, updateViolation, ViolationForm, Violation } from '@/services/violationApi';
import { AlertOctagon } from 'lucide-react';

interface CreateViolationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  violation?: Violation | null;
}

export const CreateViolationDialog: React.FC<CreateViolationDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  violation,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ViolationForm>({
    type: '',
    vehicle_number: '',
    location: '',
    fine_amount: 0,
    status: 'pending',
  });

  useEffect(() => {
    if (violation) {
      setFormData({
        type: violation.type,
        vehicle_number: violation.vehicle_number,
        location: violation.location,
        fine_amount: violation.fine_amount,
        status: violation.status,
      });
    } else {
      setFormData({
        type: '',
        vehicle_number: '',
        location: '',
        fine_amount: 0,
        status: 'pending',
      });
    }
    setError(null);
  }, [violation, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'fine_amount' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (violation) {
        await updateViolation(violation.id, formData);
      } else {
        await createViolation(formData);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-destructive" />
            <DialogTitle>{violation ? 'Update Violation' : 'Create New Violation'}</DialogTitle>
          </div>
          <DialogDescription>
            {violation
              ? 'Update the violation details below'
              : 'Enter the violation details to create a new record in the database'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Violation Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Violation Type</Label>
            <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select violation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Signal Jump">Signal Jump</SelectItem>
                <SelectItem value="Over Speeding">Over Speeding</SelectItem>
                <SelectItem value="Lane Violation">Lane Violation</SelectItem>
                <SelectItem value="Illegal Parking">Illegal Parking</SelectItem>
                <SelectItem value="No Helmet">No Helmet</SelectItem>
                <SelectItem value="Wrong Side">Wrong Side</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vehicle Number */}
          <div className="space-y-2">
            <Label htmlFor="vehicle_number">Vehicle Number</Label>
            <Input
              id="vehicle_number"
              name="vehicle_number"
              placeholder="e.g., KA01AB1234"
              value={formData.vehicle_number}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select value={formData.location} onValueChange={(value) => handleSelectChange('location', value)}>
              <SelectTrigger id="location">
                <SelectValue placeholder="Select junction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MG Road Junction">MG Road Junction</SelectItem>
                <SelectItem value="Brigade Road Crossing">Brigade Road Crossing</SelectItem>
                <SelectItem value="Indiranagar Signal">Indiranagar Signal</SelectItem>
                <SelectItem value="Koramangala Junction">Koramangala Junction</SelectItem>
                <SelectItem value="Whitefield Main">Whitefield Main</SelectItem>
                <SelectItem value="Electronic City Gate">Electronic City Gate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fine Amount */}
          <div className="space-y-2">
            <Label htmlFor="fine_amount">Fine Amount (₹)</Label>
            <Input
              id="fine_amount"
              name="fine_amount"
              type="number"
              step="0.01"
              placeholder="e.g., 500.00"
              value={formData.fine_amount}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : violation ? 'Update Violation' : 'Create Violation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
