import React, { createContext, useContext, useState, useCallback } from "react";

type ProgressType = 'upload' | 'classification' | 'dependency' | 'conversion' | 'validation' | 'execution' | 'done';

interface ProgressEvent {
    type: ProgressType;
    category: string;
    status: string;
    message?: string;
    timestamp: number;
    data?: any;
}

interface LogContextType {
    events: ProgressEvent[];
    addEvent: (event: ProgressEvent) => void;
    clearLogs: () => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export function LogProvider({ children }: { children: React.ReactNode }) {
    const [events, setEvents] = useState<ProgressEvent[]>([]);

    const addEvent = useCallback((event: ProgressEvent) => {
        setEvents((prev) => [...prev, event]);
    }, []);

    const clearLogs = useCallback(() => {
        setEvents([]);
    }, []);

    return (
        <LogContext.Provider value={{ events, addEvent, clearLogs }}>
            {children}
        </LogContext.Provider>
    );
}

export function useLog() {
    const context = useContext(LogContext);
    if (!context) {
        throw new Error("useLog must be used within a LogProvider");
    }
    return context;
}
