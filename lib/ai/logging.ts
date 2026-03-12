/**
 * AI Service Logging
 * Centralized logging for AI operations with structured format
 */

import { AIError } from './errors';

interface AILogEntry {
  timestamp: string;
  requestId?: string;
  orgId?: string;
  operation: string;
  provider: string;
  model?: string;
  status: 'success' | 'error';
  duration?: number;
  inputTokens?: number;
  outputTokens?: number;
  costEstimate?: number;
  retries?: number;
  error?: {
    code: string;
    message: string;
    details?: any;
    userMessage: string;
  };
}

class AILogger {
  private logs: AILogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  /**
   * Log a successful AI operation
   */
  logSuccess(entry: Omit<AILogEntry, 'status' | 'error'>): void {
    const logEntry: AILogEntry = {
      ...entry,
      status: 'success',
      timestamp: new Date().toISOString(),
    };
    
    this.addLog(logEntry);
    this.consoleLog(logEntry);
  }

  /**
   * Log an AI operation error
   */
  logError(entry: Omit<AILogEntry, 'status' | 'error'>, error: AIError): void {
    const logEntry: AILogEntry = {
      ...entry,
      status: 'error',
      timestamp: new Date().toISOString(),
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        userMessage: error.userMessage,
      },
    };
    
    this.addLog(logEntry);
    this.consoleLog(logEntry);
  }

  /**
   * Log operation start
   */
  logStart(operation: string, provider: string, requestId?: string, orgId?: string): void {
    const logEntry: AILogEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      orgId,
      operation,
      provider,
      status: 'success', // Start is logged as success for tracking
    };
    
    this.addLog(logEntry);
    console.log(`🤖 AI Operation Started: ${operation}`, {
      provider,
      requestId,
      orgId,
    });
  }

  /**
   * Get recent logs
   */
  getLogs(limit?: number): AILogEntry[] {
    return limit ? this.logs.slice(-limit) : [...this.logs];
  }

  /**
   * Get logs by request ID
   */
  getLogsByRequestId(requestId: string): AILogEntry[] {
    return this.logs.filter(log => log.requestId === requestId);
  }

  /**
   * Get logs by organization
   */
  getLogsByOrgId(orgId: string, limit?: number): AILogEntry[] {
    const orgLogs = this.logs.filter(log => log.orgId === orgId);
    return limit ? orgLogs.slice(-limit) : orgLogs;
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get error summary
   */
  getErrorSummary(timeframeMinutes: number = 60): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    errorsByProvider: Record<string, number>;
  } {
    const cutoff = new Date(Date.now() - timeframeMinutes * 60 * 1000);
    const recentLogs = this.logs.filter(log => 
      new Date(log.timestamp) > cutoff && log.status === 'error'
    );

    const errorsByCode: Record<string, number> = {};
    const errorsByProvider: Record<string, number> = {};

    recentLogs.forEach(log => {
      if (log.error) {
        errorsByCode[log.error.code] = (errorsByCode[log.error.code] || 0) + 1;
        errorsByProvider[log.provider] = (errorsByProvider[log.provider] || 0) + 1;
      }
    });

    return {
      totalErrors: recentLogs.length,
      errorsByCode,
      errorsByProvider,
    };
  }

  private addLog(logEntry: AILogEntry): void {
    this.logs.push(logEntry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private consoleLog(logEntry: AILogEntry): void {
    const emoji = logEntry.status === 'success' ? '✅' : '❌';
    const message = `${emoji} AI Operation: ${logEntry.operation}`;
    
    const logData = {
      provider: logEntry.provider,
      model: logEntry.model,
      requestId: logEntry.requestId,
      orgId: logEntry.orgId,
      duration: logEntry.duration,
      inputTokens: logEntry.inputTokens,
      outputTokens: logEntry.outputTokens,
      costEstimate: logEntry.costEstimate,
      retries: logEntry.retries,
    };

    if (logEntry.status === 'error' && logEntry.error) {
      console.error(message, {
        ...logData,
        error: {
          code: logEntry.error.code,
          message: logEntry.error.message,
          userMessage: logEntry.error.userMessage,
        },
      });
    } else {
      console.log(message, logData);
    }
  }
}

// Export singleton instance
export const aiLogger = new AILogger();

// Export types
export type { AILogEntry };
