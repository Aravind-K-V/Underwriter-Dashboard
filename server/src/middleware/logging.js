import { logger, prettyLog } from '../config/logger.js';

export const setupLogging = () => {
  console.log = (...args) => {
    if (args.length === 1) {
      logger.info(args[0]);
    } else {
      const [message, ...rest] = args;
      if (rest.length === 1 && (typeof rest[0] === 'object' || Array.isArray(rest[0]))) {
        prettyLog(message, rest[0]);
      } else {
        logger.info(args.join(' '));
      }
    }
  };
  console.info = (...args) => logger.info(args.join(' '));
  console.warn = (...args) => logger.warn(args.join(' '));
  console.error = (...args) => logger.error(args.join(' '));
  
  console.info('[Middleware][Logging] Console logging middleware configured successfully');
};