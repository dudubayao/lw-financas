const rateLimit = require('express-rate-limit');

/**
 * Cria um middleware de limitação de taxa (rate limiter)
 * Limita o número de requisições por IP em um determinado período
 * 
 * @param {Object} options - Opções de configuração
 * @returns {Function} Middleware de limitação de taxa
 */
const rateLimiter = (options = {}) => {
    const defaultOptions = {
        windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutos
        max: process.env.RATE_LIMIT_MAX || 100, // 100 requisições por windowMs
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message: 'Muitas requisições. Tente novamente mais tarde.'
        }
    };
    
    // Mesclar opções padrão com opções personalizadas
    const limitOptions = { ...defaultOptions, ...options };
    
    return rateLimit(limitOptions);
};

/**
 * Configurações prefinidas para diferentes tipos de limitações
 */
rateLimiter.auth = () => rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // 10 tentativas
    message: { 
        success: false, 
        message: 'Muitas tentativas de autenticação. Tente novamente mais tarde.' 
    }
});

rateLimiter.api = () => rateLimiter({
    windowMs: 60 * 1000, // 1 minuto
    max: 60, // 60 requisições por minuto
    message: { 
        success: false, 
        message: 'Você excedeu o limite de requisições. Tente novamente mais tarde.' 
    }
});

module.exports = rateLimiter;