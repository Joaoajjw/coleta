exports.handler = async (event) => {
    console.log('📊 Admin: Buscando dados...');

    try {
        // ===== TENTA LER DO BLOB STORE =====
        let dados = [];
        let fonte = 'blob';

        try {
            const { getStore } = require('@netlify/blobs');
            const store = getStore('coletas');
            
            // Lista todas as chaves
            const list = await store.list();
            console.log(`📂 Blob Store: ${list.blobs.length} registros encontrados`);

            // Busca cada registro
            for (const blob of list.blobs) {
                try {
                    const dadosRaw = await store.get(blob.key);
                    if (dadosRaw) {
                        const conteudo = JSON.parse(dadosRaw);
                        dados.push({
                            arquivo: blob.key,
                            data: conteudo.timestamp || new Date().toISOString(),
                            conteudo: conteudo
                        });
                    }
                } catch (e) {
                    console.error('❌ Erro ao ler blob:', blob.key, e.message);
                }
            }

        } catch (blobError) {
            console.log('⚠️ Blob Store indisponível, usando fallback:', blobError.message);
            fonte = 'fallback';
            
            // ===== FALLBACK: LÊ DO /TMP =====
            const fs = require('fs');
            const path = require('path');
            const dir = '/tmp/uploads';
            
            if (fs.existsSync(dir)) {
                const arquivos = fs.readdirSync(dir)
                    .filter(f => f.startsWith('dados_') && f.endsWith('.json'))
                    .map(f => {
                        const caminho = path.join(dir, f);
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
                    .filter(item => item !== null);
                
                dados = arquivos;
                console.log(`📂 Fallback: ${dados.length} registros encontrados em /tmp`);
            }
        }

        // Ordena por data (mais recente primeiro)
        dados.sort((a, b) => b.data.localeCompare(a.data));

        console.log(`✅ Retornando ${dados.length} registros (fonte: ${fonte})`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                total: dados.length,
                arquivos: dados,
                fonte: fonte
            })
        };

    } catch (error) {
        console.error('💥 ERRO no admin:', error);
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
