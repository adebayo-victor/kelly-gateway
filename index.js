// --- 1. THE TOOLS ---
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom'); 
const qrcode = require('qrcode-terminal'); 
const express = require('express'); 
const axios = require('axios'); 

const app = express();
app.use(express.json()); 

const PYTHON_URL = "https://kelly-processor-ymy9.onrender.com/webhook"; 
let sock; 

async function startFummsa() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, 
        browser: ["Sideswipe FUMMSA", "Windows", "1.0"] 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('🦓 SCAN THIS TO LINK SIDESWIPE:');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startFummsa();
        } else if (connection === 'open') {
            console.log('✅ SIDESWIPE ONLINE: I am watching the chats.');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return; 

        const msg = messages[0];
        const jid = msg.key.remoteJid; 

        if (!msg.message || msg.key.fromMe || jid === 'status@broadcast' || msg.message.protocolMessage) return; 

        // --- NEW METADATA EXTRACTION ---
        const isGroup = jid.includes('@g.us');
        
        // username: The name they set on WhatsApp
        const username = msg.pushName || "Unknown Recruit";
        
        // sender: If group, get the person's ID. If DM, it's just the jid.
        const senderNumber = isGroup ? msg.key.participant : jid;
        
        // taggedBy: Extract anyone mentioned in the message
        const mentions = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

        // TEXT EXTRACTION
        const body = msg.message.conversation || 
                     msg.message.extendedTextMessage?.text || 
                     msg.message.imageMessage?.caption || "";

        if (!body) return; 

        console.log(`📡 [${isGroup ? 'GROUP' : 'DM'}] From: ${username} (${senderNumber}) | Msg: ${body}`);

        // 6. THE HANDOFF: Send the FULL payload to Python
        try {
            await axios.post(PYTHON_URL, { 
                chatId: jid,           // Where to reply (Group or DM)
                sender: senderNumber, // Who specifically sent it
                username: username,   // What they call themselves
                text: body,
                isGroup: isGroup,
                taggedBy: mentions    // List of tagged people
            });
        } catch (e) {
            console.log("⚠️ Python Brain is offline!");
        }
    });
}


// NO TERNARIES - PURE JS LOGIC
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vicade Techlite | Student Ease</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root { --sage: #94a684; --earth: #463f3a; --cream: #f4f1de; }
        body { background-color: var(--cream); color: var(--earth); overflow-x: hidden; font-family: sans-serif; }
        .bg-sage { background-color: var(--sage); }
        .accent-border { border: 2px solid var(--earth); }
        .btn-hover:hover { background-color: var(--earth); color: var(--cream); transform: translateY(-2px); }
    </style>
</head>
<body class="min-h-screen flex flex-col md:flex-row">

    <section class="md:w-1/2 bg-sage relative flex items-center justify-center p-8 min-h-[40vh] md:min-h-screen">
        <div class="absolute inset-0 opacity-40">
            <img src="https://images.unsplash.com/photo-1554568218-0f1715e72254?auto=format&fit=crop&q=80&w=1000" 
                 class="w-full h-full object-cover grayscale" alt="Techlite Drip">
        </div>
        <div class="relative z-10 text-white text-center">
            <h1 class="text-6xl md:text-8xl font-black italic tracking-tighter mb-2">TECHLITE</h1>
            <p class="uppercase tracking-[0.5em] text-xs font-bold opacity-80">By Vicade x Black Hole</p>
        </div>
    </section>

    <section class="md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-white">
        <header class="mb-12">
            <span class="text-xs font-bold tracking-[0.3em] uppercase opacity-50 mb-2 block text-sage">Quality & Ease</span>
            <h2 class="text-4xl md:text-5xl font-black mb-4 leading-none uppercase">Student <br>Essentials.</h2>
            <p class="opacity-70 leading-relaxed text-sm max-w-md">
                Skip the campus stress. High-tier gear curated with surgical precision for the FUNAAB ecosystem. 🌸
            </p>
        </header>

        <div class="grid gap-6">
            <a href="https://wa.me/2348083470407" class="accent-border p-6 rounded-[2rem] flex justify-between items-center btn-hover transition-all duration-300 group">
                <div>
                    <h3 class="font-bold text-lg uppercase tracking-tight">Order via Kelly</h3>
                    <p class="text-[10px] opacity-60">Direct WhatsApp Link</p>
                </div>
                <span class="text-2xl group-hover:translate-x-2 transition-transform">→</span>
            </a>

            <a href="https://kelly-processor.onrender.com/gallery" class="accent-border p-6 rounded-[2rem] flex justify-between items-center btn-hover transition-all duration-300 group">
                <div>
                    <h3 class="font-bold text-lg uppercase tracking-tight">The Gallery</h3>
                    <p class="text-[10px] opacity-60">Browse Black Hole Visuals</p>
                </div>
                <span class="text-2xl group-hover:translate-x-2 transition-transform">→</span>
            </a>
        </div>

        <footer class="mt-12 pt-8 border-t-2 border-earth/5">
            <div class="grid grid-cols-2 gap-y-4 gap-x-2 text-[9px] font-bold uppercase tracking-widest opacity-40">
                <div class="flex items-center gap-2">🛠️ 3rd Day Pickup</div>
                <div class="flex items-center gap-2">🏫 Motion Ground</div>
                <div class="flex items-center gap-2">💳 70% Deposit</div>
                <div class="flex items-center gap-2">🌌 Techlite Logic</div>
            </div>
        </footer>
    </section>
</body>
</html>
    `);
});

// 7. THE SENDER API: Python hits this to talk back
app.post('/send', async (req, res) => {
    const { jid, message } = req.body;
    try {
        await sock.sendMessage(jid, { text: message });
        res.status(200).json({ status: "Sent" });
    } catch (err) {
        console.error("❌ Send Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log('🌐 Node.js Gateway running on Port 3000');
    startFummsa();
});
