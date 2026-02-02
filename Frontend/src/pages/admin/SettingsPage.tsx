import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Bell,
  Shield,
  Database,
  Wifi,
  Palette,
  Check,
  Save,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { settingsService, SystemSettings, UserSettings } from '@/services/settingsService';
import { toast } from 'sonner';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, updateUser } = useAuth();

  // States
  const [loading, setLoading] = useState(true);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    emergencyAlerts: true,
    systemAlerts: true,
    violationAlerts: false,
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    refresh_interval: '5',
    ai_model: 'YOLOv8n',
    confidence_threshold: '85',
  });

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    location: user?.location || '',
    phone: user?.phone || '',
    vehicleNumber: user?.vehicleNumber || '',
  });

  // Password Edit State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [userS, systemS] = await Promise.all([
        settingsService.getUserSettings(),
        settingsService.getSystemSettings()
      ]);
      setUserSettings(userS);
      setSystemSettings(systemS);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = async (key: keyof UserSettings, value: boolean) => {
    const updated = { ...userSettings, [key]: value };
    setUserSettings(updated);
    try {
      await settingsService.updateUserSettings(updated);
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to update preferences');
      // Rollback
      setUserSettings(userSettings);
    }
  };


  const handleUpdateProfile = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('traffic_token')}`
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const data = await response.json();
        updateUser(data.user);
        setIsEditingProfile(false);
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      toast.error('Error updating profile');
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await settingsService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error('Failed to change password');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage system configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Notifications */}
          <div className="glow-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Emergency Alerts</p>
                  <p className="text-sm text-muted-foreground">Real-time emergency vehicle notifications</p>
                </div>
                <Switch
                  checked={userSettings.emergencyAlerts}
                  onCheckedChange={(v) => handleNotificationToggle('emergencyAlerts', v)}
                />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <p className="font-medium">System Alerts</p>
                  <p className="text-sm text-muted-foreground">Camera offline and system health alerts</p>
                </div>
                <Switch
                  checked={userSettings.systemAlerts}
                  onCheckedChange={(v) => handleNotificationToggle('systemAlerts', v)}
                />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <p className="font-medium">Violation Alerts</p>
                  <p className="text-sm text-muted-foreground">New traffic violation detected</p>
                </div>
                <Switch
                  checked={userSettings.violationAlerts}
                  onCheckedChange={(v) => handleNotificationToggle('violationAlerts', v)}
                />
              </div>
            </div>
          </div>

          {/* System Configuration */}
          <div className="glow-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              System Configuration
            </h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Auto-refresh Interval</p>
                  <p className="text-sm text-muted-foreground">Seconds between dashboard updates</p>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-md border">
                  <span className="font-mono font-bold text-primary">{systemSettings.refresh_interval}</span>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">sec</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-border pt-4">
                <div>
                  <p className="font-medium">AI Model</p>
                  <p className="text-sm text-muted-foreground">Model version for vehicle detection</p>
                </div>
                <div className="bg-muted/50 px-3 py-1 rounded-md border">
                  <span className="font-mono font-bold text-primary">{systemSettings.ai_model}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-border pt-4">
                <div>
                  <p className="font-medium">Detection Confidence</p>
                  <p className="text-sm text-muted-foreground">Minimum % for positive detection</p>
                </div>
                <div className="flex items-center gap-1 bg-muted/50 px-3 py-1 rounded-md border">
                  <span className="font-mono font-bold text-primary">{systemSettings.confidence_threshold}</span>
                  <span className="text-xs text-muted-foreground font-bold">%</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10 flex items-start gap-3">
                <Shield className="w-4 h-4 text-primary mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  System configurations are managed by the core infrastructure team and cannot be modified through the admin dashboard for security reasons.
                </p>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="glow-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Security
            </h3>
            {isChangingPassword ? (
              <div className="space-y-4 animate-slide-up">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Password</label>
                  <Input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Password</label>
                    <Input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <Input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="ghost" onClick={() => setIsChangingPassword(false)}>Cancel</Button>
                  <Button onClick={handleChangePassword} className="gap-2">
                    <Lock className="w-4 h-4" />
                    Update Password
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3" onClick={() => setIsChangingPassword(true)}>
                  <Lock className="w-4 h-4" />
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3" disabled>
                  <Shield className="w-4 h-4" />
                  Two-Factor Authentication (Coming Soon)
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Account */}
          <div className="glow-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary" />
              Account
            </h3>

            {isEditingProfile ? (
              <div className="space-y-4 animate-slide-up">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    value={profileData.location}
                    onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleUpdateProfile} className="gap-2">
                    <Check className="w-3 h-3" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg shadow-primary/20">
                    {user?.name.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{user?.name || 'Admin'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1 font-bold uppercase tracking-wider">
                      {user?.role}
                    </span>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-tight mb-0.5">Phone</p>
                    <p className="font-medium">{user?.phone || 'Not set'}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-tight mb-0.5">Location</p>
                    <p className="font-medium">{user?.location || 'Not set'}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setIsEditingProfile(true)}>
                  Edit Profile
                </Button>
              </>
            )}
          </div>

          {/* Appearance */}
          <div className="glow-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Appearance
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">System theme</p>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>
          </div>

          {/* Connectivity Status (Static) */}
          <div className="glow-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" />
              Connectivity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cameras</span>
                <span className="flex items-center gap-1.5 font-medium text-success">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Live
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Signals</span>
                <span className="flex items-center gap-1.5 font-medium text-success">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Healthy
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Latency</span>
                <span className="font-mono text-xs">18ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

