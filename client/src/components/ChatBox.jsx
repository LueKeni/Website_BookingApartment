import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';
import { getSocket } from '../services/socket.js';
import ChatWindow from './ChatWindow.jsx';

const ChatBox = ({ apartmentId, agentId, agentName }) => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canChat = useMemo(() => {
    return isAuthenticated && user?.role === 'USER' && apartmentId && agentId;
  }, [isAuthenticated, user?.role, apartmentId, agentId]);

  useEffect(() => {
    if (!canChat || !conversation?._id) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      return;
    }

    socket.emit('join_conversation', { conversationId: conversation._id });

    const onReceive = (message) => {
      if (message.conversationId !== conversation._id) {
        return;
      }
      setMessages((prev) => [...prev, message]);
    };

    socket.on('receive_message', onReceive);

    return () => {
      socket.off('receive_message', onReceive);
    };
  }, [canChat, conversation?._id]);

  const openChat = async () => {
    try {
      setLoading(true);
      setError('');
      setIsOpen(true);

      const startResponse = await api.post('/chats/conversations/start', {
        apartmentId,
        agentId
      });

      const nextConversation = startResponse?.data?.data;
      setConversation(nextConversation);

      const messagesResponse = await api.get(`/chats/conversations/${nextConversation._id}/messages`, {
        params: { page: 1, limit: 30 }
      });

      setMessages(messagesResponse?.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot open chat');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || !conversation?._id) {
      return;
    }

    try {
      setText('');
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('send_message', { conversationId: conversation._id, text: value });
      } else {
        const response = await api.post(`/chats/conversations/${conversation._id}/messages`, { text: value });
        const created = response?.data?.data;
        if (created) {
          setMessages((prev) => [...prev, created]);
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot send message');
    }
  };

  if (!canChat) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)]">
      {isOpen ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">Chat with {agentName || 'Agent'}</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold text-slate-700"
            >
              Close
            </button>
          </div>

          {loading ? (
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <>
              {error && <p className="mb-2 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">{error}</p>}
              <ChatWindow messages={messages} currentUserId={user?.id} />
              <form onSubmit={sendMessage} className="mt-2 flex gap-2">
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Type your message"
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <button type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={openChat}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-xl"
        >
          Chat with Agent
        </button>
      )}
    </div>
  );
};

export default ChatBox;
