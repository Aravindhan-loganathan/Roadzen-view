import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Ambulance,
  Flame,
  Car,
  Construction,
  Bell,
  Clock,
  MapPin,
  Loader2,
  Megaphone,
  Activity,
  X,
  CheckCircle,
  CloudRain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Alert {
  id: number;
  type: string;
  title: string;
  location: string;
  eta: string | null;
  priority: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  impact?: string;
}

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showReportModal, setShowReportModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('traffic_notifications') === 'true');
  const [reportType, setReportType] = useState('accident');
  const [reportLocation, setReportLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/alerts');
        if (response.ok) {
          const data = await response.json();
          setAlerts(data);
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationToggle = (checked: boolean) => {
    setNotificationsEnabled(checked);
    localStorage.setItem('traffic_notifications', String(checked));
    toast({
      title: checked ? "Notifications Enabled" : "Notifications Disabled",
      description: checked ? "You will receive real-time alerts." : "You have opted out of alerts.",
    });
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowReportModal(false);
      setReportLocation('');
      toast({
        title: "Report Submitted",
        description: "Thank you. Your report has been sent for verification.",
      });
    }, 1500);
  };

  const handleVerify = (id: number) => {
    toast({
      title: "Incident Verified",
      description: "Thanks for your feedback! This helps the community.",
      variant: "default",
    });
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'ambulance':
        return <Ambulance className="w-6 h-6" />;
      case 'firetruck':
        return <Flame className="w-6 h-6" />;
      case 'accident':
        return <Car className="w-6 h-6" />;
      case 'closure':
        return <Construction className="w-6 h-6" />;
      case 'weather':
        return <CloudRain className="w-6 h-6" />;
      default:
        return <AlertTriangle className="w-6 h-6" />;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-destructive/50 bg-destructive/5';
      case 'medium':
        return 'border-warning/50 bg-warning/5';
      default:
        return 'border-border';
    }
  };

  const getIconBgStyle = (type: string) => {
    switch (type) {
      case 'ambulance':
        return 'bg-destructive/10 text-destructive';
      case 'firetruck':
        return 'bg-warning/10 text-warning';
      case 'accident':
        return 'bg-destructive/10 text-destructive';
      case 'closure':
        return 'bg-muted text-foreground';
      case 'weather':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const roadClosures = alerts.filter(a => a.type === 'closure').map(a => ({
    id: a.id,
    location: a.location,
    reason: a.title,
    duration: a.impact || 'Unknown'
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Alerts & Emergency</h1>
          <p className="text-muted-foreground mt-1">Real-time emergency alerts and road notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="destructive" 
            className="gap-2 shadow-lg shadow-destructive/20"
            onClick={() => setShowReportModal(true)}
          >
            <Megaphone className="w-4 h-4" />
            Report Incident
          </Button>
          <span className="text-sm text-muted-foreground">Push Notifications</span>
          <Switch 
            checked={notificationsEnabled}
            onCheckedChange={handleNotificationToggle}
          />
        </div>
      </div>

      {/* Emergency Alert Banner */}
      <div className="gradient-bg rounded-xl p-6 animate-pulse-glow">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-primary-foreground">Priority Route Active</h3>
            <p className="text-primary-foreground/80 mt-1">
              Emergency vehicle priority routing is active on MG Road → Hospital Road corridor.
              All signals adjusted for fastest passage.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Vehicles Section */}
      <div>
        <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
          <Ambulance className="w-5 h-5 text-destructive" />
          Active Emergency Vehicles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts
            .filter(a => ['ambulance', 'firetruck', 'weather'].includes(a.type))
            .map((alert, index) => (
              <div
                key={alert.id}
                className={`glow-card p-5 border-2 ${getPriorityStyle(alert.priority)} animate-fade-in`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getIconBgStyle(alert.type)}`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{alert.title}</h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        alert.priority === 'high' 
                          ? 'bg-destructive/10 text-destructive' 
                          : 'bg-warning/10 text-warning'
                      }`}>
                        {alert.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4" />
                      {alert.location}
                    </div>
                    {alert.eta && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-medium">ETA: {alert.eta}</span>
                      </div>
                    )}
                    {alert.impact && (
                      <div className="mt-2 text-xs bg-background/50 p-2 rounded border border-border flex items-center gap-2">
                        <Activity className="w-3 h-3 text-destructive" />
                        <span className="font-medium text-foreground/80">Impact: {alert.impact}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Accidents & Incidents */}
      <div>
        <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
          <Car className="w-5 h-5 text-warning" />
          Accidents & Incidents
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts
            .filter(a => a.type === 'accident')
            .map((alert, index) => (
              <div
                key={alert.id}
                className={`glow-card p-5 border ${getPriorityStyle(alert.priority)} animate-fade-in`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getIconBgStyle(alert.type)}`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{alert.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <MapPin className="w-4 h-4" />
                      {alert.location}
                    </div>
                    <div className="flex gap-2">
                      {alert.latitude && alert.longitude && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-2"
                          onClick={() => navigate('/public/map', { state: { center: [alert.latitude, alert.longitude], zoom: 16 } })}
                        >
                          <MapPin className="w-3 h-3" />
                          Show on Map
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => handleVerify(alert.id)}>
                        <CheckCircle className="w-3 h-3" />
                        Verify
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Road Closures */}
      <div>
        <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
          <Construction className="w-5 h-5 text-muted-foreground" />
          Road Closures & Maintenance
        </h2>
        {roadClosures.length > 0 ? (
          <div className="glow-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Location</th>
                  <th className="text-left p-4 font-medium text-sm">Reason</th>
                  <th className="text-left p-4 font-medium text-sm">Duration/Impact</th>
                </tr>
              </thead>
              <tbody>
                {roadClosures.map((closure, index) => (
                  <tr key={closure.id} className="border-t border-border">
                    <td className="p-4">{closure.location}</td>
                    <td className="p-4 text-muted-foreground">{closure.reason}</td>
                    <td className="p-4">
                      <span className="text-sm bg-muted px-2 py-1 rounded">{closure.duration}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            No active road closures reported.
          </div>
        )}
      </div>

      {/* Push Notification UI Placeholder */}
      <div className="glow-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-2">Push Notifications</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enable push notifications to receive real-time alerts about traffic conditions,
              emergency vehicles, and road closures in your area.
            </p>
            <Button variant="outline" onClick={() => handleNotificationToggle(!notificationsEnabled)}>
              {notificationsEnabled ? 'Disable Notifications' : 'Enable Notifications'}
            </Button>
          </div>
        </div>
      </div>

      {/* Report Incident Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glow-card p-6 m-4 relative bg-card">
            <button 
              onClick={() => setShowReportModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Report Incident
            </h2>
            
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Incident Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['accident', 'closure', 'weather', 'hazard'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setReportType(type)}
                      className={`p-2 rounded border text-sm capitalize ${
                        reportType === type 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Location</Label>
                <Input 
                  placeholder="e.g., Main Street Junction" 
                  value={reportLocation}
                  onChange={(e) => setReportLocation(e.target.value)}
                  required 
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full gradient-bg" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Report
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
