import { SocketMessageCategory } from "../socket.js";


const categoryEmoji = {
    [SocketMessageCategory.INFO]: 'ℹ️',
    [SocketMessageCategory.WARN]: '⚠️',
    [SocketMessageCategory.SUCCESS]: '✅',
    [SocketMessageCategory.ERROR]: '❌',
};

export function emitProgress(type, status, category = SocketMessageCategory.INFO, data = {}) {
    if (!global.io) {
        console.warn("⚠️  Socket.io not initialized");
        return;
    }
    
    const emoji = categoryEmoji[category] || '📨';
    const progressEvent = {
        type,
        category,
        status,
        message: data.message || status,
        timestamp: Date.now(),
        ...data
    };
    global.io.sockets.emit('progress', progressEvent);
}