type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  prefix?: string;
  data?: any;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment) {
      return level === 'error';
    }
    return true;
  }

  private formatMessage(message: string, options?: LogOptions): string {
    const prefix = options?.prefix ? `[${options.prefix}]` : '';
    return `${prefix} ${message}`.trim();
  }

  debug(message: string, options?: LogOptions): void {
    if (!this.shouldLog('debug')) return;
    
    const formatted = this.formatMessage(message, options);
    console.debug(formatted, options?.data || '');
  }

  info(message: string, options?: LogOptions): void {
    if (!this.shouldLog('info')) return;
    
    const formatted = this.formatMessage(message, options);
    console.log(formatted, options?.data || '');
  }

  warn(message: string, options?: LogOptions): void {
    if (!this.shouldLog('warn')) return;
    
    const formatted = this.formatMessage(message, options);
    console.warn(formatted, options?.data || '');
  }

  error(message: string, options?: LogOptions): void {
    if (!this.shouldLog('error')) return;

    const formatted = this.formatMessage(message, options);
    console.error(formatted, options?.data || '');
  }

  group(label: string): void {
    if (!this.isDevelopment) return;
    console.group(label);
  }

  groupEnd(): void {
    if (!this.isDevelopment) return;
    console.groupEnd();
  }
}

export const logger = new Logger();

export const createLogger = (prefix: string) => ({
  debug: (message: string, data?: any) => logger.debug(message, { prefix, data }),
  info: (message: string, data?: any) => logger.info(message, { prefix, data }),
  warn: (message: string, data?: any) => logger.warn(message, { prefix, data }),
  error: (message: string, data?: any) => logger.error(message, { prefix, data }),
  group: (label: string) => logger.group(`[${prefix}] ${label}`),
  groupEnd: () => logger.groupEnd(),
});