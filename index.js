const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const pino = require('pino');

const SESSION_ID = process.env.SESSION_ID || '';
const GROUP_LINK = 'https://chat.whatsapp.com/KJVDMwOd6PZDxIfzdOiMrU';
const PREFIX = '+';

// Message Table Function
const showTable = (sessionFound) => {
    const line = '═'.repeat(45);
    console.log('\n' + line);
    console.log('║          ✅ TOXICTECH-MD BOT STARTED          ║');
    console.log(line);
    console.log(`║ Status    : ${sessionFound ? 'Session Valid ✅' : 'No Session ❌'}`);
    console.log(`║ Session   : ${SESSION_ID.substring(0, 20)}...`);
    console.log(`║ Platform  : Node.js ${process.version}`);
    console.log(`║ Memory    : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(line);
    if (!sessionFound) {
        console.log('║ 💡 Please set SESSION_ID in Environment Vars ║');
        console.log(line);
    }
    console.log('');
};

async function startBot() {
    const authPath = path.join(__dirname, 'auth_info');
    let sessionFound = false;

    if (!fs.existsSync(authPath)) fs.mkdirSync(authPath);

    // Decode Session ID
    if (SESSION_ID && SESSION_ID.startsWith('Toxicyobby=')) {
        try {
            const credsData = SESSION_ID.split('Toxicyobby=')[1];
            const decoded = Buffer.from(credsData, 'base64').toString('utf-8');
            fs.writeFileSync(path.join(authPath, 'creds.json'), decoded);
            sessionFound = true;
        } catch (e) {
            console.log('Invalid Session ID');
        }
    }

    // Show Message Table
    showTable(sessionFound);

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['TOXICTECH-MD', 'Chrome', '1.0.0'],
        getMessage: async (key) => ({ conversation: '' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'open') {
            console.log('✅ Bot Connected Successfully!');
            
            // Auto-Join Group
            try {
                const code = GROUP_LINK.split('/').pop();
                await sock.groupAcceptInvite(code);
                console.log('✅ Joined Support Group!');
            } catch (e) {
                console.log('Group join failed (already joined or link invalid)');
            }
        }

        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                startBot(); // Restart
            } else {
                console.log('Connection closed. Logged out.');
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        
        if (!body.startsWith(PREFIX)) return;

        const command = body.slice(PREFIX.length).toLowerCase().split(' ')[0];

        if (command === 'menu') {
            const menu = `
┏❐✦ TOXICTECH-MD BOT ✦❐
┃✦ Prefix: [${PREFIX}]
┃✦ Owner: TOXIC TECH
┃✦ Mode: public
┗❐
┏❐ `OWNER MENU` ❐
┃ ${PREFIX}mode
┃ ${PREFIX}restart
┗❐
┏❐ `GROUP ADMIN` ❐
┃ ${PREFIX}kick
┃ ${PREFIX}promote
┗❐
            `;
            await sock.sendMessage(from, { text: menu });
        }
        
        if (command === 'ping') {
            await sock.sendMessage(from, { text: 'Pong! 🏃‍♂️' });
        }
    });
}

startBot();
