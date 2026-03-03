// script.js – Todas as funcionalidades avançadas com OpenRouter (gratuito) - Modelo Gemma 3 27B

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

    // ---------- CONFIGURAÇÃO DA API (OPENROUTER) ----------
    // 🔑 NOVA CHAVE FORNECIDA
    const API_KEY = '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';
    const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    
    // Modelo gratuito escolhido: google/gemma-3-27b-it:free
    // (usaremos o mesmo modelo para ambos os modos, mas com parâmetros diferentes)
    const MODEL = 'google/gemma-3-27b-it:free';

    // ---------- ESTADO GLOBAL ----------
    let messages = []; // array completo do histórico (formato OpenAI)
    let isBotTyping = false;
    let currentMode = 'fast'; // 'fast' ou 'pro'
    let abortController = null;

    // ---------- INICIALIZAÇÃO ----------
    function init() {
        loadHistory();
        if (messages.length === 0) {
            addWelcomeMessage();
        } else {
            renderMessagesFromHistory();
        }
        scrollToBottom();
        userInput.focus();
    }

    function addWelcomeMessage() {
        const welcome = "Olá! Sou **DevAssist**, rodando com o modelo gratuito **Gemma 3 27B** via OpenRouter. Como posso ajudar com programação hoje?";
        addMessageToChat(welcome, 'bot');
        messages.push({ role: 'assistant', content: welcome });
        saveHistory();
    }

    // ---------- FUNÇÕES DE RENDERIZAÇÃO ----------
    function addMessageToChat(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

        if (sender === 'bot') {
            messageDiv.innerHTML = parseMarkdown(text);
            // Aplica highlight nos blocos de código
            messageDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        } else {
            messageDiv.textContent = text;
        }

        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    // Parser markdown simples
    function parseMarkdown(text) {
        let escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // Blocos de código ```
        escaped = escaped.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'plaintext';
            return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
        });
        // Código inline `
        escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Negrito **
        escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Itálico *
        escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        // Quebras de linha
        escaped = escaped.replace(/\n/g, '<br>');
        return escaped;
    }

    function renderMessagesFromHistory() {
        chatMessages.innerHTML = '';
        messages.forEach(msg => {
            const sender = msg.role === 'user' ? 'user' : 'bot';
            addMessageToChat(msg.content, sender);
        });
    }

    // ---------- HISTÓRICO (LOCALSTORAGE) ----------
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

    // ---------- ROLAGEM ----------
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

    // ---------- CHAMADA À API (OPENROUTER) ----------
    async function fetchBotResponse(userMessage) {
        // Monta histórico completo
        const messagesToSend = [
            {
                role: 'system',
                content: 'Você é um assistente especialista em programação, similar a DeepSeek, Gemini e ChatGPT. Responda dúvidas sobre código, lógica, frameworks, boas práticas, etc. Sempre que possível, forneça exemplos de código bem formatados e explicações claras. Seja amigável e didático. Use markdown para formatar código e texto.'
            },
            ...messages,
            { role: 'user', content: userMessage }
        ];

        // Parâmetros diferentes para cada modo (mesmo modelo)
        const temperature = currentMode === 'pro' ? 0.8 : 0.5;
        const maxTokens = currentMode === 'pro' ? 1200 : 600;

        const requestBody = {
            model: MODEL,            // mesmo modelo para ambos os modos
            messages: messagesToSend,
            temperature: temperature,
            max_tokens: maxTokens
        };

        abortController = new AbortController();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                    'HTTP-Referer': window.location.origin, // identificação opcional
                    'X-Title': 'DevAssist Chat' // nome do seu app
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
                return null;
            }
            console.error('Falha na chamada da API:', error);
            
            // Fallback amigável para quando a API gratuita falhar (limite, etc.)
            const fallbacks = [
                "A API gratuita está temporariamente indisponível. Por favor, tente novamente em alguns instantes.",
                "Parece que atingimos o limite de requisições gratuitas. Tente novamente mais tarde.",
                "Desculpe, não consegui me conectar ao modelo de IA agora. Vou usar uma resposta local.",
                "**Modo offline:** Como fallback, aqui vai uma dica: consulte a documentação oficial da tecnologia que você está usando."
            ];
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        } finally {
            abortController = null;
        }
    }

    // ---------- ENVIO DE MENSAGEM ----------
    async function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === '' || isBotTyping) return;

        addMessageToChat(messageText, 'user');
        messages.push({ role: 'user', content: messageText });
        saveHistory();

        userInput.value = '';
        userInput.disabled = true;
        sendButton.disabled = true;
        isBotTyping = true;

        showTypingIndicator();

        try {
            const botReply = await fetchBotResponse(messageText);
            removeTypingIndicator();

            if (botReply !== null) {
                addMessageToChat(botReply, 'bot');
                messages.push({ role: 'assistant', content: botReply });
                saveHistory();
            }
        } catch (error) {
            removeTypingIndicator();
            const errorMsg = `**Erro inesperado:** ${error.message}`;
            addMessageToChat(errorMsg, 'bot');
        } finally {
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
            isBotTyping = false;
        }
    }

    // ---------- MUDANÇA DE MODO ----------
    function setMode(mode) {
        currentMode = mode;
        modeBtns.forEach(btn => {
            const btnMode = btn.dataset.mode;
            btn.classList.toggle('active', btnMode === mode);
        });
        currentModeLabel.textContent = mode === 'pro' ? 'Pro' : 'Fast';
    }

    // ---------- TEMA ----------
    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const icon = themeToggle.querySelector('i');
        icon.className = document.body.classList.contains('light-theme') ? 'fas fa-sun' : 'fas fa-moon';
    }

    // ---------- SUGESTÕES ----------
    suggestionsBar.addEventListener('click', (e) => {
        const chip = e.target.closest('.suggestion-chip');
        if (chip && chip.dataset.prompt) {
            userInput.value = chip.dataset.prompt;
            sendMessage();
        }
    });

    // ---------- AJUSTE DE ALTURA DO TEXTAREA ----------
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    });

    // ---------- EVENTOS ----------
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
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    // Inicializa
    init();
    setMode('fast');
});
