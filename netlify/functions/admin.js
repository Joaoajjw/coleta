const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'coletas';

exports.handler = async (event) => {
    console.log('📊 ADMIN: Buscando dados...');

    try {
        // ===== BUSCA DO BLOB STORE =====
        const store = getStore(STORE_NAME);
        
        // Lista todas as chaves
        const list = await store.list();
        console.log(`📂 Encontrados ${list.blobs.length} registros`);

        if (list.blobs.length === 0) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ total: 0, arquivos: [] })
            };
        }

        // Busca cada registro
        const arquivos = [];
        for (const blob of list.blobs) {
            try {
                const dadosRaw = await store.get(blob.key);
                const dados = JSON.parse(dadosRaw);
                arquivos.push({
                    arquivo: blob.key,
                    data: dados.timestamp || new Date().toISOString(),
                    conteudo: dados
                });
            } catch (e) {
                console.error('❌ Erro ao ler:', blob.key, e.message);
            }
        }

        // Ordena por data (mais recente primeiro)
        arquivos.sort((a, b) => b.data.localeCompare(a.data));

        console.log(`✅ Retornando ${arquivos.length} registros`);

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
        console.error('💥 ERRO no admin:', error);
        
        // Fallback: tenta ler do /tmp se o Blob falhar
        try {
            const fs = require('fs');
            const path = require('path');
            const UPLOAD_DIR = '/tmp/uploads';
            
            if (fs.existsSync(UPLOAD_DIR)) {
                const arquivos = fs.readdirSync(UPLOAD_DIR)
                    .filter(f => f.startsWith('dados_') && f.endsWith('.json'))
                    .map(f => {
                        const conteudo = JSON.parse(fs.readFileSync(path.join(UPLOAD_DIR, f), 'utf8'));
                        return {
                            arquivo: f,
                            data: conteudo.timestamp || new Date().toISOString(),
                            conteudo: conteudo
                        };
                    })
                    .sort((a, b) => b.data.localeCompare(a.data));
                
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        total: arquivos.length,
                        arquivos: arquivos,
                        fonte: 'fallback'
                    })
                };
            }
        } catch (fallbackErr) {
            console.error('❌ Fallback também falhou:', fallbackErr);
        }

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                erro: error.message,
                detalhe: 'Erro ao acessar o armazenamento'
            })
        };
    }
};
