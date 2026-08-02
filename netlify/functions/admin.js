const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = '/tmp/uploads';

exports.handler = async (event) => {
    // ===== CONFIGURAÇÃO DE SEGURANÇA =====
    // Opcional: adicione um token de autenticação
    // const AUTH_TOKEN = process.env.ADMIN_TOKEN;
    // if (event.headers.authorization !== `Bearer ${AUTH_TOKEN}`) {
    //     return { statusCode: 401, body: JSON.stringify({ erro: 'Não autorizado' }) };
    // }

    try {
        if (!fs.existsSync(UPLOAD_DIR)) {
            return {
                statusCode: 200,
                body: JSON.stringify({ total: 0, arquivos: [] })
            };
        }

        // Lista todos os arquivos JSON
        const arquivos = fs.readdirSync(UPLOAD_DIR)
            .filter(f => f.endsWith('.json') && f.startsWith('dados_'))
            .map(f => {
                const stats = fs.statSync(path.join(UPLOAD_DIR, f));
                try {
                    const conteudo = JSON.parse(fs.readFileSync(path.join(UPLOAD_DIR, f), 'utf8'));
                    return {
                        arquivo: f,
                        tamanho: stats.size,
                        data: stats.mtime,
                        conteudo: conteudo
                    };
                } catch (e) {
                    return {
                        arquivo: f,
                        tamanho: stats.size,
                        data: stats.mtime,
                        conteudo: { erro: 'Erro ao ler arquivo' }
                    };
                }
            })
            .sort((a, b) => new Date(b.data) - new Date(a.data));

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                total: arquivos.length,
                arquivos: arquivos
            })
        };

    } catch (error) {
        console.error('Erro no admin:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                erro: error.message
            })
        };
    }
};
