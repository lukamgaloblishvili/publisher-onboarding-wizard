import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../api/client";
import { Card } from "./Cards";
import { StatusPill } from "./StatusPill";

function messageAuthorLabel(message, isAdmin) {
  if (isAdmin) {
    return message.source;
  }
  return message.direction === "outbound" ? "You" : "PX Team";
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

export function MessagePanel({ title, entity, onSend, onUpload, uploadEnabled = false, syncAction, isAdmin = false }) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const timelineRef = useRef(null);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [entity?.messages]);

  if (!entity) {
    return (
      <Card title={title}>
        <div className="rounded-2xl bg-px-mist/70 px-4 py-4 text-sm text-black/60">No linked external ticket yet.</div>
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

  return (
    <Card
      title={title}
      actions={
        <div className="flex items-center gap-3">
          <StatusPill status={entity.portal_status} />
          {isAdmin && syncAction ? (
            <button className="app-button-secondary !px-4 !py-2" onClick={syncAction}>
              Sync
            </button>
          ) : null}
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-black/60">
        {isAdmin ? (
          <a className="font-medium text-px-deep underline underline-offset-2" href={entity.external_ticket_url} target="_blank" rel="noreferrer">
            {entity.external_ticket_key || entity.external_item_id || "Open external item"}
          </a>
        ) : (
          <span>Linked work item</span>
        )}
        <span>{isAdmin ? `External status: ${entity.external_status || "Unknown"}` : `Status: ${entity.portal_status || "Unknown"}`}</span>
      </div>
      <div className="mb-5 rounded-2xl bg-px-mist/80 p-4 text-sm leading-7 text-black/80">
        {entity.frozen_description_html ? (
          <div dangerouslySetInnerHTML={{ __html: entity.frozen_description_html }} />
        ) : (
          <p>{entity.frozen_description || "No description synced yet."}</p>
        )}
      </div>
      <div ref={timelineRef} className="mb-5 flex max-h-[26rem] flex-col gap-3 overflow-y-auto pr-1">
        {entity.messages?.length ? (
          entity.messages.map((message) => (
            <article key={message.id} className={`rounded-3xl border border-black/10 px-4 py-4 ${message.direction === "outbound" ? "bg-emerald-50" : "bg-white"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-black/55">
                <span className="uppercase tracking-[0.14em]">{messageAuthorLabel(message, isAdmin)}</span>
                <span>{new Date(message.created_at).toLocaleString()}</span>
              </div>
              {message.formatted_body ? (
                <div className="mt-3 text-sm leading-7 text-black/80" dangerouslySetInnerHTML={{ __html: message.formatted_body }} />
              ) : (
                <p className="mt-3 text-sm leading-7 text-black/80">{message.body}</p>
              )}
              {message.attachment_url ? (
                <a
                  className="mt-3 inline-flex text-sm font-medium text-px-deep underline underline-offset-2"
                  href={attachmentHref(message.attachment_url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {message.attachment_name || "Download attachment"}
                </a>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-2xl bg-px-mist/70 px-4 py-4 text-sm text-black/60">No public messages yet.</div>
        )}
      </div>
      <form className="space-y-3" onSubmit={handleSend}>
        <textarea
          className="app-input min-h-28"
          rows="3"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={uploadEnabled ? "Write a message or attach a file..." : "Write a message..."}
        />
        {uploadEnabled ? <input className="app-input file:mr-4 file:rounded-full file:border-0 file:bg-px-mist file:px-4 file:py-2 file:text-sm file:font-medium" type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} /> : null}
        <button className="app-button-primary" disabled={busy || (!body.trim() && !file)}>
          {file ? "Send with file" : "Send message"}
        </button>
        {uploadEnabled && file ? (
          <span className="block text-sm text-black/60">
            {file.name}
            {!body.trim() ? ' - empty message will use "File uploaded from portal".' : ""}
          </span>
        ) : null}
      </form>
    </Card>
  );
}
