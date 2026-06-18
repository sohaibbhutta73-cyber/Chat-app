require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());

// ── Supabase ────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
console.log('✅ Supabase Connected');

// ── Groq AI ─────────────────────────────────────────────────
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});
console.log('✅ Groq AI Ready');

const SYSTEM_PROMPT = `You are a helpful AI assistant for our organization.
You are friendly, professional, and always try to help users.

About our organization:
- We provide excellent customer support
- Our working hours are 9 AM to 6 PM
- For urgent issues, users can contact admin directly
- We value customer satisfaction above everything

Your behavior rules:
- Always greet users warmly
- Keep responses short and clear (max 3-4 sentences)
- If you cannot answer something, say "Let me connect you with our admin"
- Reply in the same language the user writes in
- Never make up information you do not know`;

let chatHistories = {};
let aiEnabledUsers = {};

// ── AI Reply using Groq ─────────────────────────────────────
async function getAIReply(username, userMessage) {
  try {
    if (!chatHistories[username]) chatHistories[username] = [];

    chatHistories[username].push({
      role: 'user',
      content: userMessage
    });

    if (chatHistories[username].length > 20) {
      chatHistories[username] = chatHistories[username].slice(-20);
    }

    console.log(`🤖 Sending to Groq for user: ${username}`);

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chatHistories[username]
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    const aiReply = response.choices[0]?.message?.content || "I could not generate a response.";

    chatHistories[username].push({
      role: 'assistant',
      content: aiReply
    });

    console.log(`✅ Groq replied to ${username}: ${aiReply.slice(0, 50)}...`);
    return aiReply;

  } catch (err) {
    console.error('❌ Groq AI Error:', err.message);
    return "I am sorry, I could not process that right now. Please try again!";
  }
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.CLIENT_URL
    ].filter(Boolean)
  }
});

const ADMIN_PASSWORD = 'admin123';
let onlineUsers = {};

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('join', async ({ username, password }) => {
    const isAdmin = password === ADMIN_PASSWORD;
    const { data: dbUser } = await supabase
      .from('users').select('*').eq('username', username).single();
    const isPreCreated = dbUser &&
      (dbUser.password === password || dbUser.password === '');

    if (!isAdmin && !isPreCreated && password !== '') {
      socket.emit('join_error', 'Invalid credentials.');
      return;
    }

    socket.username = username;
    socket.isAdmin  = isAdmin;
    onlineUsers[username] = { socketId: socket.id, isAdmin };

    if (isAdmin) {
      socket.emit('joined', { isAdmin: true });
      socket.emit('update_users',
        Object.keys(onlineUsers).filter(u => !onlineUsers[u].isAdmin)
      );
      const { data: rooms } = await supabase.from('rooms').select('*');
      const roomsObj = {};
      if (rooms) rooms.forEach(r => { roomsObj[r.name] = { members: r.members || [] }; });
      socket.emit('update_rooms', roomsObj);
      const { data: users } = await supabase.from('users').select('username');
      socket.emit('update_created_users', users ? users.map(u => u.username) : []);

      // Load AI settings from DB
      const { data: allUsers } = await supabase
        .from('users').select('username, ai_enabled');
      if (allUsers) {
        allUsers.forEach(u => {
          if (u.ai_enabled) aiEnabledUsers[u.username] = true;
        });
      }
      socket.emit('update_ai_users', aiEnabledUsers);

    } else {
      socket.emit('joined', { isAdmin: false });
      Object.keys(onlineUsers).forEach(u => {
        if (onlineUsers[u].isAdmin) {
          io.to(onlineUsers[u].socketId).emit('update_users',
            Object.keys(onlineUsers).filter(u => !onlineUsers[u].isAdmin)
          );
        }
      });
      const adminUser = Object.keys(onlineUsers).find(u => onlineUsers[u].isAdmin);
      if (adminUser) {
        const { data: history } = await supabase
          .from('messages').select('*').eq('type', 'private')
          .or(`from_user.eq.${username},to_user.eq.${username}`)
          .order('created_at', { ascending: true });
        const mapped = (history || []).map(m => ({ ...m, from: m.from_user, to: m.to_user }));
        socket.emit('load_messages', mapped);
      }
      const { data: rooms } = await supabase.from('rooms').select('*');
      const roomsObj = {};
      if (rooms) rooms.forEach(r => { roomsObj[r.name] = { members: r.members || [] }; });
      socket.emit('update_rooms', roomsObj);

      // Load this user's AI setting from DB
      const { data: userRecord } = await supabase
        .from('users').select('ai_enabled').eq('username', username).single();
      const aiEnabled = userRecord?.ai_enabled || false;
      aiEnabledUsers[username] = aiEnabled;
      socket.emit('ai_status', { enabled: aiEnabled });
    }
  });

  socket.on('toggle_ai', async ({ targetUser, enabled }) => {
    if (!socket.isAdmin) return;
    aiEnabledUsers[targetUser] = enabled;

    await supabase.from('users')
      .update({ ai_enabled: enabled })
      .eq('username', targetUser);

    const userSocket = onlineUsers[targetUser];
    if (userSocket) {
      io.to(userSocket.socketId).emit('ai_status', { enabled });
      if (enabled) {
        getAIReply(targetUser, 'Hello, I just joined the chat').then(reply => {
          const aiMsg = {
            id: Date.now() + '_ai',
            from: '🤖 AI Assistant',
            from_user: '🤖 AI Assistant',
            text: reply,
            time: new Date().toLocaleTimeString(),
            status: 'delivered',
            type: 'private',
            isAI: true
          };
          io.to(userSocket.socketId).emit('receive_message', aiMsg);
          socket.emit('receive_message', aiMsg);
        });
      }
    }
    socket.emit('update_ai_users', aiEnabledUsers);
  });

  socket.on('create_user', async ({ newUsername, newPassword, newIsAdmin }) => {
    if (!socket.isAdmin) return;
    const { error } = await supabase.from('users').insert({
      username: newUsername,
      password: newIsAdmin ? ADMIN_PASSWORD : (newPassword || ''),
      is_admin: newIsAdmin || false,
      ai_enabled: false
    });
    if (error) { socket.emit('create_user_error', 'User already exists.'); return; }
    const { data: users } = await supabase.from('users').select('username');
    socket.emit('update_created_users', users ? users.map(u => u.username) : []);
    socket.emit('create_user_success', newUsername);
  });

  socket.on('create_room', async ({ roomName, members }) => {
    if (!socket.isAdmin) return;
    const { error } = await supabase.from('rooms').insert({
      name: roomName, members: members || []
    });
    if (error) { socket.emit('room_error', 'Room already exists.'); return; }
    const { data: rooms } = await supabase.from('rooms').select('*');
    const roomsObj = {};
    if (rooms) rooms.forEach(r => { roomsObj[r.name] = { members: r.members || [] }; });
    io.emit('update_rooms', roomsObj);
  });

  socket.on('join_room', async (roomName) => {
    socket.join(roomName);
    socket.currentRoom = roomName;
    const { data: room } = await supabase
      .from('rooms').select('members').eq('name', roomName).single();
    if (room) {
      const members = room.members || [];
      if (!members.includes(socket.username)) {
        members.push(socket.username);
        await supabase.from('rooms').update({ members }).eq('name', roomName);
      }
    }
    const { data: history } = await supabase
      .from('messages').select('*')
      .eq('type', 'room').eq('room_name', roomName)
      .order('created_at', { ascending: true });
    const mapped = (history || []).map(m => ({ ...m, from: m.from_user }));
    socket.emit('load_room_messages', mapped);
    const { data: rooms } = await supabase.from('rooms').select('*');
    const roomsObj = {};
    if (rooms) rooms.forEach(r => { roomsObj[r.name] = { members: r.members || [] }; });
    io.emit('update_rooms', roomsObj);
  });

  socket.on('room_message', async ({ roomName, text }) => {
    const msgData = {
      id: Date.now() + '_' + Math.random(),
      from_user: socket.username,
      room_name: roomName, text,
      time: new Date().toLocaleTimeString(),
      type: 'room'
    };
    await supabase.from('messages').insert(msgData);
    io.to(roomName).emit('receive_room_message', { ...msgData, from: msgData.from_user });
  });

  socket.on('private_message', async ({ toUser, text }) => {
    const fromUser = socket.username;
    let actualToUser = toUser;
    if (toUser === 'admin_target') {
      actualToUser = Object.keys(onlineUsers).find(u => onlineUsers[u].isAdmin);
      if (!actualToUser) return;
    }
    const msgId = Date.now() + '_' + Math.random();
    const msgData = {
      id: msgId, from_user: fromUser, to_user: actualToUser,
      text, time: new Date().toLocaleTimeString(),
      status: 'sent', type: 'private'
    };
    await supabase.from('messages').insert(msgData);
    const outMsg = { ...msgData, from: fromUser, to: actualToUser };
    socket.emit('receive_message', { ...outMsg });
    const recipient = onlineUsers[actualToUser];
    if (recipient) {
      io.to(recipient.socketId).emit('receive_message', { ...outMsg, status: 'delivered' });
      socket.emit('message_status', { id: msgId, status: 'delivered' });
      await supabase.from('messages').update({ status: 'delivered' }).eq('id', msgId);
    }

    // ── Groq AI Auto Reply ────────────────────────────────
    if (aiEnabledUsers[fromUser] && !socket.isAdmin) {
      socket.emit('ai_typing', true);
      setTimeout(async () => {
        const aiReply = await getAIReply(fromUser, text);
        socket.emit('ai_typing', false);
        const aiMsg = {
          id: Date.now() + '_ai',
          from: '🤖 AI Assistant',
          from_user: '🤖 AI Assistant',
          text: aiReply,
          time: new Date().toLocaleTimeString(),
          status: 'delivered',
          type: 'private',
          isAI: true
        };
        try {
          await supabase.from('messages').insert({
            id: aiMsg.id,
            from_user: '🤖 AI Assistant',
            to_user: fromUser,
            text: aiReply,
            time: aiMsg.time,
            status: 'delivered',
            type: 'private'
          });
        } catch(e) {
          console.error('AI msg save error:', e.message);
        }
        socket.emit('receive_message', aiMsg);
        Object.keys(onlineUsers).forEach(u => {
          if (onlineUsers[u].isAdmin) {
            io.to(onlineUsers[u].socketId).emit('receive_message', aiMsg);
          }
        });
      }, 1500);
    }
  });

  socket.on('messages_read', async ({ fromUser }) => {
    const toUser = socket.username;
    await supabase.from('messages')
      .update({ status: 'read' })
      .eq('from_user', fromUser).eq('to_user', toUser).eq('type', 'private');
    const sender = onlineUsers[fromUser];
    if (sender) io.to(sender.socketId).emit('messages_read', { by: toUser });
  });

  socket.on('load_chat', async (targetUser) => {
    const { data: history } = await supabase
      .from('messages').select('*').eq('type', 'private')
      .or(`and(from_user.eq.${socket.username},to_user.eq.${targetUser}),and(from_user.eq.${targetUser},to_user.eq.${socket.username})`)
      .order('created_at', { ascending: true });
    const mapped = (history || []).map(m => ({ ...m, from: m.from_user, to: m.to_user }));
    socket.emit('load_messages', mapped);
    socket.emit('trigger_read', { fromUser: targetUser });
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      delete onlineUsers[socket.username];
      Object.keys(onlineUsers).forEach(u => {
        if (onlineUsers[u].isAdmin) {
          io.to(onlineUsers[u].socketId).emit('update_users',
            Object.keys(onlineUsers).filter(u => !onlineUsers[u].isAdmin)
          );
        }
      });
    }
    console.log('Disconnected:', socket.id);
  });
});

server.listen(process.env.PORT || 5000, () =>
  console.log(`🚀 Server running on port ${process.env.PORT || 5000}`)
);