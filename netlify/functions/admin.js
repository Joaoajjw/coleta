const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = '/tmp/uploads';

exports.handler = async (event) => {
    console.log('📊 ADMIN: Buscando dados...');

    try {
        // Verifica se a pasta existe
        if (!fs.existsSync(UPLOAD_DIR)) {
            console.log('⚠️ Pasta /tmp/uploads não existe');
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ total: 0, arquivos: [] })
            };
        }

        // Lista todos os arquivos
        const todosArquivos = fs.readdirSync(UPLOAD_DIR);
        console.log('📂 Arquivos encontrados:', todosArquivos);

        // Filtra apenas JSONs de dados
        const arquivosJson = todosArquivos
            .filter(f => f.startsWith('dados_') && f.endsWith('.json'))
            .map(f => {
                const caminho = path.join(UPLOAD_DIR, f);
                try {
                    const conteudo = fs.readFileSync(caminho, 'utf8');
                    const dados = JSON.parse(conteudo);
                    return {
                        arquivo: f,
                        data: dados.timestamp || new Date().toISOString(),
                        conteudo: dados
                    };
                } catch (e) {
                    console.error('❌ Erro ao ler:', f, e.message);
                    return null;
                }
            })
            .filter(item => item !== null)
            .sort((a, b) => b.data.localeCompare(a.data));

        console.log(`✅ Encontrados ${arquivosJson.length} registros`);

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
        console.error('💥 ERRO:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ erro: error.message })
        };
    }
};
