document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    let isBotTyping = false;

    // 🔑 SUA CHAVE DA OPENAI (já inserida)
    const API_KEY = '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';
    const API_URL = 'https://api.openai.com/v1/chat/completions';

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.classList.add('message', 'typing-indicator');
        indicator.id = 'typingIndicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(indicator);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    async function fetchBotResponse(userMessage) {
        // Mensagem de sistema para definir a personalidade do bot
        const systemMessage = {
            role: 'system',
            content: 'Você é um assistente especialista em programação, similar a DeepSeek, Gemini e ChatGPT. Responda dúvidas sobre código, lógica, frameworks, boas práticas, etc. Sempre que possível, forneça exemplos de código bem formatados e explicações claras. Seja amigável e didático.'
        };

        const requestBody = {
            model: 'gpt-3.5-turbo', // ou 'gpt-4' se disponível
            messages: [systemMessage, { role: 'user', content: userMessage }],
            temperature: 0.7,
            max_tokens: 800
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro ${response.status}: ${errorData.error?.message || 'Desconhecido'}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Falha na chamada da API:', error);
            return `**Erro na API:** ${error.message}. Verifique sua chave, saldo ou modelo.`;
        }
    }

    async function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === '' || isBotTyping) return;

        addMessage(messageText, 'user');
        userInput.value = '';
        userInput.disabled = true;
        sendButton.disabled = true;
        isBotTyping = true;

        showTypingIndicator();

        try {
            const botReply = await fetchBotResponse(messageText);
            removeTypingIndicator();
            addMessage(botReply, 'bot');
        } catch (error) {
            console.error('Erro ao obter resposta do bot:', error);
            removeTypingIndicator();
            addMessage('Ops! Ocorreu um erro inesperado. Tente novamente.', 'bot');
        } finally {
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
            isBotTyping = false;
        }
    }

    sendButton.addEventListener('click', sendMessage);

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    scrollToBottom();
});
