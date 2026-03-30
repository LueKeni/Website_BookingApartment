import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow.jsx';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';
import { getSocket } from '../services/socket.js';

const getUserId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return value._id || value.id || '';
};

const Inbox = () => {
  const { isAuthenticated, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchConversations = async () => {
    try {
      const response = await api.get('/chats/conversations');
      const next = response?.data?.data || [];
      setConversations(next);
      if (!selected && next.length > 0) {
        setSelected(next[0]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot load conversations');
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await api.get(`/chats/conversations/${conversationId}/messages`, {
        params: { page: 1, limit: 30 }
      });
      setMessages(response?.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot load messages');
    }
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role === 'ADMIN') {
      return;
    }

    const run = async () => {
      setLoading(true);
      await fetchConversations();
      setLoading(false);
    };

    run();
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    if (!selected?._id) {
      return;
    }

    fetchMessages(selected._id);

    const socket = getSocket();
    if (!socket) {
      return;
    }

    socket.emit('join_conversation', { conversationId: selected._id });

    const onReceive = (message) => {
      if (message.conversationId !== selected._id) {
        return;
      }

      const sender = message.senderId;
      setMessages((prev) => [...prev, message]);
      setConversations((prev) =>
        prev.map((item) =>
          item._id === selected._id
            ? {
                ...item,
                lastMessage: message.text,
                updatedAt: new Date().toISOString(),
                lastMessageMeta: {
                  senderId: getUserId(sender),
                  senderName: sender?.fullName || 'Unknown',
                  senderAvatar: sender?.avatar || '',
                  createdAt: message.createdAt || new Date().toISOString()
                }
              }
            : item
        )
      );
    };

    socket.on('receive_message', onReceive);

    return () => {
      socket.off('receive_message', onReceive);
    };
  }, [selected?._id]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  const sendMessage = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || !selected?._id) {
      return;
    }

    try {
      setText('');
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('send_message', { conversationId: selected._id, text: value });
      } else {
        const response = await api.post(`/chats/conversations/${selected._id}/messages`, { text: value });
        const created = response?.data?.data;
        if (created) {
          setMessages((prev) => [...prev, created]);
        }
      }
      await fetchConversations();
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot send message');
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg">
      <h1 className="text-2xl font-black text-slate-900 [font-family:'Space_Grotesk',sans-serif]">Inbox</h1>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      {loading ? (
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-slate-100" />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2 rounded-2xl border border-slate-200 p-3">
            {conversations.length === 0 ? (
              <p className="text-sm text-slate-600">No conversations yet.</p>
            ) : (
              conversations.map((item) => {
                const other = item.participants.find((p) => p._id !== user?.id);
                const apartmentTitle = item.apartmentId?.title || 'Apartment';
                const apartmentDistrict = item.apartmentId?.location?.district || '';
                const apartmentCity = item.apartmentId?.location?.city || '';
                const apartmentLocation = [apartmentDistrict, apartmentCity].filter(Boolean).join(', ');
                const lastSenderName = item.lastMessageMeta?.senderName || other?.fullName || 'Unknown';
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`w-full rounded-xl border px-3 py-2 text-left ${
                      selected?._id === item._id ? 'border-slate-900 bg-slate-100' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-900">{other?.fullName || 'Conversation'}</p>
                    <p className="text-xs font-semibold text-[#173f56]">Room: {apartmentTitle}</p>
                    {apartmentLocation && <p className="text-xs text-slate-500">{apartmentLocation}</p>}
                    <p className="mt-1 text-xs text-slate-600">From: {lastSenderName}</p>
                    <p className="text-xs text-slate-500">{item.lastMessage || 'No messages yet'}</p>
                    {item.unreadCount > 0 && (
                      <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        New {item.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-3">
            {selected ? (
              <>
                <div className="mb-2">
                  <p className="text-sm font-bold text-slate-900">{selected.apartmentId?.title || 'Apartment chat'}</p>
                  <p className="text-xs text-slate-600">
                    {selected.apartmentId?.location?.district || '-'}, {selected.apartmentId?.location?.city || '-'}
                  </p>
                  <p className="text-xs text-slate-600">
                    Sender: {selected.lastMessageMeta?.senderName || selected.participants.find((p) => p._id !== user?.id)?.fullName || 'Unknown'}
                  </p>
                </div>
                <ChatWindow messages={messages} currentUserId={user?.id} />
                <form onSubmit={sendMessage} className="mt-3 flex gap-2">
                  <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Type your message"
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                    Send
                  </button>
                </form>
              </>
            ) : (
              <p className="text-sm text-slate-600">Select a conversation to start messaging.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default Inbox;
