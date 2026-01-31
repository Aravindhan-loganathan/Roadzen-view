import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Bell, Shield, LogOut, Loader2, UserRound, Car, X, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

export const ProfilePage: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    phone: '',
    vehicle_number: ''
  });

  // Fetch latest profile data on mount to ensure we have the latest fields (location, phone)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('traffic_token');
        if (!token) return;

        const response = await fetch('http://localhost:3000/api/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.user) updateUser(data.user);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        location: user.location || '',
        phone: user.phone || '',
        vehicle_number: user.vehicle_number || ''
      }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('traffic_token');
      const response = await fetch('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          phone: formData.phone,
          vehicle_number: formData.vehicle_number
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // Update global state with the new user object from backend
      updateUser(data.user);

      toast({
        title: "Success",
        description: "Profile updated successfully.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Change Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }

    setIsPasswordLoading(true);
    try {
      const token = localStorage.getItem('traffic_token');
      const response = await fetch('http://localhost:3000/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.current,
          newPassword: passwordData.new
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      toast({ title: "Success", description: "Password changed successfully" });
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive"
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      {/* Profile Card */}
      <div className="glow-card p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-3xl font-bold">
            <UserRound className="w-12 h-12 text-primary-foreground" />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-display font-bold">{user?.name || 'User'}</h2>
            <p className="text-muted-foreground">{user?.email}</p>
            <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <User className="w-4 h-4" />
              {user?.role === 'admin' ? 'Administrator' : 'Public User'}
            </span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="glow-card p-6">
        <h3 className="text-lg font-display font-semibold mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleInputChange}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="Enter your location"
                value={formData.location}
                onChange={handleInputChange}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle_number">Vehicle Number</Label>
            <div className="relative">
              <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="vehicle_number"
                placeholder="e.g., TN-01-AB-1234"
                value={formData.vehicle_number}
                onChange={handleInputChange}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        <Button
          className="mt-4 gradient-bg"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Notification Preferences */}
      <div className="glow-card p-6">
        <h3 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Preferences
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Emergency Alerts</p>
              <p className="text-sm text-muted-foreground">Receive alerts for ambulance and emergency vehicles</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="font-medium">Traffic Updates</p>
              <p className="text-sm text-muted-foreground">Get notified about traffic conditions on your routes</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="font-medium">Road Closures</p>
              <p className="text-sm text-muted-foreground">Be informed about road closures and diversions</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="font-medium">Signal Changes</p>
              <p className="text-sm text-muted-foreground">Notifications about signal timing changes</p>
            </div>
            <Switch />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="glow-card p-6">
        <h3 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security
        </h3>
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => setShowPasswordModal(true)}
          >Change Password</Button>
        </div>
      </div>

      {/* Logout */}
      <div className="glow-card p-6">
        <Button
          variant="destructive"
          onClick={logout}
          className="w-full gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glow-card p-6 m-4 relative bg-card">
            <button 
              onClick={() => setShowPasswordModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Change Password
            </h2>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" required 
                  value={passwordData.current}
                  onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" required 
                  value={passwordData.new}
                  onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" required 
                  value={passwordData.confirm}
                  onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full gradient-bg" disabled={isPasswordLoading}>
                {isPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Password
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
