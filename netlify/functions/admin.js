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
        console.log('🔥 Firebase admin inicializado!');
    } catch (err) {
        console.error('❌ Erro ao inicializar Firebase admin:', err.message);
    }
}

exports.handler = async (event) => {
    console.log('📊 Admin: Buscando dados...');

    try {
        inicializarFirebase();

        if (!firebaseInicializado || !db) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    total: 0,
                    arquivos: [],
                    mensagem: 'Firebase não inicializado'
                })
            };
        }

        // Busca todas as coletas no Firestore
        const snapshot = await db.collection('coletas')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();

        const arquivos = [];
        snapshot.forEach(doc => {
            const dados = doc.data();
            arquivos.push({
                arquivo: doc.id,
                data: dados.timestamp || new Date().toISOString(),
                conteudo: dados
            });
        });

        console.log(`✅ Encontrados ${arquivos.length} registros`);

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
        console.error('💥 Erro no admin:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                erro: error.message
            })
        };
    }
};
