import React from 'react';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Database,
  Wifi,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage system configuration and preferences</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        {/* Appearance */}
        <div className="glow-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Appearance
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Toggle between light and dark theme</p>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="glow-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Emergency Alerts</p>
                <p className="text-sm text-muted-foreground">Real-time emergency vehicle notifications</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div>
                <p className="font-medium">System Alerts</p>
                <p className="text-sm text-muted-foreground">Camera offline and system health alerts</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div>
                <p className="font-medium">Violation Alerts</p>
                <p className="text-sm text-muted-foreground">New traffic violation detected</p>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="glow-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security
          </h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              Change Password
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Two-Factor Authentication
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Session Management
            </Button>
            <Button variant="outline" className="w-full justify-start">
              API Keys
            </Button>
          </div>
        </div>

        {/* System */}
        <div className="glow-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            System Configuration
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Auto-refresh Interval</p>
                <p className="text-sm text-muted-foreground">How often to refresh dashboard data</p>
              </div>
              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">5 seconds</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div>
                <p className="font-medium">AI Model</p>
                <p className="text-sm text-muted-foreground">Vehicle detection model version</p>
              </div>
              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">YOLOv8n</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div>
                <p className="font-medium">Detection Confidence</p>
                <p className="text-sm text-muted-foreground">Minimum confidence threshold</p>
              </div>
              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">85%</span>
            </div>
          </div>
        </div>

        {/* Connectivity */}
        <div className="glow-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Connectivity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Camera Network</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="font-medium">48/48 Online</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Signal Controllers</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="font-medium">All Connected</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Database</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="font-medium">Healthy</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">AI Server</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="font-medium">GPU Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="glow-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Account
          </h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-2xl font-bold">
              A
            </div>
            <div>
              <p className="font-semibold">Admin User</p>
              <p className="text-sm text-muted-foreground">admin@smarttraffic.com</p>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1 inline-block">
                Administrator
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full">Edit Profile</Button>
        </div>
      </div>
    </div>
  );
};
