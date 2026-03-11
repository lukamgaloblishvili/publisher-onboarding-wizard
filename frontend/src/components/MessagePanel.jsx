import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../api/client";
import { Card } from "./Cards";
import { StatusPill } from "./StatusPill";

export function MessagePanel({
  title,
  entity,
  onSend,
  onUpload,
  uploadEnabled = false,
  syncAction,
  isAdmin = false
}) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const timelineRef = useRef(null);

  useEffect(() => {
    if (!timelineRef.current) {
      return;
    }
    timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
  }, [entity?.messages]);

  if (!entity) {
    return (
      <Card title={title}>
        <div className="empty-state">No linked external ticket yet.</div>
      </Card>
    );
  }

  async function handleSend(event) {
    event.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody && !file) {
      return;
    }
    setBusy(true);
    try {
      if (uploadEnabled && file && onUpload) {
        await onUpload(file, trimmedBody || "File uploaded from portal");
        setFile(null);
        event.target.reset();
      } else {
        await onSend(trimmedBody);
      }
      setBody("");
    } finally {
      setBusy(false);
    }
  }

  function messageAuthorLabel(message) {
    if (isAdmin) {
      return message.source;
    }
    return message.direction === "outbound" ? "You" : "PX Team";
  }

  function messageMarkup(message) {
    if (message.formatted_body) {
      return <div className="message-body" dangerouslySetInnerHTML={{ __html: message.formatted_body }} />;
    }
    return <p>{message.body}</p>;
  }

  function attachmentHref(url) {
    if (!url) {
      return null;
    }
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    return `${API_BASE}${url}`;
  }

  function descriptionMarkup() {
    if (entity.frozen_description_html) {
      return <div className="message-body" dangerouslySetInnerHTML={{ __html: entity.frozen_description_html }} />;
    }
    return <p>{entity.frozen_description || "No description synced yet."}</p>;
  }

  return (
    <Card
      title={title}
      actions={
        <div className="card-actions">
          <StatusPill status={entity.portal_status} />
          {isAdmin && syncAction ? (
            <button className="ghost-button" onClick={syncAction}>
              Sync
            </button>
          ) : null}
        </div>
      }
    >
      <div className="entity-meta">
        {isAdmin ? (
          <a href={entity.external_ticket_url} target="_blank" rel="noreferrer">
            {entity.external_ticket_key || entity.external_item_id || "Open external item"}
          </a>
        ) : (
          <span>Linked work item</span>
        )}
        <span>{isAdmin ? `External status: ${entity.external_status || "Unknown"}` : `Status: ${entity.portal_status || "Unknown"}`}</span>
      </div>
      <div className="description-box">{descriptionMarkup()}</div>
      <div className="timeline" ref={timelineRef}>
        {entity.messages?.length ? (
          entity.messages.map((message) => (
            <article key={message.id} className={`message ${message.direction}`}>
              <div className="message-meta">
                <span>{messageAuthorLabel(message)}</span>
                <span>{new Date(message.created_at).toLocaleString()}</span>
              </div>
              {messageMarkup(message)}
              {message.attachment_url ? (
                <a href={attachmentHref(message.attachment_url)} target="_blank" rel="noreferrer">
                  {message.attachment_name || "Download attachment"}
                </a>
              ) : null}
            </article>
          ))
        ) : (
          <div className="empty-state">No public messages yet.</div>
        )}
      </div>
      <form className="stack-form" onSubmit={handleSend}>
        <textarea
          rows="3"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={uploadEnabled ? "Write a message or attach a file..." : "Write a message..."}
        />
        {uploadEnabled ? (
          <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        ) : null}
        <button className="primary-button" disabled={busy || (!body.trim() && !file)}>
          {file ? "Send with file" : "Send message"}
        </button>
        {uploadEnabled && file ? (
          <span className="inline-upload-label">
            {file.name}
            {!body.trim() ? ' - empty message will use "File uploaded from portal".' : ""}
          </span>
        ) : null}
      </form>
    </Card>
  );
}
