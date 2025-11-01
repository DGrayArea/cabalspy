/**
 * Production logging utility
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  info(message: string, context?: LogContext): void {
    if (this.isDevelopment || !this.isProduction) {
      console.log(this.formatMessage('info', message, context));
    }
    // In production, you might want to send to external logging service
    // e.g., Sentry, LogRocket, Datadog, etc.
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
    // Could send warnings to monitoring service
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    };
    
    console.error(this.formatMessage('error', message, errorContext));
    
    // In production, send to error tracking service (e.g., Sentry)
    if (this.isProduction && error instanceof Error) {
      // Example: Sentry.captureException(error, { extra: context });
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }
}

export const logger = new Logger();

