import { BoundaryPolygon, GPSLocation } from '../types';

// Central Cahul, Moldova coordinates
export const CAHUL_CENTER = {
  lat: 45.9074,
  lng: 28.1944,
  zoom: 15,
};

// Preset polygons for Cahul
export const CAHUL_DEFAULT_BOUNDARY: BoundaryPolygon = {
  name: 'Cahul Central Zone (Parcul Central & Piața Horelor)',
  bufferMeters: 25, // 25-meter GPS accuracy tolerance
  coordinates: [
    [45.9142, 28.1870], // North-West near Sanatoriu
    [45.9148, 28.2015], // North-East
    [45.9095, 28.2045], // East
    [45.9015, 28.2010], // South-East near Piața Centrală
    [45.8990, 28.1920], // South near Universitatea Hasdeu
    [45.9030, 28.1845], // South-West
    [45.9090, 28.1835], // West
  ],
};

export const CAHUL_LANDMARKS = [
  { name: 'Parcul Grigore Vieru', lat: 45.9068, lng: 28.1925, icon: '🌳' },
  { name: 'Piața Horelor / Primăria', lat: 45.9045, lng: 28.1950, icon: '🏛️' },
  { name: 'Catedrala Sf. Mihail și Gavriil', lat: 45.9080, lng: 28.1915, icon: '⛪' },
  { name: 'Universitatea B.P. Hasdeu', lat: 45.9015, lng: 28.1885, icon: '🎓' },
  { name: 'Sanatoriul Nufărul Alb', lat: 45.9135, lng: 28.1985, icon: '⛲' },
  { name: 'Teatrul Dramatic B.P. Hasdeu', lat: 45.9060, lng: 28.1960, icon: '🎭' },
];

/**
 * Ray-casting point-in-polygon algorithm
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [lat, lng] = point;
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Haversine distance in meters between two coordinates
 */
export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Distance from point to line segment in meters
 */
function distanceToSegmentMeters(
  p: [number, number],
  v: [number, number],
  w: [number, number]
): number {
  const l2 = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2;
  if (l2 === 0) return haversineDistanceMeters(p[0], p[1], v[0], v[1]);
  // Project point onto line segment
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection: [number, number] = [
    v[0] + t * (w[0] - v[0]),
    v[1] + t * (w[1] - v[1]),
  ];
  return haversineDistanceMeters(p[0], p[1], projection[0], projection[1]);
}

/**
 * Minimum distance from point to polygon perimeter in meters
 */
export function distanceToPolygonMeters(point: [number, number], polygon: [number, number][]): number {
  let minDistance = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const nextIdx = (i + 1) % polygon.length;
    const dist = distanceToSegmentMeters(point, polygon[i], polygon[nextIdx]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
}

/**
 * Check boundary status:
 * - SAFE: inside polygon
 * - BUFFER: outside polygon, but within bufferMeters (tolerance zone)
 * - OUTSIDE: outside polygon and outside buffer zone -> starts 10s countdown!
 */
export function checkBoundaryStatus(
  location: GPSLocation,
  boundary: BoundaryPolygon
): {
  status: 'SAFE' | 'BUFFER' | 'OUTSIDE';
  distanceToBoundaryMeters: number;
} {
  const point: [number, number] = [location.lat, location.lng];
  const isInside = isPointInPolygon(point, boundary.coordinates);
  const distanceToEdge = distanceToPolygonMeters(point, boundary.coordinates);

  if (isInside) {
    return { status: 'SAFE', distanceToBoundaryMeters: distanceToEdge };
  }

  // Outside polygon: check buffer tolerance
  if (distanceToEdge <= boundary.bufferMeters) {
    return { status: 'BUFFER', distanceToBoundaryMeters: distanceToEdge };
  }

  return { status: 'OUTSIDE', distanceToBoundaryMeters: distanceToEdge };
}

/**
 * Calculate completed Bingo lines for a 5x5 board (challenge IDs 1 to 25)
 */
export function calculateBingoLines(approvedChallengeIds: Set<number>): {
  linesCount: number;
  hasFullCard: boolean;
  completedLines: string[];
} {
  const size = 5;
  const completedLines: string[] = [];

  // Rows
  for (let r = 0; r < size; r++) {
    let rowComplete = true;
    for (let c = 0; c < size; c++) {
      const id = r * size + c + 1;
      if (!approvedChallengeIds.has(id)) {
        rowComplete = false;
        break;
      }
    }
    if (rowComplete) {
      completedLines.push(`Row ${r + 1}`);
    }
  }

  // Columns
  for (let c = 0; c < size; c++) {
    let colComplete = true;
    for (let r = 0; r < size; r++) {
      const id = r * size + c + 1;
      if (!approvedChallengeIds.has(id)) {
        colComplete = false;
        break;
      }
    }
    if (colComplete) {
      completedLines.push(`Column ${c + 1}`);
    }
  }

  // Diagonal 1 (top-left to bottom-right)
  let diag1 = true;
  for (let i = 0; i < size; i++) {
    const id = i * size + i + 1;
    if (!approvedChallengeIds.has(id)) {
      diag1 = false;
      break;
    }
  }
  if (diag1) completedLines.push('Diagonal ↘');

  // Diagonal 2 (top-right to bottom-left)
  let diag2 = true;
  for (let i = 0; i < size; i++) {
    const id = i * size + (size - 1 - i) + 1;
    if (!approvedChallengeIds.has(id)) {
      diag2 = false;
      break;
    }
  }
  if (diag2) completedLines.push('Diagonal ↙');

  const hasFullCard = approvedChallengeIds.size === 25;

  return {
    linesCount: completedLines.length,
    hasFullCard,
    completedLines,
  };
}

/**
 * Format remaining seconds into HH:MM:SS
 */
export function formatTimeRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
