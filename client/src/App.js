import './App.css';
import { useState, useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";

const socket = io("https://chat-app-backend-cmgk.onrender.com");
const ADMIN_PASSWORD = "admin123";

function MessageBubble({ m, currentUser }) {
  const isMine = m.from === currentUser;
  const isAI = m.isAI || m.from === "🤖 AI Assistant";

  let ticks = null;
  if (isMine) {
    if (m.status === "read")
      ticks = <span style={{ color: "#34b7f1", fontSize: 12, marginLeft: 3 }}>✓✓</span>;
    else if (m.status === "delivered")
      ticks = <span style={{ color: "#aaa", fontSize: 12, marginLeft: 3 }}>✓✓</span>;
    else
      ticks = <span style={{ color: "#aaa", fontSize: 12, marginLeft: 3 }}>✓</span>;
  }

  return (
    <div className="msg-animate" style={{
      display: "flex",
      justifyContent: isMine ? "flex-end" : "flex-start",
      marginBottom: 12, padding: "0 4px"
    }}>
      {!isMine && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: isAI
            ? "linear-gradient(135deg, #9b59b6, #6c3483)"
            : "linear-gradient(135deg, #667eea, #764ba2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: "bold", fontSize: isAI ? 16 : 13,
          marginRight: 8, flexShrink: 0, alignSelf: "flex-end"
        }}>{isAI ? "🤖" : m.from?.[0]?.toUpperCase()}</div>
      )}
      <div style={{ maxWidth: "65%" }}>
        {!isMine && (
          <div style={{
            fontSize: 11, fontWeight: 600, marginBottom: 3, marginLeft: 2,
            color: isAI ? "#9b59b6" : "#667eea"
          }}>
            {isAI ? "🤖 AI Assistant" : m.from}
          </div>
        )}
        <div style={{
          padding: "10px 14px",
          borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isAI
            ? "linear-gradient(135deg, #9b59b6, #6c3483)"
            : isMine
              ? "linear-gradient(135deg, #1abc9c, #16a085)"
              : "white",
          color: isMine || isAI ? "white" : "#2c3e50",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          wordBreak: "break-word", lineHeight: 1.5
        }}>
          <p style={{ margin: 0, fontSize: 14 }}>{m.text}</p>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 5, gap: 2 }}>
            <span style={{ fontSize: 10, opacity: 0.65 }}>{m.time}</span>
            {ticks}
          </div>
        </div>
      </div>
      {isMine && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "linear-gradient(135deg, #1abc9c, #16a085)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: "bold", fontSize: 13,
          marginLeft: 8, flexShrink: 0, alignSelf: "flex-end"
        }}>{currentUser?.[0]?.toUpperCase()}</div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="msg-animate" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px", marginBottom: 12 }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%",
        background: "linear-gradient(135deg, #9b59b6, #6c3483)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
      }}>🤖</div>
      <div style={{
        background: "white", borderRadius: "18px 18px 18px 4px",
        padding: "10px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%", background: "#9b59b6",
              animation: `bounce 1.2s infinite ${i * 0.2}s`
            }}/>
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ label, icon, active, badge, onClick, sub }) {
  return (
    <div onClick={onClick} className="sidebar-item-animate" style={{
      padding: "11px 14px", borderRadius: 12, cursor: "pointer",
      marginBottom: 5, display: "flex", alignItems: "center", gap: 10,
      background: active ? "linear-gradient(135deg, #1abc9c, #16a085)" : "rgba(255,255,255,0.07)",
      transition: "all 0.2s ease",
      border: active ? "none" : "1px solid rgba(255,255,255,0.05)"
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: "white" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{sub}</div>}
      </div>
      {badge > 0 && (
        <span className="badge-pulse" style={{
          background: "#e74c3c", color: "white", borderRadius: "50%",
          width: 22, height: 22, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 11, fontWeight: "bold"
        }}>{badge}</span>
      )}
    </div>
  );
}

function ChatPanel({
  hasTarget, chatMode, selectedRoom, currentMsgs, username,
  roomMembers, isAdmin, selectedUser, roomEndRef, messagesEndRef,
  message, setMessage, handleKey, sendMessage, chatPlaceholder,
  aiTyping, aiEnabled, onToggleAI
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f0f2f5", minWidth: 0 }}>
      {!hasTarget ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{ fontSize: 56 }}>💬</div>
          <p style={{ color: "#95a5a6", fontSize: 17, fontWeight: 500 }}>Select a chat to get started</p>
          <p style={{ color: "#bdc3c7", fontSize: 13 }}>Choose a user or room from the sidebar</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{
            padding: "14px 24px", background: "white", borderBottom: "1px solid #eee",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: chatMode === "room"
                  ? "linear-gradient(135deg, #e67e22, #d35400)"
                  : "linear-gradient(135deg, #667eea, #764ba2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: 18
              }}>
                {chatMode === "room" ? "🏠" : (isAdmin ? selectedUser?.[0]?.toUpperCase() : "A")}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#2c3e50" }}>
                  {chatMode === "room" ? selectedRoom : isAdmin ? selectedUser : "Admin"}
                </div>
                <div style={{ fontSize: 11, color: "#27ae60" }}>
                  {chatMode === "room"
                    ? `${roomMembers.length} members: ${roomMembers.join(", ") || "none"}`
                    : aiEnabled ? "🤖 AI Assistant Active" : "● Online"}
                </div>
              </div>
            </div>

            {/* AI Toggle for Admin */}
            {isAdmin && chatMode === "private" && selectedUser && (
              <div onClick={onToggleAI} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px", borderRadius: 20, cursor: "pointer",
                background: aiEnabled ? "linear-gradient(135deg, #9b59b6, #6c3483)" : "#ecf0f1",
                transition: "all 0.3s ease"
              }}>
                <span style={{ fontSize: 16 }}>🤖</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: aiEnabled ? "white" : "#7f8c8d" }}>
                  AI {aiEnabled ? "ON" : "OFF"}
                </span>
                <div style={{
                  width: 36, height: 20, borderRadius: 10,
                  background: aiEnabled ? "rgba(255,255,255,0.3)" : "#bdc3c7",
                  position: "relative"
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%", background: "white",
                    position: "absolute", top: 2,
                    left: aiEnabled ? 18 : 2, transition: "all 0.3s"
                  }}/>
                </div>
              </div>
            )}

            {/* AI Status for User */}
            {!isAdmin && aiEnabled && (
              <div style={{
                padding: "6px 12px", borderRadius: 20,
                background: "linear-gradient(135deg, #9b59b6, #6c3483)",
                fontSize: 11, color: "white", fontWeight: 600
              }}>
                🤖 AI Assistant Active
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
            {currentMsgs.length === 0 && (
              <div style={{ textAlign: "center", marginTop: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>👋</div>
                <p style={{ color: "#bbb", fontSize: 14 }}>No messages yet. Say hello!</p>
              </div>
            )}
            {currentMsgs.map((m, i) => <MessageBubble key={i} m={m} currentUser={username} />)}
            {aiTyping && <TypingIndicator />}
            <div ref={chatMode === "room" ? roomEndRef : messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "12px 16px", background: "white",
            borderTop: "1px solid #eee", display: "flex", gap: 10, alignItems: "center"
          }}>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKey}
              placeholder={aiEnabled && !isAdmin ? "Chat with AI Assistant..." : chatPlaceholder}
              style={{
                flex: 1, padding: "12px 18px", borderRadius: 25,
                border: `1.5px solid ${aiEnabled && !isAdmin ? "#9b59b6" : "#e0e0e0"}`,
                fontSize: 14, outline: "none",
                background: "#fafafa", color: "#2c3e50"
              }}
            />
            <button onClick={sendMessage} style={{
              width: 46, height: 46, borderRadius: "50%", border: "none",
              background: aiEnabled && !isAdmin
                ? "linear-gradient(135deg, #9b59b6, #6c3483)"
                : "linear-gradient(135deg, #1abc9c, #16a085)",
              color: "white", fontSize: 20, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)", flexShrink: 0
            }}>➤</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [screen, setScreen]             = useState("login");
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [isAdmin, setIsAdmin]           = useState(false);
  const [message, setMessage]           = useState("");
  const [messages, setMessages]         = useState([]);
  const [users, setUsers]               = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activeTab, setActiveTab]       = useState("chats");
  const [chatRooms, setChatRooms]       = useState({});
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomMessages, setRoomMessages] = useState([]);
  const [newRoomName, setNewRoomName]   = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [newUsername, setNewUsername]         = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserIsAdmin, setNewUserIsAdmin]   = useState(false);
  const [createdUsers, setCreatedUsers] = useState([]);
  const [loginError, setLoginError]     = useState("");
  const [successMsg, setSuccessMsg]     = useState("");
  const [chatMode, setChatMode]         = useState("private");
  const [aiTyping, setAiTyping]         = useState(false);
  const [aiEnabledUsers, setAiEnabledUsers] = useState({});
  const [myAiEnabled, setMyAiEnabled]   = useState(false);

  const selectedUserRef = useRef(null);
  const usernameRef     = useRef("");
  const messagesEndRef  = useRef(null);
  const roomEndRef      = useRef(null);

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { roomEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [roomMessages]);

  useEffect(() => {
    socket.on("joined", ({ isAdmin }) => {
      setIsAdmin(isAdmin);
      setScreen("chat");
    });
    socket.on("join_error", setLoginError);
    socket.on("load_messages", setMessages);
    socket.on("load_room_messages", setRoomMessages);

    socket.on("receive_message", (data) => {
      setMessages(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
      const sel = selectedUserRef.current;
      const me  = usernameRef.current;
      if (data.from !== me && data.from !== "🤖 AI Assistant") {
        if (data.from !== sel)
          setUnreadCounts(prev => ({ ...prev, [data.from]: (prev[data.from] || 0) + 1 }));
        else
          socket.emit("messages_read", { fromUser: data.from });
      }
    });

    socket.on("receive_room_message", data =>
      setRoomMessages(prev => [...prev, data])
    );
    socket.on("message_status", ({ id, status }) =>
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m))
    );
    socket.on("messages_read", () =>
      setMessages(prev => prev.map(m =>
        m.from === usernameRef.current ? { ...m, status: "read" } : m
      ))
    );
    socket.on("update_users", setUsers);
    socket.on("update_rooms", setChatRooms);
    socket.on("update_created_users", setCreatedUsers);
    socket.on("update_ai_users", setAiEnabledUsers);
    socket.on("ai_status", ({ enabled }) => setMyAiEnabled(enabled));
    socket.on("ai_typing", (typing) => setAiTyping(typing));
    socket.on("trigger_read", ({ fromUser }) =>
      socket.emit("messages_read", { fromUser })
    );
    socket.on("create_user_success", name => {
      setSuccessMsg(`✅ "${name}" created!`);
      setNewUsername(""); setNewUserPassword(""); setNewUserIsAdmin(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    });
    socket.on("create_user_error", setLoginError);
    socket.on("room_error", setLoginError);
    return () => socket.off();
  }, []);

  const join = useCallback(() => {
    setLoginError("");
    if (username.trim()) {
      socket.emit("join", { username: username.trim(), password });
    }
  }, [username, password]);

  const logout = useCallback(() => {
    setScreen("login");
    setUsername("");
    setPassword("");
    setIsAdmin(false);
    setMessages([]);
    setUsers([]);
    setSelectedUser(null);
    setMyAiEnabled(false);
    setAiEnabledUsers({});
    window.location.reload();
  }, []);

  const selectUser = useCallback((user) => {
    setSelectedUser(user); setChatMode("private");
    setSelectedRoom(null); setMessages([]);
    setUnreadCounts(prev => ({ ...prev, [user]: 0 }));
    socket.emit("load_chat", user);
    socket.emit("messages_read", { fromUser: user });
  }, []);

  const selectRoom = useCallback((room) => {
    setSelectedRoom(room); setChatMode("room");
    setSelectedUser(null); setRoomMessages([]);
    socket.emit("join_room", room);
  }, []);

  const sendMessage = useCallback(() => {
    if (!message.trim()) return;
    if (chatMode === "room" && selectedRoom) {
      socket.emit("room_message", { roomName: selectedRoom, text: message });
    } else {
      const toUser = isAdmin ? selectedUser : "admin_target";
      if (!toUser) return;
      socket.emit("private_message", { toUser, text: message });
    }
    setMessage("");
  }, [message, chatMode, selectedRoom, isAdmin, selectedUser]);

  const handleKey = useCallback(e => {
    if (e.key === "Enter") sendMessage();
  }, [sendMessage]);

  const createRoom = useCallback(() => {
    if (!newRoomName.trim()) return;
    socket.emit("create_room", { roomName: newRoomName.trim(), members: selectedMembers });
    setNewRoomName(""); setSelectedMembers([]);
  }, [newRoomName, selectedMembers]);

  const toggleMember = useCallback(user =>
    setSelectedMembers(prev =>
      prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user]
    ), []);

  const createUser = useCallback(() => {
    if (!newUsername.trim()) return;
    socket.emit("create_user", {
      newUsername: newUsername.trim(),
      newPassword: newUserIsAdmin ? ADMIN_PASSWORD : newUserPassword.trim(),
      newIsAdmin: newUserIsAdmin
    });
  }, [newUsername, newUserPassword, newUserIsAdmin]);

  const toggleAI = useCallback(() => {
    if (!selectedUser) return;
    const newState = !aiEnabledUsers[selectedUser];
    socket.emit("toggle_ai", { targetUser: selectedUser, enabled: newState });
  }, [selectedUser, aiEnabledUsers]);

  const currentMsgs       = chatMode === "room" ? roomMessages : messages;
  const chatPlaceholder   = chatMode === "room" ? `Message #${selectedRoom}...` : isAdmin ? `Message ${selectedUser}...` : "Message admin...";
  const hasTarget         = chatMode === "room" ? !!selectedRoom : (isAdmin ? !!selectedUser : true);
  const roomMembers       = selectedRoom && chatRooms[selectedRoom] ? chatRooms[selectedRoom].members : [];
  const currentAiEnabled  = isAdmin ? (aiEnabledUsers[selectedUser] || false) : myAiEnabled;

  const sidebarStyle = {
    width: 280, flexShrink: 0, color: "white", display: "flex", flexDirection: "column",
    background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)"
  };

  const chatPanelProps = {
    hasTarget, chatMode, selectedRoom, currentMsgs, username,
    roomMembers, isAdmin, selectedUser, roomEndRef, messagesEndRef,
    message, setMessage, handleKey, sendMessage, chatPlaceholder,
    aiTyping, aiEnabled: currentAiEnabled, onToggleAI: toggleAI
  };

  // ── LOGIN ──────────────────────────────────────────────────
  if (screen === "login") return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
    }}>
      <div style={{
        background: "rgba(255,255,255,0.97)", padding: "44px 40px",
        borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.4)", width: 360
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 12px",
            background: "linear-gradient(135deg, #1abc9c, #16a085)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, boxShadow: "0 8px 20px rgba(26,188,156,0.4)"
          }}>💬</div>
          <h2 style={{ color: "#1a1a2e", fontWeight: 700, fontSize: 22 }}>Welcome Back</h2>
          <p style={{ color: "#95a5a6", fontSize: 13, marginTop: 4 }}>Sign in to continue to Chat App</p>
        </div>
        {loginError && (
          <div style={{
            background: "#fdecea", color: "#e74c3c", padding: "10px 14px",
            borderRadius: 10, marginBottom: 14, fontSize: 13, border: "1px solid #f5c6cb"
          }}>⚠️ {loginError}</div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, display: "block" }}>YOUR NAME</label>
          <input value={username} onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && join()} placeholder="e.g. Ali, Sara..."
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid #e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#2c3e50", background: "#fafafa" }}
          />
        </div>
        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, display: "block" }}>
            PASSWORD <span style={{ color: "#aaa", fontWeight: 400 }}>(admin only)</span>
          </label>
          <input value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && join()} placeholder="Leave blank to join as user"
            type="password"
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid #e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#2c3e50", background: "#fafafa" }}
          />
        </div>
        <button onClick={join} style={{
          width: "100%", padding: 14, borderRadius: 12, border: "none",
          background: "linear-gradient(135deg, #1abc9c, #16a085)",
          color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 6px 20px rgba(26,188,156,0.4)"
        }}>Join Chat →</button>
      </div>
    </div>
  );

  // ── ADMIN LAYOUT ───────────────────────────────────────────
  if (isAdmin) return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={sidebarStyle}>
        <div style={{ padding: "20px 16px 14px", background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg, #1abc9c, #16a085)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: 18
            }}>{username[0]?.toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{username}</div>
              <div style={{ fontSize: 11, background: "#1abc9c", borderRadius: 20, padding: "2px 8px", display: "inline-block", marginTop: 2 }}>🛡️ Admin</div>
            </div>
            <div onClick={logout} style={{ cursor: "pointer", fontSize: 18, opacity: 0.7 }} title="Logout">🚪</div>
          </div>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {[["chats","💬","Chats"],["rooms","🏠","Rooms"],["manage","⚙️","Manage"]].map(([key, icon, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              flex: 1, padding: "11px 4px", border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: activeTab === key ? 700 : 400,
              background: activeTab === key ? "rgba(26,188,156,0.2)" : "transparent",
              color: activeTab === key ? "#1abc9c" : "#7f8c8d",
              borderBottom: activeTab === key ? "2px solid #1abc9c" : "2px solid transparent"
            }}>{icon} {label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          {activeTab === "chats" && (
            <>
              <div style={{ fontSize: 11, color: "#7f8c8d", marginBottom: 10, padding: "0 4px" }}>{users.length} USER(S) ONLINE</div>
              {users.length === 0 && (
                <div style={{ textAlign: "center", padding: 20, color: "#555" }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>👥</div>
                  <div style={{ fontSize: 13 }}>No users online yet</div>
                </div>
              )}
              {users.map(user => (
                <div key={user} onClick={() => selectUser(user)} style={{
                  padding: "11px 14px", borderRadius: 12, cursor: "pointer", marginBottom: 5,
                  display: "flex", alignItems: "center", gap: 10,
                  background: selectedUser === user && chatMode === "private"
                    ? "linear-gradient(135deg, #1abc9c, #16a085)" : "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.05)"
                }}>
                  <span style={{ fontSize: 18 }}>👤</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "white" }}>{user}</div>
                    <div style={{ fontSize: 11, color: aiEnabledUsers[user] ? "#9b59b6" : "rgba(255,255,255,0.55)" }}>
                      {aiEnabledUsers[user] ? "🤖 AI Active" : "Online"}
                    </div>
                  </div>
                  {unreadCounts[user] > 0 && (
                    <span style={{
                      background: "#e74c3c", color: "white", borderRadius: "50%",
                      width: 22, height: 22, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 11, fontWeight: "bold"
                    }}>{unreadCounts[user]}</span>
                  )}
                </div>
              ))}
            </>
          )}

          {activeTab === "rooms" && (
            <>
              <div style={{ fontSize: 11, color: "#7f8c8d", marginBottom: 8 }}>CREATE ROOM</div>
              <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
                placeholder="Room name..."
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.07)", color: "white", fontSize: 13, marginBottom: 10, boxSizing: "border-box", outline: "none" }}
              />
              <div style={{ fontSize: 11, color: "#7f8c8d", marginBottom: 8 }}>ADD MEMBERS</div>
              {users.length === 0 && <div style={{ color: "#555", fontSize: 12, marginBottom: 10 }}>No online users to add</div>}
              {users.map(user => (
                <div key={user} onClick={() => toggleMember(user)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 4,
                  background: selectedMembers.includes(user) ? "rgba(26,188,156,0.2)" : "rgba(255,255,255,0.04)",
                  border: selectedMembers.includes(user) ? "1px solid #1abc9c" : "1px solid rgba(255,255,255,0.06)"
                }}>
                  <span style={{ fontSize: 16 }}>{selectedMembers.includes(user) ? "☑" : "☐"}</span>
                  <span style={{ fontSize: 13, color: "white" }}>👤 {user}</span>
                </div>
              ))}
              <button onClick={createRoom} style={{
                width: "100%", padding: 11, borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #1abc9c, #16a085)",
                color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
                marginTop: 10, marginBottom: 16
              }}>+ Create Room {selectedMembers.length > 0 ? `(${selectedMembers.length})` : ""}</button>
              {Object.keys(chatRooms).length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: "#7f8c8d", marginBottom: 8 }}>EXISTING ROOMS</div>
                  {Object.keys(chatRooms).map(room => (
                    <SidebarItem key={room} icon="🏠" label={room}
                      sub={`${chatRooms[room]?.members?.length || 0} members`}
                      active={selectedRoom === room && chatMode === "room"}
                      onClick={() => selectRoom(room)}
                    />
                  ))}
                </>
              )}
            </>
          )}

          {activeTab === "manage" && (
            <>
              {successMsg && <div style={{ background: "rgba(26,188,156,0.15)", color: "#1abc9c", padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 13, border: "1px solid #1abc9c" }}>{successMsg}</div>}
              {loginError && <div style={{ background: "rgba(231,76,60,0.15)", color: "#e74c3c", padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 13, border: "1px solid #e74c3c" }}>{loginError}</div>}
              <div style={{ fontSize: 11, color: "#7f8c8d", marginBottom: 10 }}>CREATE ACCOUNT</div>
              <input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                placeholder="Username"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.07)", color: "white", fontSize: 13, marginBottom: 8, boxSizing: "border-box", outline: "none" }}
              />
              <input value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)}
                placeholder="Password (optional)" type="password" disabled={newUserIsAdmin}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.07)", color: "white", fontSize: 13, marginBottom: 8, boxSizing: "border-box", outline: "none", opacity: newUserIsAdmin ? 0.4 : 1 }}
              />
              <div onClick={() => setNewUserIsAdmin(p => !p)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                borderRadius: 10, cursor: "pointer", marginBottom: 10,
                background: newUserIsAdmin ? "rgba(26,188,156,0.2)" : "rgba(255,255,255,0.05)",
                border: newUserIsAdmin ? "1px solid #1abc9c" : "1px solid rgba(255,255,255,0.08)"
              }}>
                <span style={{ fontSize: 18 }}>{newUserIsAdmin ? "☑" : "☐"}</span>
                <span style={{ fontSize: 13, color: "white" }}>🛡️ Create as Admin</span>
              </div>
              <button onClick={createUser} style={{
                width: "100%", padding: 11, borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #1abc9c, #16a085)",
                color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 16
              }}>+ Create Account</button>
              {createdUsers.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: "#7f8c8d", marginBottom: 8 }}>CREATED ACCOUNTS</div>
                  {createdUsers.map(u => (
                    <div key={u} style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 6, fontSize: 13, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }}>👤 {u}</div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
      <ChatPanel {...chatPanelProps} />
    </div>
  );

  // ── USER LAYOUT ────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={sidebarStyle}>
        <div style={{ padding: "20px 16px 14px", background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: 18
            }}>{username[0]?.toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{username}</div>
              <div style={{ fontSize: 11, color: myAiEnabled ? "#9b59b6" : "#27ae60" }}>
                {myAiEnabled ? "🤖 AI Mode Active" : "● Online"}
              </div>
            </div>
            <div onClick={logout} style={{ cursor: "pointer", fontSize: 18, opacity: 0.7 }} title="Logout">🚪</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          <div style={{ fontSize: 11, color: "#7f8c8d", marginBottom: 8, padding: "0 4px" }}>
            {myAiEnabled ? "🤖 AI ASSISTANT" : "DIRECT MESSAGE"}
          </div>
          <SidebarItem
            icon={myAiEnabled ? "🤖" : "🛡️"}
            label={myAiEnabled ? "AI Assistant" : "Admin"}
            sub={myAiEnabled ? "Powered by Gemini" : "Online"}
            active={chatMode === "private"}
            badge={unreadCounts["admin"] || 0}
            onClick={() => { setChatMode("private"); setSelectedRoom(null); }}
          />
          {Object.keys(chatRooms).length > 0 && (
            <>
              <div style={{ fontSize: 11, color: "#7f8c8d", margin: "14px 0 8px", padding: "0 4px" }}>GROUP ROOMS</div>
              {Object.keys(chatRooms).map(room => (
                <SidebarItem key={room} icon="🏠" label={room}
                  sub={`${chatRooms[room]?.members?.length || 0} members`}
                  active={selectedRoom === room && chatMode === "room"}
                  onClick={() => selectRoom(room)}
                />
              ))}
            </>
          )}
        </div>
      </div>
      <ChatPanel {...chatPanelProps} />
    </div>
  );
}