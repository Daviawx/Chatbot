// script.js – Todas as funcionalidades avançadas

document.addEventListener('DOMContentLoaded', () => {
    // ---------- ELEMENTOS DO DOM ----------
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const clearBtn = document.getElementById('clearChat');
    const themeToggle = document.getElementById('themeToggle');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const currentModeLabel = document.getElementById('currentModeLabel');
    const suggestionsBar = document.getElementById('suggestionsBar');

    // ---------- CONFIGURAÇÃO DA API ----------
    const API_KEY = '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';
    const API_URL = 'https://api.openai.com/v1/chat/completions';

    // ---------- ESTADO GLOBAL ----------
    let messages = []; // array completo do histórico (formato OpenAI)
    let isBotTyping = false;
    let currentMode = 'fast'; // 'fast' ou 'pro'
    let abortController = null; // para cancelar requisição, se necessário

    // ---------- INICIALIZAÇÃO ----------
    function init() {
        // Carrega histórico do localStorage (se existir)
        loadHistory();
        // Se não houver mensagens, adiciona a mensagem de boas-vindas
        if (messages.length === 0) {
            addWelcomeMessage();
        } else {
            // Renderiza mensagens salvas
            renderMessagesFromHistory();
        }
        scrollToBottom();
        userInput.focus();
    }

    function addWelcomeMessage() {
        const welcome = "Olá! Sou **DevAssist**, seu assistente especializado em programação. Posso ajudar com código, lógica, frameworks, boas práticas e muito mais. **O que você precisa?**";
        addMessageToChat(welcome, 'bot');
        // Adiciona ao histórico de mensagens (role: assistant)
        messages.push({ role: 'assistant', content: welcome });
        saveHistory();
    }

    // ---------- FUNÇÕES DE RENDERIZAÇÃO DE MENSAGENS ----------
    function addMessageToChat(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

        // Se for mensagem do bot, converte markdown simples e aplica highlight
        if (sender === 'bot') {
            messageDiv.innerHTML = parseMarkdown(text);
            // Aplica highlight nos blocos de código
            messageDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        } else {
            messageDiv.textContent = text; // usuário não precisa de markdown
        }

        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    // Parser markdown simples (negrito, itálico, código, blocos de código)
    function parseMarkdown(text) {
        // Escapa tags HTML
        let escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // Blocos de código (```)
        escaped = escaped.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'plaintext';
            return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
        });
        // Código inline `codigo`
        escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Negrito **texto**
        escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Itálico *texto*
        escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        // Quebras de linha
        escaped = escaped.replace(/\n/g, '<br>');
        return escaped;
    }

    // Renderiza todo o histórico (útil ao carregar)
    function renderMessagesFromHistory() {
        chatMessages.innerHTML = '';
        messages.forEach(msg => {
            const sender = msg.role === 'user' ? 'user' : 'bot';
            addMessageToChat(msg.content, sender);
        });
    }

    // ---------- FUNÇÕES DE HISTÓRICO (LOCALSTORAGE) ----------
    function saveHistory() {
        localStorage.setItem('chatHistory', JSON.stringify(messages));
    }

    function loadHistory() {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            try {
                messages = JSON.parse(saved);
            } catch (e) {
                messages = [];
            }
        } else {
            messages = [];
        }
    }

    function clearHistory() {
        if (confirm('Tem certeza que deseja limpar toda a conversa?')) {
            messages = [];
            chatMessages.innerHTML = '';
            addWelcomeMessage();
            saveHistory();
        }
    }

    // ---------- ROLAGEM AUTOMÁTICA ----------
    function scrollToBottom() {
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    }

    // ---------- INDICADOR DE DIGITAÇÃO ----------
    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.classList.add('message', 'typing-indicator');
        indicator.id = 'typingIndicator';
        indicator.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
        chatMessages.appendChild(indicator);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    // ---------- CHAMADA À API (com suporte a cancelamento) ----------
    async function fetchBotResponse(userMessage) {
        // Monta o array de mensagens com o histórico completo + a nova mensagem do usuário
        const messagesToSend = [
            {
                role: 'system',
                content: 'Você é um assistente especialista em programação, similar a DeepSeek, Gemini e ChatGPT. Responda dúvidas sobre código, lógica, frameworks, boas práticas, etc. Sempre que possível, forneça exemplos de código bem formatados e explicações claras. Seja amigável e didático. Use markdown para formatar código e texto.'
            },
            ...messages,
            { role: 'user', content: userMessage }
        ];

        // Ajusta parâmetros conforme o modo
        const model = currentMode === 'pro' ? 'gpt-4' : 'gpt-3.5-turbo';
        const temperature = currentMode === 'pro' ? 0.8 : 0.5;
        const maxTokens = currentMode === 'pro' ? 1200 : 600;

        const requestBody = {
            model: model,
            messages: messagesToSend,
            temperature: temperature,
            max_tokens: maxTokens
        };

        // Cria um AbortController para poder cancelar (opcional)
        abortController = new AbortController();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify(requestBody),
                signal: abortController.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro ${response.status}: ${errorData.error?.message || 'Desconhecido'}`);
            }

            const data = await response.json();
            const reply = data.choices[0].message.content;
            return reply;
        } catch (error) {
            if (error.name === 'AbortError') {
                return null; // requisição cancelada
            }
            console.error('Falha na chamada da API:', error);
            throw error; // repassa para ser tratado no sendMessage
        } finally {
            abortController = null;
        }
    }

    // ---------- ENVIO DE MENSAGEM ----------
    async function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === '' || isBotTyping) return;

        // Adiciona mensagem do usuário na interface
        addMessageToChat(messageText, 'user');
        // Adiciona ao histórico
        messages.push({ role: 'user', content: messageText });
        saveHistory();

        // Limpa input e desabilita
        userInput.value = '';
        userInput.disabled = true;
        sendButton.disabled = true;
        isBotTyping = true;

        // Mostra indicador de digitação
        showTypingIndicator();

        try {
            // Obtém resposta da API
            const botReply = await fetchBotResponse(messageText);
            removeTypingIndicator();

            if (botReply !== null) {
                // Adiciona resposta do bot na interface
                addMessageToChat(botReply, 'bot');
                // Adiciona ao histórico
                messages.push({ role: 'assistant', content: botReply });
                saveHistory();
            } else {
                // Requisição cancelada (não faz nada)
            }
        } catch (error) {
            removeTypingIndicator();
            const errorMsg = `**Erro:** ${error.message}. Verifique sua chave, saldo ou tente novamente.`;
            addMessageToChat(errorMsg, 'bot');
            // Não adiciona erro ao histórico (opcional)
        } finally {
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
            isBotTyping = false;
        }
    }

    // ---------- MUDANÇA DE MODO (FAST / PRO) ----------
    function setMode(mode) {
        currentMode = mode;
        modeBtns.forEach(btn => {
            const btnMode = btn.dataset.mode;
            if (btnMode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        currentModeLabel.textContent = mode === 'pro' ? 'Pro' : 'Fast';
    }

    // ---------- TEMA CLARO/ESCURO ----------
    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('light-theme')) {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }

    // ---------- SUGESTÕES (CHIPS) ----------
    suggestionsBar.addEventListener('click', (e) => {
        const chip = e.target.closest('.suggestion-chip');
        if (chip) {
            const prompt = chip.dataset.prompt;
            if (prompt) {
                userInput.value = prompt;
                sendMessage();
            }
        }
    });

    // ---------- AJUSTE AUTOMÁTICO DE ALTURA DO TEXTAREA ----------
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    });

    // ---------- EVENT LISTENERS ----------
    sendButton.addEventListener('click', sendMessage);

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    clearBtn.addEventListener('click', clearHistory);

    themeToggle.addEventListener('click', toggleTheme);

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setMode(btn.dataset.mode);
        });
    });

    // Inicializa
    init();
    setMode('fast'); // padrão
});
