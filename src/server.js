const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Carregar variáveis de ambiente
dotenv.config();

// Importar rotas
const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const usersRoutes = require('./src/routes/users');
const ordersRoutes = require('./src/routes/orders');
const listsRoutes = require('./src/routes/lists');

// Inicializar app Express
const app = express();

// Configuração do servidor
const PORT = process.env.PORT || 3000;
const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lw_financas';
const JWT_SECRET = process.env.JWT_SECRET || 'seu_jwt_secret';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware de segurança
app.use(helmet({
    contentSecurityPolicy: false, // Desativado para desenvolvimento, ativar em produção
}));

// Configuração de CORS
app.use(cors({
    origin: NODE_ENV === 'production' ? 'https://seu-dominio.com.br' : 'http://localhost:3000',
    credentials: true
}));

// Middleware de parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging
if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Configuração de sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'sua_session_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: DB_URI,
        ttl: 14 * 24 * 60 * 60, // 14 dias
        autoRemove: 'native'
    }),
    cookie: {
        secure: NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14 dias
    }
}));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Conectar ao MongoDB
mongoose.connect(DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err);
    process.exit(1);
});

// Configuração global do Mongoose
mongoose.set('toJSON', {
    virtuals: true,
    transform: (doc, converted) => {
        delete converted._id;
        delete converted.__v;
    }
});

// Middleware para verificação de autenticação
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Token inválido ou expirado' });
            }
            
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ message: 'Token de autenticação não fornecido' });
    }
};

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', authenticateJWT, dashboardRoutes);
app.use('/api/users', authenticateJWT, usersRoutes);
app.use('/api/orders', authenticateJWT, ordersRoutes);
app.use('/api/lists', authenticateJWT, listsRoutes);

// Rota para verificar o status da API
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', environment: NODE_ENV });
});

// Roteamento para o frontend (SPA)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/console/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'console', 'index.html'));
});

app.get('/login*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login', 'index.html'));
});

// Middleware para tratamento de erro 404
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    res.status(500).json({
        error: NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message,
        stack: NODE_ENV === 'production' ? undefined : err.stack
    });
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} em modo ${NODE_ENV}`);
});

module.exports = app;