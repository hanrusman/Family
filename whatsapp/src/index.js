const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const { parseCommand } = require('./commandParser');
const { ApiClient } = require('./apiClient');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN || '';
const ALLOWED_NUMBERS = (process.env.ALLOWED_NUMBERS || '').split(',').filter(Boolean);

const logger = pino({ level: 'warn' });
const apiClient = new ApiClient(API_URL, API_TOKEN);

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(
    process.env.SESSION_PATH || './session'
  );

  const sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Scan de QR-code met WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('Verbinding verbroken, opnieuw verbinden...');
        setTimeout(startBot, 3000);
      } else {
        console.log('Uitgelogd uit WhatsApp. Verwijder de sessie en scan opnieuw.');
      }
    }

    if (connection === 'open') {
      console.log('✅ Verbonden met WhatsApp');
      setupMorningBriefing(sock);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;

      const sender = msg.key.remoteJid;
      const senderNumber = sender?.split('@')[0];

      // Only respond to allowed numbers
      if (ALLOWED_NUMBERS.length > 0 && !ALLOWED_NUMBERS.includes(senderNumber)) {
        continue;
      }

      const text = msg.message.conversation ||
        msg.message.extendedTextMessage?.text || '';

      if (!text.trim()) continue;

      console.log(`📩 Bericht van ${senderNumber}: ${text}`);

      try {
        const response = await handleMessage(text.trim());
        if (response) {
          await sock.sendMessage(sender, { text: response });
        }
      } catch (error) {
        console.error('Fout bij verwerken bericht:', error);
        await sock.sendMessage(sender, {
          text: '❌ Er ging iets mis bij het verwerken van je bericht.',
        });
      }
    }
  });
}

async function handleMessage(text) {
  const command = parseCommand(text);

  switch (command.type) {
    case 'agenda': {
      const events = await apiClient.getEvents(command.date);
      if (events.length === 0) return `📅 Geen afspraken voor ${command.dateLabel}.`;
      let response = `📅 Agenda voor ${command.dateLabel}:\n\n`;
      for (const event of events) {
        const time = event.all_day ? 'Hele dag' : `${event.start_time.slice(11, 16)}`;
        response += `• ${time} — ${event.title}\n`;
      }
      return response;
    }

    case 'add_event': {
      await apiClient.createEvent(command.event);
      return `✅ Event "${command.event.title}" toegevoegd!`;
    }

    case 'shopping_add': {
      await apiClient.addShoppingItems(command.items);
      return `🛒 ${command.items.length} item(s) toegevoegd aan boodschappenlijst!`;
    }

    case 'shopping_list': {
      const data = await apiClient.getShoppingList();
      if (data.items.length === 0) return '🛒 Boodschappenlijst is leeg.';
      let response = '🛒 Boodschappenlijst:\n\n';
      for (const item of data.items) {
        response += `${item.checked ? '✅' : '⬜'} ${item.name}\n`;
      }
      return response;
    }

    case 'meal_set': {
      await apiClient.setMeal(command.meal);
      return `🍽️ ${command.meal.title} ingesteld voor ${command.dateLabel}!`;
    }

    case 'chores_status': {
      const chores = await apiClient.getChores(command.date);
      if (chores.length === 0) return '✅ Geen klusjes voor vandaag.';
      let response = '📋 Klusjes vandaag:\n\n';
      for (const chore of chores) {
        response += `${chore.completed ? '✅' : '⬜'} ${chore.icon} ${chore.title}`;
        if (chore.member_name) response += ` (${chore.member_name})`;
        response += '\n';
      }
      const done = chores.filter((c) => c.completed).length;
      response += `\n${done}/${chores.length} gedaan`;
      return response;
    }

    case 'help':
      return `📱 *Familiekalender Bot*\n\n` +
        `Beschikbare commando's:\n` +
        `• *agenda vandaag/morgen* — Toon agenda\n` +
        `• *voeg toe: [titel] [tijd] [dag]* — Event toevoegen\n` +
        `• *boodschappen: melk, brood* — Items toevoegen\n` +
        `• *boodschappenlijst* — Toon lijst\n` +
        `• *menu [dag]: [gerecht]* — Maaltijd instellen\n` +
        `• *klusjes vandaag* — Klusjes-status\n` +
        `• *help* — Dit overzicht`;

    case 'unknown':
    default:
      return `🤔 Ik begrijp "${text}" niet. Stuur *help* voor een overzicht van commando's.`;
  }
}

function setupMorningBriefing(sock) {
  // Morning briefing at 7:00
  cron.schedule('0 7 * * *', async () => {
    if (ALLOWED_NUMBERS.length === 0) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const events = await apiClient.getEvents(today);
      const chores = await apiClient.getChores(today);
      const meals = await apiClient.getMeals(today);

      let briefing = `☀️ *Goedemorgen! Overzicht voor vandaag:*\n\n`;

      // Events
      if (events.length > 0) {
        briefing += '📅 *Agenda:*\n';
        for (const event of events) {
          const time = event.all_day ? 'Hele dag' : event.start_time.slice(11, 16);
          briefing += `• ${time} — ${event.title}\n`;
        }
        briefing += '\n';
      }

      // Dinner
      const dinner = meals.find((m) => m.meal_type === 'dinner');
      if (dinner) {
        briefing += `🍽️ *Vanavond:* ${dinner.title}\n\n`;
      }

      // Chores
      if (chores.length > 0) {
        briefing += `📋 *Klusjes:* ${chores.length} ingepland\n`;
      }

      for (const number of ALLOWED_NUMBERS) {
        const jid = `${number}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: briefing });
      }
    } catch (error) {
      console.error('Fout bij ochtend-briefing:', error);
    }
  });
}

// Start
console.log('🚀 Familiekalender WhatsApp Bot opstarten...');
console.log(`   API: ${API_URL}`);
console.log(`   Toegestane nummers: ${ALLOWED_NUMBERS.length > 0 ? ALLOWED_NUMBERS.join(', ') : 'alle'}`);
startBot().catch(console.error);
