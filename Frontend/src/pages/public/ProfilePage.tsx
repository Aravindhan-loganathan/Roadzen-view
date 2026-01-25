import React from 'react';
import { User, Mail, Phone, MapPin, Bell, Shield, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();

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
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-display font-bold">{user?.name || 'User'}</h2>
            <p className="text-muted-foreground">{user?.email}</p>
            <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <User className="w-4 h-4" />
              Public User
            </span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="glow-card p-6">
        <h3 className="text-lg font-display font-semibold mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="fullName" defaultValue={user?.name} className="pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="email" type="email" defaultValue={user?.email} className="pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" className="pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Default Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="location" placeholder="Your area" className="pl-10" />
            </div>
          </div>
        </div>
        <Button className="mt-4 gradient-bg">Save Changes</Button>
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
          <Button variant="outline" className="w-full justify-start">Change Password</Button>
          <Button variant="outline" className="w-full justify-start">Two-Factor Authentication</Button>
          <Button variant="outline" className="w-full justify-start">Connected Devices</Button>
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
    </div>
  );
};
