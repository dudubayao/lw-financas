const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Criar diretório de logs se não existir
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Configuração de formato personalizado
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(info => {
        const { timestamp, level, message, stack, ...rest } = info;
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        // Adicionar detalhes extras se houver
        if (Object.keys(rest).length > 0) {
            log += ` ${JSON.stringify(rest)}`;
        }
        
        // Adicionar stack trace para erros
        if (stack) {
            log += `\n${stack}`;
        }
        
        return log;
    })
);

// Nível de log baseado no ambiente
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Definir configurações para diferentes ambientes
const options = {
    file: {
        level,
        filename: path.join(logDir, 'app.log'),
        handleExceptions: true,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: customFormat
    },
    errorFile: {
        level: 'error',
        filename: path.join(logDir, 'error.log'),
        handleExceptions: true,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: customFormat
    },
    console: {
        level,
        handleExceptions: true,
        format: winston.format.combine(
            winston.format.colorize(),
            customFormat
        )
    }
};

// Criar a instância do logger
const logger = winston.createLogger({
    transports: [
        new winston.transports.File(options.file),
        new winston.transports.File(options.errorFile)
    ],
    exitOnError: false // Não encerrar no caso de erro tratado
});

// Adicionar transporte de console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console(options.console));
}

// Criar stream para o Morgan (middleware de log HTTP)
logger.stream = {
    write: function(message) {
        logger.info(message.trim());
    }
};

// Função de log de requisições HTTP
logger.logRequest = (req, res, next) => {
    const startHrTime = process.hrtime();
    
    // Função para calcular o tempo de resposta
    const logResponseTime = () => {
        const elapsedHrTime = process.hrtime(startHrTime);
        const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1000000;
        
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedTimeInMs.toFixed(3)}ms`);
    };
    
    res.on('finish', logResponseTime);
    next();
};

module.exports = logger;