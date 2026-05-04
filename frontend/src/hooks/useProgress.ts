import { useEffect, useState } from "react";
import { addProgressListener, removeProgressListener, getPendingEvents } from "../services/socket";
import { useLog } from "../context/LogContext";

type ProgressType = 'upload' | 'classification' | 'dependency' | 'conversion' | 'validation' | 'execution' | 'done';

interface ProgressEvent {
    type: ProgressType;
    category: string;
    status: string;
    message?: string;
    timestamp: number;
    data?: any;
}

export function useProgress() {
    const { addEvent } = useLog();
    const [progress, setProgress] = useState<Record<ProgressType, ProgressEvent | null>>({
        upload: null,
        classification: null,
        dependency: null,
        conversion: null,
        validation: null,
        execution: null,
        done: null,
    });

    useEffect(() => {
        // Initialize with pending events
        const pending = getPendingEvents();
        
        // Add pending events to log context
        pending.forEach((event: ProgressEvent) => {
            addEvent(event);
        });

        const handler = (data: ProgressEvent) => {
            
            // Add to global log context
            addEvent(data);

            if (data.type) {
                setProgress((prev) => ({
                    ...prev,
                    [data.type]: data
                }));
            }
        };
        
        addProgressListener(handler);
        
        return () => {
            removeProgressListener(handler);
        };
    }, [addEvent]);

    return {
        progress
    }
}