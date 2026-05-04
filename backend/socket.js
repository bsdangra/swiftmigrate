import http from "http";
import { Server } from "socket.io";

// Message categories
export const SocketMessageCategory = {
  INFO: "INFO",
  WARN: "WARN",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR"
};

export function initSocket(app) {
    const server = http.createServer(app);

    const io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    global.io = io;

    io.on("connection", (socket) => {
        console.log("🔗 Client connected: ", socket.id);
        
        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });
    
    console.log("✅ Connection listener registered");

    return { server, io };
}