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

socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error);
});

socket.on('disconnect', () => {
  console.log('🔌 Socket disconnected');
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

// Register progress listener at socket level (outside React)
socket.on('progress', (data: SocketMessage) => {
  console.log('📨 [SOCKET.TS] Received progress:', data);
  
  // Log with category emoji
  const categoryEmoji = {
    [SocketMessageCategory.INFO]: 'ℹ️',
    [SocketMessageCategory.WARN]: '⚠️',
    [SocketMessageCategory.SUCCESS]: '✅',
    [SocketMessageCategory.ERROR]: '❌',
  };
  const emoji = categoryEmoji[data.category || SocketMessageCategory.INFO] || '📨';
  console.log(`${emoji} [${data.category || 'INFO'}] ${data.message}`);
  
  // Store event in queue
  pendingEvents.push(data);
  console.log('💾 Queued event, total pending:', pendingEvents.length);
  
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
  console.log('✅ Progress listener added, total listeners:', progressListeners.size);
}

export function removeProgressListener(listener: (data: any) => void) {
  progressListeners.delete(listener);
  console.log('✅ Progress listener removed, total listeners:', progressListeners.size);
}

// Filter listeners by category
export function addCategoryListener(category: SocketMessageCategory, listener: (data: SocketMessage) => void) {
  const categoryListener = (data: SocketMessage) => {
    if (data.category === category) {
      listener(data);
    }
  };
  progressListeners.add(categoryListener);
  console.log(`✅ ${category} listener added`);
  return categoryListener;
}

export function removeCategoryListener(listener: (data: any) => void) {
  progressListeners.delete(listener);
  console.log('✅ Category listener removed');
}

export function getPendingEvents() {
  const events = [...pendingEvents];
  console.log(`📤 Returning ${events.length} pending events`);
  
  // Clear pending events after they're delivered once
  if (!pendingEventsSent) {
    pendingEventsSent = true;
    pendingEvents = [];
    console.log('🧹 Cleared pending events queue');
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
  console.log('🧹 Pending socket events cleared');
}

// Debug: log all events
socket.onAny((event, ...args) => {
  if (event !== 'progress') {
    console.log(`📡 [SOCKET EVENT] ${event}:`, args);
  }
});
