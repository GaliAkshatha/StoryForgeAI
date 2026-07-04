import { LogLevel } from "./LogLevel";

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    agent?: string;
}