import { io } from "socket.io-client";

// Message categories
export const SocketMessageCategory = {
  INFO: "INFO",
  WARN: "WARN",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
} as const;

export type SocketMessageCategory = typeof SocketMessageCategory[keyof typeof SocketMessageCategory];

export interface SocketMessage {
  type: string;
  category?: SocketMessageCategory;
  status?: string;
  message: string;
  timestamp: number;
  data?: any;
}

export const socket = io("http://localhost:3000", {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling']
});

// Store progress listeners and pending events
const progressListeners: Set<(data: any) => void> = new Set();
let pendingEvents: any[] = [];
let pendingEventsSent = false;

// Register progress listener at socket level (outside React)
socket.on('progress', (data: SocketMessage) => {
  
  // Store event in queue
  pendingEvents.push(data);
  
  // Dispatch to all listeners
  progressListeners.forEach(listener => {
    try {
      listener(data);
    } catch (err) {
      console.error('❌ Error in progress listener:', err);
    }
  });
});

// Export functions to add/remove listeners
export function addProgressListener(listener: (data: any) => void) {
  progressListeners.add(listener);
}

export function removeProgressListener(listener: (data: any) => void) {
  progressListeners.delete(listener);
}

// Filter listeners by category
export function addCategoryListener(category: SocketMessageCategory, listener: (data: SocketMessage) => void) {
  const categoryListener = (data: SocketMessage) => {
    if (data.category === category) {
      listener(data);
    }
  };
  progressListeners.add(categoryListener);
  return categoryListener;
}

export function removeCategoryListener(listener: (data: any) => void) {
  progressListeners.delete(listener);
}

export function getPendingEvents() {
  const events = [...pendingEvents];
  
  // Clear pending events after they're delivered once
  if (!pendingEventsSent) {
    pendingEventsSent = true;
    pendingEvents = [];
  }
  
  return events;
}

// Convenience methods for filtering events by category
export function getPendingEventsByCategory(category: SocketMessageCategory) {
  return getPendingEvents().filter(event => event.category === category);
}

export function clearPendingEvents() {
  pendingEvents = [];
  pendingEventsSent = false;
}