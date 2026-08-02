const fs = require('fs');
const path = require('path');

// ===== MESMA PASTA QUE O COLETAR USA =====
const UPLOAD_DIR = '/tmp/uploads';

exports.handler = async (event) => {
    console.log('📊 Admin: Iniciando busca de dados...');
    console.log('📁 Pasta:', UPLOAD_DIR);

    try {
        // Verifica se a pasta existe
        if (!fs.existsSync(UPLOAD_DIR)) {
            console.log('⚠️ Pasta /tmp/uploads não existe ainda');
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    total: 0, 
                    arquivos: [],
                    mensagem: 'Nenhuma coleta ainda' 
                })
            };
        }

        // Lista o conteúdo da pasta
        const todosArquivos = fs.readdirSync(UPLOAD_DIR);
        console.log('📂 Arquivos em /tmp/uploads:', todosArquivos);

        // Filtra apenas os JSONs de dados
        const arquivosJson = todosArquivos
            .filter(f => f.endsWith('.json') && f.startsWith('dados_'))
            .map(f => {
                const caminho = path.join(UPLOAD_DIR, f);
                const stats = fs.statSync(caminho);
                try {
                    const conteudo = JSON.parse(fs.readFileSync(caminho, 'utf8'));
                    return {
                        arquivo: f,
                        tamanho: stats.size,
                        data: stats.mtime,
                        conteudo: conteudo
                    };
                } catch (e) {
                    console.error('❌ Erro ao ler arquivo:', f, e.message);
                    return {
                        arquivo: f,
                        tamanho: stats.size,
                        data: stats.mtime,
                        conteudo: { erro: 'Erro ao ler arquivo' }
                    };
                }
            })
            .sort((a, b) => new Date(b.data) - new Date(a.data));

        console.log(`✅ Encontrados ${arquivosJson.length} arquivos de dados`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                total: arquivosJson.length,
                arquivos: arquivosJson
            })
        };

    } catch (error) {
        console.error('💥 Erro no admin:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                erro: error.message,
                stack: error.stack
            })
        };
    }
};
