document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    // Estado de controle
    let isBotTyping = false;

    // Função para adicionar uma mensagem ao chat
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    // Função para rolar para a última mensagem
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Função para mostrar o indicador de "digitando"
    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.classList.add('message', 'typing-indicator');
        indicator.id = 'typingIndicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(indicator);
        scrollToBottom();
    }

    // Função para remover o indicador de "digitando"
    function removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    // Função assíncrona para chamar a API do LLM (substitua com seus dados)
    async function fetchBotResponse(userMessage) {
        // 🔑 INSIRA SUA CHAVE DE API E URL AQUI
        const API_KEY = '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'; // Substitua pela sua chave
        const API_URL = 'https://api.openai.com/v1/chat/completions'; // Exemplo OpenAI (ajuste para Gemini, etc.)

        // Exemplo de corpo para OpenAI (adapte conforme a API escolhida)
        const requestBody = {
            model: 'gpt-3.5-turbo',          // Modelo desejado
            messages: [{ role: 'user', content: userMessage }],
            temperature: 0.7,
            max_tokens: 500
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}` // Para OpenAI
                    // Se for Gemini, o formato pode ser diferente (ex: 'X-Goog-Api-Key')
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            // Extrair resposta - para OpenAI
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content;
            } 
            // Adapte aqui para outras APIs (Gemini, Claude, etc.)
            else {
                throw new Error('Formato de resposta não reconhecido');
            }
        } catch (error) {
            console.error('Falha na chamada da API:', error);
            return 'Desculpe, não consegui processar sua mensagem no momento. Por favor, tente novamente mais tarde.';
        }
    }

    // Função que obtém a resposta do bot (usa a API ou fallback)
    async function getBotResponse(userMessage) {
        // Tenta obter resposta da API
        let reply = await fetchBotResponse(userMessage);
        
        // Se a API falhar (ex: chave inválida), podemos usar respostas locais simples
        // Isso é opcional e apenas para demonstração sem API real
        if (reply.includes('não consegui processar') || reply.includes('Erro')) {
            // Fallback para respostas locais (remova se preferir apenas o retorno da API)
            const fallbackResponses = [
                "Entendi, pode me contar mais?",
                "Isso é interessante!",
                "Desculpe, não tenho uma resposta agora, mas estou aqui para ajudar.",
                "Pode reformular a pergunta?",
                "Estou aprendendo ainda, mas vamos nessa!"
            ];
            reply = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        }
        
        return reply;
    }

    // Função principal para enviar mensagem
    async function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === '' || isBotTyping) return;

        // Adiciona mensagem do usuário
        addMessage(messageText, 'user');
        userInput.value = '';
        userInput.disabled = true;
        sendButton.disabled = true;
        isBotTyping = true;

        // Mostra indicador de digitação
        showTypingIndicator();

        try {
            // Obtém resposta do bot
            const botReply = await getBotResponse(messageText);
            
            // Remove indicador e adiciona resposta real
            removeTypingIndicator();
            addMessage(botReply, 'bot');
        } catch (error) {
            console.error('Erro ao obter resposta do bot:', error);
            removeTypingIndicator();
            addMessage('Ops! Ocorreu um erro inesperado.', 'bot');
        } finally {
            // Reabilita input
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
            isBotTyping = false;
        }
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Evita quebra de linha
            sendMessage();
        }
    });

    // Scroll inicial para a última mensagem (caso haja)
    scrollToBottom();
});