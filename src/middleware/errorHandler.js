/**
 * Middleware para tratamento global de erros
 * Captura todos os erros não tratados nas rotas e controllers
 * Formata respostas de erro de forma padronizada
 */

// Importar logger quando configurado
// const logger = require('../config/logger');

// Tratamento de erros em ambiente de desenvolvimento
const developmentErrors = (err, req, res) => {
    const status = err.statusCode || 500;
    
    // Log detalhado para desenvolvimento
    console.error('\x1b[31m%s\x1b[0m', '[ERROR]', err);
    
    return res.status(status).json({
        success: false,
        error: {
            message: err.message,
            status,
            stack: err.stack
        }
    });
};

// Tratamento de erros em ambiente de produção
const productionErrors = (err, req, res) => {
    // Log de erro em produção
    // logger.error({
    //     message: err.message,
    //     status: err.statusCode || 500,
    //     stack: err.stack,
    //     path: req.path,
    //     method: req.method,
    //     ip: req.ip
    // });
    
    // Erro operacional: enviar mensagem para o cliente
    if (err.isOperational) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message
        });
    }
    
    // Erro de programação: não enviar detalhes ao cliente
    return res.status(500).json({
        success: false,
        message: 'Algo deu errado.'
    });
};

// Middleware para tratar erros de validação do Mongoose
const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map(val => val.message);
    
    const error = new Error(`Erro de validação: ${errors.join(', ')}`);
    error.statusCode = 400;
    error.isOperational = true;
    
    return error;
};

// Middleware para tratar erros de ID duplicado (MongoDB)
const handleDuplicateFieldsError = (err) => {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    const error = new Error(`Valor duplicado para o campo '${field}': ${value}. Por favor, use outro valor.`);
    error.statusCode = 400;
    error.isOperational = true;
    
    return error;
};

// Middleware para tratar erros de ID inválido
const handleCastError = (err) => {
    const error = new Error(`ID inválido: ${err.value}`);
    error.statusCode = 400;
    error.isOperational = true;
    
    return error;
};

// Middleware para erros de JWT
const handleJWTError = () => {
    const error = new Error('Token inválido. Por favor, faça login novamente.');
    error.statusCode = 401;
    error.isOperational = true;
    
    return error;
};

// Middleware para tokens JWT expirados
const handleJWTExpiredError = () => {
    const error = new Error('Seu token expirou. Por favor, faça login novamente.');
    error.statusCode = 401;
    error.isOperational = true;
    
    return error;
};

// Middleware principal de tratamento de erros
module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    
    // Tratar erros específicos
    let error = { ...err };
    error.message = err.message;
    
    // Erro de validação do Mongoose
    if (err.name === 'ValidationError') {
        error = handleValidationError(err);
    }
    
    // Erro de ID inválido
    if (err.name === 'CastError') {
        error = handleCastError(err);
    }
    
    // Erro de campo duplicado
    if (err.code === 11000) {
        error = handleDuplicateFieldsError(err);
    }
    
    // Erros de JWT
    if (err.name === 'JsonWebTokenError') {
        error = handleJWTError();
    }
    
    if (err.name === 'TokenExpiredError') {
        error = handleJWTExpiredError();
    }
    
    // Responder com base no ambiente
    if (process.env.NODE_ENV === 'development') {
        return developmentErrors(error, req, res);
    }
    
    return productionErrors(error, req, res);
};