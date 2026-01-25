// Traffic Status Data
export const trafficSummary = {
  smoothRoads: 45,
  moderateTraffic: 32,
  heavyTraffic: 12,
  totalVehicles: 24580,
  activeCameras: 48,
  congestedLanes: 8,
  emergencyEvents: 3,
};

// Junction Data
export const junctions = [
  { id: 1, name: 'MG Road Junction', currentGreen: 'North', countdown: 25, congestionLevel: 'low' },
  { id: 2, name: 'Brigade Road Crossing', currentGreen: 'East', countdown: 18, congestionLevel: 'medium' },
  { id: 3, name: 'Indiranagar Signal', currentGreen: 'West', countdown: 32, congestionLevel: 'high' },
  { id: 4, name: 'Koramangala Junction', currentGreen: 'South', countdown: 12, congestionLevel: 'medium' },
  { id: 5, name: 'Whitefield Main', currentGreen: 'North', countdown: 45, congestionLevel: 'low' },
  { id: 6, name: 'Electronic City Gate', currentGreen: 'East', countdown: 8, congestionLevel: 'high' },
];

// Traffic Trend Data for Charts
export const hourlyTrafficData = [
  { hour: '6 AM', vehicles: 1200 },
  { hour: '7 AM', vehicles: 3500 },
  { hour: '8 AM', vehicles: 5800 },
  { hour: '9 AM', vehicles: 6200 },
  { hour: '10 AM', vehicles: 4100 },
  { hour: '11 AM', vehicles: 3800 },
  { hour: '12 PM', vehicles: 4200 },
  { hour: '1 PM', vehicles: 4500 },
  { hour: '2 PM', vehicles: 4000 },
  { hour: '3 PM', vehicles: 4300 },
  { hour: '4 PM', vehicles: 5200 },
  { hour: '5 PM', vehicles: 6800 },
  { hour: '6 PM', vehicles: 7200 },
  { hour: '7 PM', vehicles: 5500 },
  { hour: '8 PM', vehicles: 3200 },
  { hour: '9 PM', vehicles: 2100 },
];

// Emergency Alerts
export const emergencyAlerts = [
  {
    id: 1,
    type: 'ambulance',
    title: 'Ambulance Detected',
    location: 'MG Road towards Hospital',
    eta: '2 min',
    priority: 'high',
    timestamp: new Date(),
  },
  {
    id: 2,
    type: 'firetruck',
    title: 'Fire Truck Approaching',
    location: 'Brigade Road Junction',
    eta: '5 min',
    priority: 'high',
    timestamp: new Date(),
  },
  {
    id: 3,
    type: 'accident',
    title: 'Accident Reported',
    location: 'Outer Ring Road, Marathahalli',
    eta: null,
    priority: 'medium',
    timestamp: new Date(),
  },
];

// Vehicle Detection Data
export const vehicleDetection = {
  car: 12450,
  bike: 8920,
  bus: 1230,
  truck: 890,
  ambulance: 45,
  total: 23535,
  fps: 24,
  confidence: 94.5,
};

// Lane Analytics Data
export const laneData = [
  { id: 1, lane: 'Lane 1 - North', vehicles: 3240, density: 72, status: 'high' },
  { id: 2, lane: 'Lane 2 - South', vehicles: 2180, density: 45, status: 'medium' },
  { id: 3, lane: 'Lane 3 - East', vehicles: 1890, density: 38, status: 'low' },
  { id: 4, lane: 'Lane 4 - West', vehicles: 2560, density: 58, status: 'medium' },
];

// Signal Performance Data
export const signalPerformance = [
  { junction: 'MG Road', efficiency: 92 },
  { junction: 'Brigade Rd', efficiency: 78 },
  { junction: 'Indiranagar', efficiency: 65 },
  { junction: 'Koramangala', efficiency: 85 },
  { junction: 'Whitefield', efficiency: 88 },
  { junction: 'E-City', efficiency: 71 },
];

// Traffic Violations
export const violations = [
  {
    id: 'VIO-001',
    type: 'Signal Jump',
    vehicleNumber: 'KA-01-AB-1234',
    location: 'MG Road Junction',
    timestamp: new Date(),
    fine: 500,
    status: 'pending',
  },
  {
    id: 'VIO-002',
    type: 'Over Speeding',
    vehicleNumber: 'KA-05-CD-5678',
    location: 'Outer Ring Road',
    timestamp: new Date(),
    fine: 1000,
    status: 'issued',
  },
  {
    id: 'VIO-003',
    type: 'Lane Violation',
    vehicleNumber: 'KA-02-EF-9012',
    location: 'Brigade Road',
    timestamp: new Date(),
    fine: 300,
    status: 'pending',
  },
  {
    id: 'VIO-004',
    type: 'Signal Jump',
    vehicleNumber: 'KA-03-GH-3456',
    location: 'Indiranagar Signal',
    timestamp: new Date(),
    fine: 500,
    status: 'paid',
  },
];

// Map Markers (Traffic Signals)
export const mapMarkers = [
  { id: 1, lat: 12.9716, lng: 77.5946, name: 'MG Road', traffic: 'low' },
  { id: 2, lat: 12.9698, lng: 77.6075, name: 'Brigade Road', traffic: 'medium' },
  { id: 3, lat: 12.9784, lng: 77.6408, name: 'Indiranagar', traffic: 'high' },
  { id: 4, lat: 12.9352, lng: 77.6245, name: 'Koramangala', traffic: 'medium' },
  { id: 5, lat: 12.9698, lng: 77.7500, name: 'Whitefield', traffic: 'low' },
  { id: 6, lat: 12.8458, lng: 77.6712, name: 'Electronic City', traffic: 'high' },
];
