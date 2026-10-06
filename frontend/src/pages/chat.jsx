import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/header";
import { useApi } from "../services/api";
import "../styles/app.css";

const MessageTicks = ({ message }) => {
  if (message?.read_at) return <span className="message-ticks read" title="Read">✓✓</span>;
  if (message?.delivered_at) return <span className="message-ticks" title="Delivered">✓✓</span>;
  return <span className="message-ticks" title="Sent">✓</span>;
};

const safeDate = value => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const sameDay = (a, b) => {
  const da = safeDate(a), db = safeDate(b);
  return !!da && !!db && da.toDateString() === db.toDateString();
};

const dayLabel = value => {
  const d = safeDate(value);
  if (!d) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric"
  });
};

export default function Chat({ portal = "student" }) {
  const api = useApi();
  const location = useLocation();
  const navigate = useNavigate();

  const role = portal === "tutor" ? "tutor" : "student";
  const roleQuery = `?role=${role}`;

  const [conversations, setConversations] = useState([]);
  const [principal, setPrincipal] = useState(null);
  const [selected, setSelected] = useState(
    new URLSearchParams(location.search).get("conversation") || ""
  );
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const end = useRef(null);
  const inputRef = useRef(null);

  const loadConversations = async () => {
    try {
      const r = await api.get(`/chat/conversations${roleQuery}&archived=${showArchived}`);
      const list = Array.isArray(r?.data?.conversations) ? r.data.conversations : [];
      setConversations(list);
      setPrincipal(r?.data?.principal || null);

      setSelected(current => {
        if (current && list.some(c => c?.id === current)) return current;
        return list[0]?.id || "";
      });

      setError("");
    } catch (e) {
      console.error("Conversation load failed:", e);
      setConversations([]);
      setError(e?.response?.data?.message || e?.message || "Could not load conversations.");
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async () => {
    if (!selected) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    try {
      const r = await api.get(`/chat/conversations/${selected}/messages${roleQuery}`);
      setMessages(Array.isArray(r?.data?.messages) ? r.data.messages : []);
      setError("");
    } catch (e) {
      console.error("Message load failed:", e);
      setMessages([]);
      setError(e?.response?.data?.message || e?.message || "Could not load messages.");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadConversations();
    const timer = setInterval(loadConversations, 5000);
    return () => clearInterval(timer);
  }, [showArchived, portal]);

  useEffect(() => {
    if (!selected) return;
    setReplyTo(null);
    setEditing(null);
    loadMessages();
    const timer = setInterval(loadMessages, 2000);
    return () => clearInterval(timer);
  }, [selected, portal]);

  useEffect(() => {
    if (selected) {
      const target = role === "tutor" ? "/tutor/messages" : "/messages";
      navigate(`${target}?conversation=${selected}`, { replace: true });
    }
  }, [selected]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async e => {
    e.preventDefault();
    if (!selected || !body.trim()) return;

    const text = body.trim();
    setBody("");
    setError("");

    try {
      if (editing) {
        await api.patch(
          `/chat/conversations/${selected}/messages/${editing.id}${roleQuery}`,
          { body: text }
        );
        setEditing(null);
      } else {
        await api.post(
          `/chat/conversations/${selected}/messages${roleQuery}`,
          { body: text, reply_to_message_id: replyTo?.id || null }
        );
        setReplyTo(null);
      }

      await Promise.all([loadMessages(), loadConversations()]);
    } catch (e) {
      setBody(text);
      setError(e?.response?.data?.message || e?.message || "Could not send message.");
    }
  };

  const beginEdit = message => {
    setEditing(message);
    setReplyTo(null);
    setBody(message?.body || "");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const removeMessage = async message => {
    if (!window.confirm("Delete this message for both sides?")) return;
    try {
      await api.delete(`/chat/conversations/${selected}/messages/${message.id}${roleQuery}`);
      await Promise.all([loadMessages(), loadConversations()]);
    } catch (e) {
      setError(e?.response?.data?.message || "Could not delete message.");
    }
  };

  const preference = async values => {
    try {
      await api.patch(`/chat/conversations/${selected}${roleQuery}`, values);

      if (values.archived === true) {
        setSelected("");
        setMessages([]);
      }

      await loadConversations();
    } catch (e) {
      setError(e?.response?.data?.message || "Could not update conversation.");
    }
  };

  const active = Array.isArray(conversations)
    ? conversations.find(c => c?.id === selected)
    : null;

  const principalType = principal?.type || role;

  const otherName = active
    ? (principalType === "student" ? active.tutor_name : active.student_name)
    : "Conversation";

  const otherImage = active
    ? (principalType === "student" ? active.tutor_image : active.student_image)
    : null;

  const muted = active
    ? (role === "student" ? !!active.student_muted : !!active.tutor_muted)
    : false;

  const filtered = useMemo(() => {
    const list = Array.isArray(conversations) ? conversations : [];
    const query = conversationSearch.trim().toLowerCase();

    return list.filter(c => {
      const name = principalType === "student" ? c?.tutor_name : c?.student_name;
      return !query || String(name || "").toLowerCase().includes(query);
    });
  }, [conversations, conversationSearch, principalType]);

  return <>
    <Header portal={portal} />

    <main className="chat-wrap">
      {error && <div className="notice error" role="alert">{error}</div>}

      <div className="chat-shell">
        <aside className="conversation-list">
          <div className="chat-title">
            <span className="eyebrow">MESSAGES</span>

            <div className="conversation-heading">
              <h2>Conversations</h2>
              <button className="text-btn" onClick={() => setShowArchived(v => !v)}>
                {showArchived ? "Inbox" : "Archived"}
              </button>
            </div>

            <input
              className="conversation-search"
              value={conversationSearch}
              onChange={e => setConversationSearch(e.target.value)}
              placeholder="Search chats…"
            />
          </div>

          {loadingConversations && <div className="empty small">Loading conversations…</div>}

          {!loadingConversations && filtered.map(c => {
            const name = principalType === "student" ? c?.tutor_name : c?.student_name;
            const image = principalType === "student" ? c?.tutor_image : c?.student_image;
            const messageDate = safeDate(c?.last_message_created_at);

            return <button
              key={c.id}
              className={selected === c.id ? "active" : ""}
              onClick={() => setSelected(c.id)}
            >
              <div className="mini-avatar chat-avatar">
                {image ? <img src={image} alt="" /> : String(name || "?")[0]}
              </div>

              <div>
                <b>{name || "Tutorly user"}</b>
                <span>{c?.last_message_deleted_at ? "Message deleted" : c?.last_message || "Start the conversation"}</span>
                <small>
                  {c?.connected ? "Connected" : "Direct inquiry"}
                  {messageDate ? ` · ${messageDate.toLocaleDateString()}` : ""}
                </small>
              </div>

              {Number(c?.unread_count || 0) > 0 && <em>{c.unread_count}</em>}
            </button>;
          })}

          {!loadingConversations && !filtered.length && (
            <div className="empty small">
              {showArchived ? "No archived conversations." : "No conversations yet."}
            </div>
          )}
        </aside>

        <section className="message-panel">
          {active ? <>
            <header>
              <div className="mini-avatar chat-avatar">
                {otherImage ? <img src={otherImage} alt="" /> : String(otherName || "?")[0]}
              </div>

              <div className="chat-contact">
                <b>{otherName || "Tutorly user"}</b>
                <span>
                  {active.connected ? "Connected through Tutorly" : "Direct tutor inquiry"}
                  {role === "student" && safeDate(active.last_active_at)
                    ? ` · active ${safeDate(active.last_active_at).toLocaleString()}`
                    : ""}
                </span>
              </div>

              <div className="chat-actions">
                {role === "student" && (
                  <button
                    className="ghost tiny"
                    onClick={() => navigate(`/tutors/${active.tutor_id}`)}
                  >
                    View profile
                  </button>
                )}

                <button className="ghost tiny" onClick={() => preference({ muted: !muted })}>
                  {muted ? "Unmute" : "Mute"}
                </button>

                <button className="ghost tiny" onClick={() => preference({ archived: true })}>
                  Archive
                </button>
              </div>
            </header>

            <div className="message-stream">
              <div className="chat-safety-note">
                Use Tutorly chat for learning discussions and session planning.
                {" "}✓ sent · ✓✓ delivered · blue ✓✓ read.
              </div>

              {loadingMessages && <div className="empty small">Loading messages…</div>}

              {!loadingMessages && messages.map((m, i) => {
                const mine = m?.sender_type === principalType && m?.sender_id === principal?.id;
                const created = safeDate(m?.created_at);
                const previous = i > 0 ? messages[i - 1] : null;
                const showDay = i === 0 || !sameDay(previous?.created_at, m?.created_at);
                const canEdit =
                  mine &&
                  !m?.deleted_at &&
                  created &&
                  Date.now() - created.getTime() < 15 * 60 * 1000;

                return <div key={m?.id || `${i}-${m?.created_at}`} className="message-block">
                  {showDay && <div className="date-separator"><span>{dayLabel(m?.created_at)}</span></div>}

                  <div className={`message ${mine ? "mine" : "theirs"} ${m?.deleted_at ? "deleted" : ""}`}>
                    {m?.reply_to_message_id && (
                      <div className="reply-preview">
                        <b>{m?.reply_sender_type === principalType ? "You" : m?.reply_sender_type === "tutor" ? "Tutor" : "Student"}</b>
                        <span>{m?.reply_deleted_at ? "Message deleted" : m?.reply_body || ""}</span>
                      </div>
                    )}

                    <p>{m?.deleted_at ? <em>Message deleted</em> : m?.body || ""}</p>

                    <small>
                      {created ? created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      {m?.edited_at && !m?.deleted_at && <span> edited</span>}
                      {mine && <MessageTicks message={m} />}
                    </small>

                    {!m?.deleted_at && (
                      <div className="message-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyTo(m);
                            setEditing(null);
                            inputRef.current?.focus();
                          }}
                        >
                          Reply
                        </button>

                        {canEdit && <button type="button" onClick={() => beginEdit(m)}>Edit</button>}
                        {mine && <button type="button" onClick={() => removeMessage(m)}>Delete</button>}
                      </div>
                    )}
                  </div>
                </div>;
              })}

              {!loadingMessages && !messages.length && (
                <div className="chat-empty">
                  <b>Start the conversation</b>
                  <span>
                    {role === "student"
                      ? "Ask about the subject, learning plan, availability or teaching style."
                      : "A student opened this conversation. Reply when they send a question."}
                  </span>
                </div>
              )}

              <div ref={end} />
            </div>

            <form onSubmit={send} className="message-form-area">
              {(replyTo || editing) && (
                <div className="composer-context">
                  <div>
                    <b>{editing ? "Editing message" : `Replying to ${replyTo?.sender_type === principalType ? "yourself" : otherName}`}</b>
                    <span>{editing ? editing.body : replyTo?.body}</span>
                  </div>
                  <button type="button" onClick={() => {
                    setReplyTo(null);
                    setEditing(null);
                    setBody("");
                  }}>×</button>
                </div>
              )}

              <div className="message-form">
                <div className="message-input-wrap">
                  <input
                    ref={inputRef}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    maxLength={2000}
                    placeholder={`Message ${otherName || "tutor"}…`}
                  />
                  <small>{body.length}/2000</small>
                </div>

                <button className="primary" disabled={!body.trim()}>
                  {editing ? "Save" : "Send"}
                </button>
              </div>
            </form>
          </> : (
            <div className="no-chat-selected">
              <b>{loadingConversations ? "Loading conversation…" : "Select a conversation"}</b>
              <span>
                {role === "tutor"
                  ? "Student inquiries will appear here."
                  : "Your tutor conversations will appear here."}
              </span>
            </div>
          )}
        </section>
      </div>
    </main>
  </>;
}
