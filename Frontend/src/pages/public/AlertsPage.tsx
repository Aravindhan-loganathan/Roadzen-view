import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface Alert {
  id: number;
  type: string;
  title: string;
  location: string;
  eta: string | null;
  priority: string;
  timestamp: string;
}

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const roadClosures = [
    { id: 1, location: 'MG Road (Sector 5)', reason: 'Road Maintenance', duration: '2 hours' },
    { id: 2, location: 'Outer Ring Road', reason: 'Accident Clearance', duration: '30 mins' },
  ];

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

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'ambulance':
        return <Ambulance className="w-6 h-6" />;
      case 'firetruck':
        return <Flame className="w-6 h-6" />;
      case 'accident':
        return <Car className="w-6 h-6" />;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Alerts & Emergency</h1>
          <p className="text-muted-foreground mt-1">Real-time emergency alerts and road notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Push Notifications</span>
          <Switch defaultChecked />
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
            .filter(a => a.type === 'ambulance' || a.type === 'firetruck')
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
                      <Button size="sm" variant="outline">View on Map</Button>
                      <Button size="sm" variant="outline">Report Update</Button>
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
          Road Closures
        </h2>
        <div className="glow-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium text-sm">Location</th>
                <th className="text-left p-4 font-medium text-sm">Reason</th>
                <th className="text-left p-4 font-medium text-sm">Duration</th>
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
            <Button variant="outline">Configure Notifications</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
