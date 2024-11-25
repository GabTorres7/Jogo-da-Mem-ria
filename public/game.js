const socket = io(); // Conexão com o servidor via Socket.IO

let idJogador = null; // ID do jogador
let éMinhaVez = false; // Indica se é a vez do jogador atual

// Seleciona elementos da interface do jogo
const areaJogo = document.querySelector('.game-area');
const mensagemEsperando = document.querySelector('.waiting-message');
const botoesEscolha = document.querySelectorAll('.choice-btn');
const divResultado = document.querySelector('.result');
const mensagemResultado = document.querySelector('.result-message');
const botaoJogarNovamente = document.querySelector('.play-again');
const pontuacaoJogador1 = document.querySelector('.player1 span');
const pontuacaoJogador2 = document.querySelector('.player2 span');

// Notifica o servidor que o jogador entrou no jogo
socket.emit('joinGame');

// Evento disparado quando o jogo começa
socket.on('gameStart', (dados) => {
    idJogador = socket.id; // Define o ID do jogador atual
    éMinhaVez = true; // Define que o jogador atual começa jogando
    mensagemEsperando.classList.add('hidden'); // Esconde a mensagem de espera
    areaJogo.classList.remove('hidden'); // Mostra a área de jogo

    // Configura os nomes e pontuações dos jogadores
    if (idJogador === dados.player1) {
        document.querySelector('.player1').textContent = 'Você: 0';
        document.querySelector('.player2').textContent = 'Oponente: 0';
    } else {
        document.querySelector('.player1').textContent = 'Oponente: 0';
        document.querySelector('.player2').textContent = 'Você: 0';
    }
});

// Evento disparado quando o resultado do jogo é recebido
socket.on('gameResult', (dados) => {
    const minhaEscolha = dados.choices[socket.id]; // A escolha do jogador atual
    const escolhaOponente = Object.values(dados.choices).find(escolha => escolha !== minhaEscolha); // A escolha do oponente

    let textoResultado = '';
    if (dados.winner === 'empate') {
        textoResultado = 'Empate!';
    } else if (dados.winner === socket.id) {
        textoResultado = 'Você venceu!';
    } else {
        textoResultado = 'Você perdeu!';
    }

    // Garante que as escolhas existem antes de exibi-las
    const textoMinhaEscolha = minhaEscolha ? minhaEscolha.toUpperCase() : 'indefinido';
    const textoEscolhaOponente = escolhaOponente ? escolhaOponente.toUpperCase() : 'indefinido';

    // Atualiza a mensagem de resultado
    mensagemResultado.textContent = `
        Você escolheu ${textoMinhaEscolha}
        Oponente escolheu ${textoEscolhaOponente}
        ${textoResultado}
    `;

    // Atualiza a pontuação dos jogadores
    const idJogador1 = Object.keys(dados.choices)[0];
    const idJogador2 = Object.keys(dados.choices)[1];

    if (idJogador === idJogador1) {
        pontuacaoJogador1.textContent = dados.scores[idJogador1] || 0;
        pontuacaoJogador2.textContent = dados.scores[idJogador2] || 0;
    } else {
        pontuacaoJogador1.textContent = dados.scores[idJogador1] || 0;
        pontuacaoJogador2.textContent = dados.scores[idJogador] || 0;
    }

    divResultado.classList.remove('hidden'); // Mostra a seção de resultados
    botoesEscolha.forEach(botao => botao.disabled = true); // Desabilita os botões de escolha
});

// Evento disparado quando o oponente se desconecta
socket.on('playerDisconnected', () => {
    mensagemEsperando.textContent = 'Oponente desconectou. Aguardando novo jogador...';
    mensagemEsperando.classList.remove('hidden');
    areaJogo.classList.add('hidden');
    divResultado.classList.add('hidden');
});

// Adiciona eventos de clique nos botões de escolha
botoesEscolha.forEach(botao => {
    botao.addEventListener('click', () => {
        if (!éMinhaVez) return; // Não faz nada se não for a vez do jogador

        const escolha = botao.dataset.choice; // Obtém a escolha do botão clicado
        socket.emit('makeChoice', escolha); // Envia a escolha para o servidor
        botoesEscolha.forEach(btn => btn.disabled = true); // Desabilita todos os botões
        éMinhaVez = false; // Define que não é mais a vez do jogador
    });
});

// Evento para jogar novamente
botaoJogarNovamente.addEventListener('click', () => {
    divResultado.classList.add('hidden'); // Esconde os resultados
    botoesEscolha.forEach(botao => botao.disabled = false); // Habilita os botões
    éMinhaVez = true; // Define que é a vez do jogador novamente
});
