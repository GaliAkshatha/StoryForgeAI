import { LogEntry } from "./LogEntry";
import { LogLevel } from "./LogLevel";

export class Logger {

    private logs: LogEntry[] = [];

    info(message: string, agent?: string): void {
        this.addLog(LogLevel.INFO, message, agent);
    }

    warn(message: string, agent?: string): void {
        this.addLog(LogLevel.WARN, message, agent);
    }

    error(message: string, agent?: string): void {
        this.addLog(LogLevel.ERROR, message, agent);
    }

    private addLog(
        level: LogLevel,
        message: string,
        agent?: string
    ): void {

        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            message,
            agent
        };

        this.logs.push(entry);

        console.log(
            `[${entry.timestamp.toISOString()}] [${level}] ${agent ?? "System"} - ${message}`
        );
    }

    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    clear(): void {
        this.logs = [];
    }
}