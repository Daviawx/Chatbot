// script.js – Versão corrigida com modelo gratuito confirmado

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
    // 🔑 Sua chave (já fornecida)
    const API_KEY = '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';
    const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    
    // ✅ Modelo gratuito CONFIRMADO (DeepSeek R1 Free)
    const MODEL = 'deepseek/deepseek-r1:free';

    // ---------- ESTADO GLOBAL ----------
    let messages = [];
    let isBotTyping = false;
    let currentMode = 'fast';

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
        const welcome = "👋 Olá! Sou **DevAssist**, rodando com o modelo gratuito **DeepSeek R1** via OpenRouter. Como posso ajudar com programação hoje?";
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
            messageDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        } else {
            messageDiv.textContent = text;
        }

        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function parseMarkdown(text) {
        let escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        escaped = escaped.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'plaintext';
            return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
        });
        escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
        escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
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

    // ---------- HISTÓRICO ----------
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

    function scrollToBottom() {
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    }

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
        const messagesToSend = [
            {
                role: 'system',
                content: 'Você é um assistente especialista em programação. Responda dúvidas sobre código, lógica, frameworks, boas práticas, etc. Sempre que possível, forneça exemplos de código bem formatados e explicações claras. Use markdown.'
            },
            ...messages,
            { role: 'user', content: userMessage }
        ];

        const temperature = currentMode === 'pro' ? 0.8 : 0.5;
        const maxTokens = currentMode === 'pro' ? 1200 : 600;

        const requestBody = {
            model: MODEL,
            messages: messagesToSend,
            temperature: temperature,
            max_tokens: maxTokens
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'DevAssist Chat'
                },
                body: JSON.stringify(requestBody)
            });

            // Captura detalhe do erro se houver
            let errorDetail = '';
            try {
                const errorData = await response.json();
                errorDetail = errorData.error?.message || JSON.stringify(errorData);
            } catch (e) {
                errorDetail = await response.text();
            }

            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${errorDetail}`);
            }

            const data = await response.json();
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Resposta da API em formato inesperado');
            }
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Falha na chamada da API:', error);
            // Retorna uma mensagem de erro útil
            return `**❌ Erro na comunicação com a IA:** ${error.message}\n\n**Possíveis causas:**\n- Chave inválida ou expirada\n- Limite de requisições excedido\n- Modelo temporariamente indisponível\n\n**Sugestão:** Tente novamente mais tarde ou verifique sua chave no site do OpenRouter.`;
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
            addMessageToChat(botReply, 'bot');
            messages.push({ role: 'assistant', content: botReply });
            saveHistory();
        } catch (error) {
            removeTypingIndicator();
            addMessageToChat(`**Erro inesperado:** ${error.message}`, 'bot');
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
            btn.classList.toggle('active', btn.dataset.mode === mode);
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

    init();
    setMode('fast');
});
