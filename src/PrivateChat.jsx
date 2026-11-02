import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import "./PrivateChat.css";

export default function PrivateChat({ user }) {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [memberError, setMemberError] = useState("");

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const myId = user?.id;

  const getMemberName = (member) =>
    member?.display_name?.trim() ||
    (member?.username ? `@${member.username}` : "Realm Member");

  const getInitial = (member) =>
    getMemberName(member).replace("@", "").charAt(0).toUpperCase() || "M";

  // LOAD UNREAD MESSAGE COUNTS
  const loadUnreadCounts = useCallback(async () => {
    if (!myId) return;

    const { data: conversations, error: conversationError } =
      await supabase
        .from("chat_conversations")
        .select("id, user_one, user_two")
        .or(`user_one.eq.${myId},user_two.eq.${myId}`);

    if (conversationError || !conversations?.length) {
      setUnreadCounts({});
      return;
    }

    const conversationIds = conversations.map((item) => item.id);

    const { data: unreadMessages, error: unreadError } = await supabase
      .from("chat_messages")
      .select("conversation_id")
      .in("conversation_id", conversationIds)
      .neq("sender_id", myId)
      .is("read_at", null);

    if (unreadError) {
      console.error("Unread count error:", unreadError);
      return;
    }

    const counts = {};

    conversations.forEach((item) => {
      const otherMember =
        item.user_one === myId ? item.user_two : item.user_one;

      counts[otherMember] = 0;
    });

    (unreadMessages || []).forEach((message) => {
      const currentConversation = conversations.find(
        (item) => item.id === message.conversation_id
      );

      if (!currentConversation) return;

      const otherMember =
        currentConversation.user_one === myId
          ? currentConversation.user_two
          : currentConversation.user_one;

      counts[otherMember] = (counts[otherMember] || 0) + 1;
    });

    setUnreadCounts(counts);
  }, [myId]);

  // LOAD MEMBERS
  useEffect(() => {
    let active = true;

    async function loadMembers() {
      setLoadingMembers(true);
      setMemberError("");

      const { data, error: queryError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .neq("id", myId)
        .order("username", { ascending: true })
        .limit(100);

      if (!active) return;

      if (queryError) {
        setMemberError("Couldn't load members. Please refresh and try again.");
      } else {
        setMembers(data || []);
      }

      setLoadingMembers(false);
    }

    if (myId) loadMembers();

    return () => {
      active = false;
    };
  }, [myId]);

  // INITIAL UNREAD COUNTS + REALTIME UPDATES
  useEffect(() => {
    if (!myId) return;

    loadUnreadCounts();

    const channel = supabase
      .channel(`unread-counts-${myId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          loadUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId, loadUnreadCounts]);

  // MARK CONVERSATION AS READ
  const markConversationRead = useCallback(
    async (conversationId) => {
      if (!conversationId) return;

      const { error: readError } = await supabase.rpc(
        "mark_conversation_read",
        {
          target_conversation_id: conversationId,
        }
      );

      if (readError) {
        console.error("Mark as read failed:", readError);
        return;
      }

      await loadUnreadCounts();
    },
    [loadUnreadCounts]
  );

  // OPEN OR CREATE CONVERSATION
  const openConversation = useCallback(
    async (member) => {
      if (!myId || !member?.id) return;

      setSelectedMember(member);
      setConversation(null);
      setMessages([]);
      setDraft("");
      setError("");
      setLoadingChat(true);

      try {
        const [userOne, userTwo] =
          myId < member.id ? [myId, member.id] : [member.id, myId];

        let { data: existing, error: lookupError } = await supabase
          .from("chat_conversations")
          .select("id, user_one, user_two")
          .eq("user_one", userOne)
          .eq("user_two", userTwo)
          .maybeSingle();

        if (lookupError) throw lookupError;

        if (!existing) {
          const { data: created, error: createError } = await supabase
            .from("chat_conversations")
            .insert({
              user_one: userOne,
              user_two: userTwo,
            })
            .select("id, user_one, user_two")
            .single();

          if (createError) {
            const { data: retry, error: retryError } = await supabase
              .from("chat_conversations")
              .select("id, user_one, user_two")
              .eq("user_one", userOne)
              .eq("user_two", userTwo)
              .maybeSingle();

            if (retryError || !retry) throw createError;
            existing = retry;
          } else {
            existing = created;
          }
        }

        setConversation(existing);
      } catch (err) {
        console.error("Opening conversation failed:", err);
        setError(
          "Couldn't open this conversation. Check your database policies and try again."
        );
      } finally {
        setLoadingChat(false);
      }
    },
    [myId]
  );

  // LOAD MESSAGES + MARK AS READ
  useEffect(() => {
    if (!conversation?.id || !myId) return;

    let active = true;

    async function loadMessages() {
      setError("");

      await markConversationRead(conversation.id);

      const { data, error: queryError } = await supabase
        .from("chat_messages")
        .select("id, conversation_id, sender_id, content, created_at, read_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!active) return;

      if (queryError) {
        setError("Couldn't load messages. Please try again.");
        return;
      }

      setMessages(data || []);
    }

    loadMessages();

    const channel = supabase
      .channel(`private-chat-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        async (payload) => {
          if (!active) return;

          const incoming = payload.new;

          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) {
              return current;
            }

            return [...current, incoming].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          });

          if (incoming.sender_id !== myId) {
            await markConversationRead(conversation.id);
          } else {
            loadUnreadCounts();
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, myId, markConversationRead, loadUnreadCounts]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // SEND MESSAGE
  async function sendMessage(event) {
    event.preventDefault();

    const content = draft.trim();

    if (!content || !conversation || sending) return;

    if (content.length > 4000) {
      setError("Messages must be 4,000 characters or fewer.");
      return;
    }

    setSending(true);
    setError("");

    const previousDraft = draft;

    try {
      const { data, error: sendError } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: myId,
          content,
        })
        .select(
          "id, conversation_id, sender_id, content, created_at, read_at"
        )
        .single();

      if (sendError) throw sendError;

      setMessages((current) =>
        current.some((message) => message.id === data.id)
          ? current
          : [...current, data].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            )
      );

      setDraft("");
      inputRef.current?.focus();
      loadUnreadCounts();
    } catch (err) {
      console.error("Sending message failed:", err);
      setDraft(previousDraft);
      setError("Message couldn't be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const filteredMembers = members.filter((member) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      getMemberName(member).toLowerCase().includes(query) ||
      (member.username || "").toLowerCase().includes(query)
    );
  });

  function formatTime(value) {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDay(value) {
    const date = new Date(value);
    const today = new Date();
    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "TODAY";
    if (date.toDateString() === yesterday.toDateString()) return "YESTERDAY";

    return date
      .toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();
  }

  let lastDay = "";

  return (
    <section className="private-chat">
      <header className="private-chat-heading">
        <div>
          <p className="private-chat-eyebrow">
            SHADOW REALM / CONNECTIONS
          </p>

          <h1>
            Private <span>Chat.</span>
          </h1>

          <p className="private-chat-subtitle">
            A quieter space for one-to-one conversations.
          </p>
        </div>

        <div className="private-chat-status">
          <span />
          MEMBER SPACE
        </div>
      </header>

      <div className="private-chat-window">
        <aside className="private-chat-members">
          <div className="private-chat-list-heading">
            <div>
              <span className="private-chat-section-label">
                DIRECT MESSAGES
              </span>
              <h2>Connections</h2>
            </div>

            <span className="private-chat-count">{members.length}</span>
          </div>

          <label className="private-chat-search">
            <span>⌕</span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a member..."
              aria-label="Search members"
            />
          </label>

          <div className="private-chat-member-list">
            {loadingMembers ? (
              <div className="private-chat-empty-small">
                Loading members...
              </div>
            ) : memberError ? (
              <div className="private-chat-empty-small" role="alert">
                {memberError}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="private-chat-empty-small">
                {members.length === 0
                  ? "No other members yet."
                  : "No matching members found."}
              </div>
            ) : (
              filteredMembers.map((member) => {
                const unread = unreadCounts[member.id] || 0;

                return (
                  <button
                    type="button"
                    key={member.id}
                    className={
                      selectedMember?.id === member.id
                        ? "private-chat-member active"
                        : "private-chat-member"
                    }
                    onClick={() => openConversation(member)}
                  >
                    <span className="private-chat-avatar">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" />
                      ) : (
                        getInitial(member)
                      )}

                      <i />
                    </span>

                    <span className="private-chat-member-info">
                      <strong>{getMemberName(member)}</strong>
                      <small>
                        {member.username
                          ? `@${member.username}`
                          : "Realm member"}
                      </small>
                    </span>

                    {unread > 0 && (
                      <span className="private-chat-unread-badge">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}

                    <span className="private-chat-member-arrow">↗</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="private-chat-list-footer">
            ◈ MEMBER-ONLY SPACE
          </div>
        </aside>

        <main className="private-chat-conversation">
          {!selectedMember ? (
            <div className="private-chat-welcome">
              <div className="private-chat-welcome-symbol">◉</div>

              <p className="private-chat-eyebrow">
                YOUR PRIVATE CHANNEL
              </p>

              <h2>
                Make a <span>connection.</span>
              </h2>

              <p>
                Choose a member from your connections to start a conversation.
              </p>

              <div className="private-chat-encryption-note">
                <span>◇</span>
                ACCESS CONTROLLED MESSAGING
              </div>
            </div>
          ) : (
            <>
              <header className="private-chat-conversation-header">
                <div className="private-chat-selected-avatar">
                  {selectedMember.avatar_url ? (
                    <img src={selectedMember.avatar_url} alt="" />
                  ) : (
                    getInitial(selectedMember)
                  )}
                </div>

                <div className="private-chat-selected-info">
                  <strong>{getMemberName(selectedMember)}</strong>

                  <span>
                    {selectedMember.username
                      ? `@${selectedMember.username}`
                      : "SHADOW REALM MEMBER"}
                  </span>
                </div>

                <div className="private-chat-secure-label">
                  <span>◇</span> PRIVATE
                </div>
              </header>

              <div
                className="private-chat-messages"
                aria-live="polite"
                aria-label="Conversation messages"
              >
                {loadingChat ? (
                  <div className="private-chat-message-empty">
                    Opening private channel...
                  </div>
                ) : error && !conversation ? (
                  <div className="private-chat-message-empty" role="alert">
                    {error}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="private-chat-message-empty">
                    <span>✳</span>
                    <strong>The beginning of a conversation.</strong>
                    <p>Send the first message to start talking.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const day = formatDay(message.created_at);
                    const showDay = day !== lastDay;

                    lastDay = day;

                    const mine = message.sender_id === myId;

                    return (
                      <div key={message.id}>
                        {showDay && (
                          <div className="private-chat-day-divider">
                            <span>{day}</span>
                          </div>
                        )}

                        <div
                          className={
                            mine
                              ? "private-chat-message-row mine"
                              : "private-chat-message-row"
                          }
                        >
                          <div className="private-chat-message">
                            <p>{message.content}</p>

                            <time dateTime={message.created_at}>
                              {formatTime(message.created_at)}
                              {mine ? " · SENT" : ""}
                            </time>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={bottomRef} />
              </div>

              {error && conversation && (
                <p className="private-chat-error" role="alert">
                  {error}
                </p>
              )}

              <form className="private-chat-composer" onSubmit={sendMessage}>
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Write a message..."
                  aria-label="Write a message"
                  maxLength={4000}
                  rows={1}
                  disabled={loadingChat || !conversation}
                />

                <div className="private-chat-composer-bottom">
                  <span>ENTER TO SEND · SHIFT + ENTER FOR NEW LINE</span>

                  <button
                    type="submit"
                    disabled={
                      !draft.trim() ||
                      sending ||
                      loadingChat ||
                      !conversation
                    }
                  >
                    {sending ? "Sending..." : "Send ↗"}
                  </button>
                </div>
              </form>
            </>
          )}
        </main>
      </div>

      <footer className="private-chat-footnote">
        <span>PROJECT X / PRIVATE COMMUNICATION</span>
        <span>MESSAGES ARE STORED IN YOUR DATABASE</span>
      </footer>
    </section>
  );
}