// Configurações do backend
const CONFIG = {
    // Em produção, usa a URL do Render, em desenvolvimento usa localhost
    BACKEND_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'  // Desenvolvimento local
        : 'https://oraculo-cigano-backend.onrender.com', // URL do Render em produção
    MAX_REQUESTS_PER_MINUTE: 60,
    REQUEST_DELAY: 250
};

// Função para tentar diferentes portas (apenas em desenvolvimento)
async function encontrarPortaBackend() {
    // Em produção, retorna null imediatamente
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return null;
    }

    const portas = [3000, 3001, 3002, 3003, 3004, 3005];
    console.log('Tentando encontrar o servidor nas portas:', portas.join(', '));

    for (const porta of portas) {
        const url = `http://localhost:${porta}/api/test`;
        console.log(`Testando porta ${porta}...`);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);

            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Servidor encontrado na porta ${porta}:`, data);
                return porta;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`⏱️ Timeout na porta ${porta}`);
            } else {
                console.log(`❌ Porta ${porta} não respondeu:`, error.message);
            }
            continue;
        }
    }

    throw new Error('Não foi possível encontrar o servidor em nenhuma porta. Verifique se o servidor está rodando.');
}

// Função para inicializar a conexão com o backend
async function inicializarBackend() {
    // Em produção, retorna true imediatamente sem tentar inicializar
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.log('Ambiente de produção detectado, usando URL do Render:', CONFIG.BACKEND_URL);
        return true;
    }

    try {
        const porta = await encontrarPortaBackend();
        if (porta) {
            CONFIG.BACKEND_URL = `http://localhost:${porta}`;
            console.log('Backend configurado para desenvolvimento:', CONFIG.BACKEND_URL);
        }
        return true;
    } catch (error) {
        console.error('Erro ao inicializar backend:', error);
        return false;
    }
}

async function gerarMensagemIntuitiva(c1, c2, tempo, tema) {
    // Em produção, usa diretamente a URL do Render
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.log('Usando backend em produção:', CONFIG.BACKEND_URL);
    } else {
        // Em desenvolvimento, tenta inicializar o backend
        if (!await inicializarBackend()) {
            throw new Error('Não foi possível conectar ao servidor. Por favor, verifique se o servidor está rodando.');
        }
    }

    console.log('Tentando conectar ao backend:', CONFIG.BACKEND_URL);

    try {
        // Primeiro, testa se o servidor está respondendo
        try {
            const testResponse = await fetch(`${CONFIG.BACKEND_URL}/api/test`);
            if (!testResponse.ok) {
                throw new Error(`Servidor respondeu com status: ${testResponse.status}`);
            }
            const testData = await testResponse.json();
            console.log('Teste de conexão com backend:', testData);
        } catch (testError) {
            console.error('Erro ao testar conexão com backend:', testError);
            throw new Error(`Servidor não está respondendo: ${testError.message}`);
        }

        // Se o teste passou, faz a requisição principal
        console.log('Enviando requisição para:', `${CONFIG.BACKEND_URL}/api/interpretacao`);
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/interpretacao`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                carta1: c1,
                carta2: c2,
                tempo: tempo,
                tema: tema
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
            console.error('Erro na resposta do servidor:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(errorData.error || `Erro do servidor: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Resposta recebida do servidor:', data);
        return data.interpretacao;
    } catch (error) {
        console.error('Erro detalhado:', {
            message: error.message,
            stack: error.stack,
            url: CONFIG.BACKEND_URL
        });
        throw new Error(`Não foi possível gerar a interpretação: ${error.message}`);
    }
}

// Exporta as funções necessárias
window.CONFIG = CONFIG;
window.encontrarPortaBackend = encontrarPortaBackend;
window.inicializarBackend = inicializarBackend;
window.gerarMensagemIntuitiva = gerarMensagemIntuitiva; 