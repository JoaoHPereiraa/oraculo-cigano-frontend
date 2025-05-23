// Configurações do backend
const CONFIG = {
    // Em produção, usa a URL do Render, em desenvolvimento usa localhost
    BACKEND_URL: (() => {
        // Verifica se está rodando no GitHub Pages
        const isGitHubPages = window.location.hostname.includes('github.io');
        console.log('Detectado GitHub Pages:', isGitHubPages);

        // Se estiver no GitHub Pages, usa a URL do Render
        if (isGitHubPages) {
            console.log('Usando URL do Render em produção');
            return 'https://oraculo-cigano-backend.onrender.com';
        }

        // Se estiver em localhost, usa localhost
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        console.log('Ambiente detectado:', isLocalhost ? 'Desenvolvimento (localhost)' : 'Desenvolvimento (outro)');
        return isLocalhost ? 'http://localhost:3000' : 'https://oraculo-cigano-backend.onrender.com';
    })(),
    MAX_REQUESTS_PER_MINUTE: 120, // Dobrar o limite de requisições por minuto
    REQUEST_DELAY: 500 // Aumentar o intervalo entre requisições para 500ms
};

// Função para tentar diferentes portas (apenas em desenvolvimento local)
async function encontrarPortaBackend() {
    // Se não estiver em localhost, retorna null imediatamente
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.log('Não está em localhost, pulando busca de porta');
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
    // Se estiver no GitHub Pages, retorna true imediatamente
    if (window.location.hostname.includes('github.io')) {
        console.log('GitHub Pages detectado, usando URL do Render:', CONFIG.BACKEND_URL);
        return true;
    }

    // Se estiver em localhost, tenta encontrar a porta
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
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

    // Para qualquer outro ambiente, usa a URL do Render
    console.log('Usando URL do Render:', CONFIG.BACKEND_URL);
    return true;
}

async function gerarMensagemIntuitiva(c1, c2, tempo, tema) {
    // Garante que a URL do backend está definida corretamente
    if (!CONFIG.BACKEND_URL) {
        console.error('URL do backend não está definida!');
        throw new Error('URL do backend não está configurada corretamente');
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
            url: CONFIG.BACKEND_URL,
            hostname: window.location.hostname
        });
        throw new Error(`Não foi possível gerar a interpretação: ${error.message}`);
    }
}

// Exporta as funções necessárias
window.CONFIG = CONFIG;
window.encontrarPortaBackend = encontrarPortaBackend;
window.inicializarBackend = inicializarBackend;
window.gerarMensagemIntuitiva = gerarMensagemIntuitiva;