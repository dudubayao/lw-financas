const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

/**
 * Configuração de segurança para o Express
 * Aplica várias camadas de proteção contra ataques comuns
 * 
 * @param {Object} app - Instância do Express
 */
const configureSecurity = (app) => {
    // Helmet - Configura cabeçalhos HTTP para segurança
    app.use(helmet({
        contentSecurityPolicy: process.env.NODE_ENV === 'production', // Ativar em produção
        crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production', // Ativar em produção
    }));
    
    // CORS - Configurar origens permitidas
    app.use(cors({
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
        maxAge: 86400 // 24 horas em segundos
    }));
    
    // XSS Protection - Limpa dados de entrada para prevenir ataques XSS
    if (process.env.ENABLE_XSS_PROTECTION !== 'false') {
        app.use(xss());
    }
    
    // Rate Limiting - Limita número de requisições por IP
    const limiter = rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 requisições por janela
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message: 'Muitas requisições, tente novamente mais tarde'
        }
    });
    
    // Aplicar rate limiting globalmente
    app.use('/api/', limiter);
    
    // MongoDB Sanitize - Previne injeção em queries MongoDB
    app.use(mongoSanitize());
    
    // HPP (HTTP Parameter Pollution) - Previne poluição de parâmetros
    app.use(hpp());
    
    // Remover informações sensíveis do cabeçalho
    app.disable('x-powered-by');
};

module.exports = configureSecurity;