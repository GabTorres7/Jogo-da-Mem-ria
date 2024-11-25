const express = require('express');
const app = express();
const http = require('http').createServer(app);
// Importa o módulo 'socket.io' para configurar a comunicação em tempo real
const io = require('socket.io')(http);
// Importa o módulo 'path' para manipulação de caminhos de arquivos
const path = require('path');

// Configuração para servir arquivos estáticos (arquivos da pasta 'public')
app.use(express.static(path.join(__dirname, 'public')));

// Define a rota principal ('/') para enviar o arquivo HTML para o cliente
app.get('/', (req, res) => {
    // Envia o arquivo 'index.html' para o cliente quando ele acessar a raiz do servidor
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cria um mapa (Map) para armazenar as salas de jogo
const rooms = new Map();

// Configuração do Socket.IO para gerenciar conexões em tempo real
io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.id); // Imprime o ID do usuário que se conectou

    // Quando o jogador envia o evento 'joinGame' para entrar no jogo
    socket.on('joinGame', () => {
        let roomId = null;
        
        // Verifica se existe alguma sala com apenas 1 jogador (esperando um segundo jogador)
        for (let [id, room] of rooms.entries()) {
            if (room.players.length === 1) {
                roomId = id;
                break; // Encontra a sala e sai do loop
            }
        }

        // Caso não tenha encontrado uma sala para o jogador, cria uma nova sala
        if (!roomId) {
            roomId = Date.now().toString(); // Gera um ID único para a sala baseado no timestamp
            rooms.set(roomId, { // Cria a sala e adiciona ao mapa de salas
                players: [], // Lista de jogadores
                choices: {}, // Armazena as escolhas dos jogadores
                scores: {} // Armazena os pontos dos jogadores
            });
        }

        // Obtém a sala atual com base no ID da sala
        const room = rooms.get(roomId);
        // Adiciona o jogador à sala
        room.players.push(socket.id);
        // Inicializa a pontuação do jogador
        room.scores[socket.id] = 0;
        // Faz o jogador entrar na sala
        socket.join(roomId);
        // Armazena o ID da sala no socket do jogador
        socket.roomId = roomId;

        // Se a sala tiver dois jogadores, inicia o jogo
        if (room.players.length === 2) {
            // Envia para ambos os jogadores que o jogo começou
            io.to(roomId).emit('gameStart', {
                player1: room.players[0], // Primeiro jogador
                player2: room.players[1]  // Segundo jogador
            });
        }
    });

    // Quando o jogador faz uma escolha (pedra, papel ou tesoura)
    socket.on('makeChoice', (choice) => {
        // Obtém a sala atual do jogador
        const room = rooms.get(socket.roomId);
        if (!room) return; // Se a sala não existir, retorna

        // Armazena a escolha do jogador na sala
        room.choices[socket.id] = choice;

        // Verifica se ambos os jogadores fizeram sua escolha
        if (Object.keys(room.choices).length === 2) {
            // Recupera as escolhas dos jogadores
            const [player1, player2] = room.players;
            const choice1 = room.choices[player1];
            const choice2 = room.choices[player2];

            let winner = null;
            // Lógica para determinar o vencedor com base nas escolhas
            if (choice1 === choice2) {
                winner = 'empate'; // Empate se as escolhas forem iguais
            } else if (
                (choice1 === 'pedra' && choice2 === 'tesoura') ||
                (choice1 === 'tesoura' && choice2 === 'papel') ||
                (choice1 === 'papel' && choice2 === 'pedra')
            ) {
                winner = player1; // Jogador 1 vence
                room.scores[player1]++; // Incrementa a pontuação do jogador 1
            } else {
                winner = player2; // Jogador 2 vence
                room.scores[player2]++; // Incrementa a pontuação do jogador 2
            }

            // Envia o resultado do jogo para ambos os jogadores
            io.to(socket.roomId).emit('gameResult', {
                choices: room.choices, // Escolhas de ambos os jogadores
                winner, // Vencedor ou 'empate'
                scores: room.scores // Placar atualizado
            });

            // Limpa as escolhas após o resultado
            room.choices = {};
        }
    });

    // Quando um jogador se desconecta
    socket.on('disconnect', () => {
        if (socket.roomId && rooms.has(socket.roomId)) {
            // Obtém a sala do jogador
            const room = rooms.get(socket.roomId);
            // Remove o jogador da lista de jogadores da sala
            room.players = room.players.filter(id => id !== socket.id);
            // Se não houver mais jogadores na sala, deleta a sala
            if (room.players.length === 0) {
                rooms.delete(socket.roomId);
            } else {
                // Se ainda houver jogadores na sala, avisa os outros jogadores
                io.to(socket.roomId).emit('playerDisconnected');
            }
        }
    });
});

// Configuração do servidor para rodar na porta 3000
const PORT = 3000;
http.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
