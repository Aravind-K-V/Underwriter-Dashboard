import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';

// Create timestamped log folder for this server session
const sessionTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logsDir = path.join(process.cwd(), 'logs');
const sessionLogsDir = path.join(logsDir, `session-${sessionTimestamp}`);

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
  console.log('📁 Created logs directory');
}
if (!fs.existsSync(sessionLogsDir)) {
  fs.mkdirSync(sessionLogsDir);
  console.log(`📁 Created session logs directory: ${sessionLogsDir}`);
}

// Archive existing top-level log files to session folder
const logFiles = [
  'error.log',
  'warn.log',
  'info.log',
  'audit.log',
  'debug.log',
  'trace.log',
  'combined.log',
];
logFiles.forEach((file) => {
  const current = path.join(logsDir, file);
  const archive = path.join(sessionLogsDir, `${file.replace('.log', '')}-initial-${sessionTimestamp}.log`);
  try {
    if (fs.existsSync(current)) {
      fs.renameSync(current, archive);
      console.log(`📦 Archived log file: ${current} → ${archive}`);
    }
  } catch (error) {
    console.warn(`⚠️ Failed to archive log file ${current}: ${error.message}`);
  }
});

// Custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    audit: 3,
    debug: 4,
    trace: 5,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    audit: 'cyan',
    debug: 'blue',
    trace: 'grey',
  },
  emojis: {
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
    audit: '🔍',
    debug: '🐞',
    trace: '🔎',
  },
};

// Custom format for file logs
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.metadata(),
  format.printf(({ timestamp, level, message, metadata, stack }) => {
    let formattedMessage = message;
    try {
      if (typeof message === 'object') {
        formattedMessage = JSON.stringify(message, null, 2);
      } else if (message.includes('{') || message.includes('[')) {
        const parts = message.split(/(\{.*\}|\[.*\])/);
        formattedMessage = parts
          .map((part) => {
            if ((part.startsWith('{') && part.endsWith('}')) || (part.startsWith('[') && part.endsWith(']'))) {
              try {
                const parsed = JSON.parse(part);
                return '\n' + JSON.stringify(parsed, null, 2);
              } catch {
                return part;
              }
            }
            return part;
          })
          .join('');
      }
    } catch (error) {
      formattedMessage = message;
    }
    const metaString = Object.keys(metadata).length ? `\n${JSON.stringify(metadata, null, 2)}` : '';
    const stackString = stack && level === 'error' ? `\nStack: ${stack}` : '';
    return `${timestamp} [${level.toUpperCase()}]: ${formattedMessage}${metaString}${stackString}`;
  })
);

// Enhanced console format for readability
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'HH:mm:ss' }), // Shorter time for terminal
  format.printf(({ timestamp, level, message, metadata }) => {
    const emoji = customLevels.emojis[level] || '➡️';
    const metaString = Object.keys(metadata).length ? ` ${JSON.stringify(metadata, null, 0).replace(/[{}\"]/g, '')}` : '';
    const formattedMessage = typeof message === 'object' ? JSON.stringify(message, null, 0).replace(/[{}\"]/g, '') : message;
    return `${emoji} ${timestamp} ${level.toUpperCase().padEnd(6)} | ${formattedMessage}${metaString}`;
  })
);

const logger = createLogger({
  levels: customLevels.levels,
  level: isProduction ? 'info' : 'trace',
  format: logFormat,
  transports: [
    // Separate log files for each level in session folder
    new DailyRotateFile({
      filename: path.join(sessionLogsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename: path.join(sessionLogsDir, 'warn-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename: path.join(sessionLogsDir, 'info-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename: path.join(sessionLogsDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'audit',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename: path.join(sessionLogsDir, 'debug-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'debug',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename: path.join(sessionLogsDir, 'trace-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'trace',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    // Combined log for all levels
    new DailyRotateFile({
      filename: path.join(sessionLogsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'trace',
      maxSize: '50m',
      maxFiles: '30d',
      zippedArchive: true,
    }),
    // Console transport
    new transports.Console({
      level: isProduction ? 'info' : 'trace',
      format: consoleFormat,
    }),
  ],
});

// Apply custom colors
format.colorize().addColors(customLevels.colors);

// Enhanced prettyLog function
const prettyLog = (message, data = null, options = {}) => {
  const { level = 'info', metadata = {} } = options;
  if (!customLevels.levels[level]) {
    logger.warn(`Invalid log level: ${level}, defaulting to info`, { message, data });
    return logger.info(message, { data, ...metadata });
  }
  if (data !== null) {
    if (Array.isArray(data) || (typeof data === 'object' && data !== null)) {
      logger.log(level, message, { data, ...metadata });
    } else {
      logger.log(level, `${message}: ${data}`, metadata);
    }
  } else {
    logger.log(level, message, metadata);
  }
};

export { logger, prettyLog };