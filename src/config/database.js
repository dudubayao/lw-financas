const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Configurações do MongoDB
const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lw_financas';
const DB_OPTIONS = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 10000, // 10 segundos
    socketTimeoutMS: 45000,  // 45 segundos
};

// Função para conectar ao banco de dados
const connectDB = async () => {
    try {
        await mongoose.connect(DB_URI, DB_OPTIONS);
        console.log('Conexão com MongoDB estabelecida com sucesso');
        
        // Eventos de conexão
        mongoose.connection.on('error', err => {
            console.error('Erro na conexão MongoDB:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB desconectado. Tentando reconectar...');
            setTimeout(connectDB, 5000); // Tentar reconectar após 5 segundos
        });
        
        // Tratamento para encerramento do processo
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('Conexão MongoDB encerrada');
            process.exit(0);
        });
        
        return mongoose.connection;
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error);
        process.exit(1);
    }
};

// Configurações globais do Mongoose
const configureMongoose = () => {
    // Configurar transformação de documentos
    mongoose.set('toJSON', {
        virtuals: true,
        transform: (doc, converted) => {
            delete converted._id;
            delete converted.__v;
        }
    });
    
    // Usar o Promise global
    mongoose.Promise = global.Promise;
    
    // Log de depuração (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
        mongoose.set('debug', true);
    }
};

module.exports = {
    connectDB,
    configureMongoose,
    getConnection: () => mongoose.connection
};