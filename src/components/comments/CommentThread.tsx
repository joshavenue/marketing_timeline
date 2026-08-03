"use client";

import { useEffect, useState } from "react";

interface CommentView {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  replies: CommentView[];
}

export function CommentThread({
  entityType,
  entityId,
}: {
  entityType: "initiative" | "event";
  entityId: string;
}) {
  const [comments, setComments] = useState<CommentView[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function fetchComments() {
    const query = new URLSearchParams({ entityType, entityId });
    const response = await fetch(`/api/comments?${query}`);
    if (!response.ok) throw new Error("Could not load comments");
    const payload = (await response.json()) as { comments: CommentView[] };
    return payload.comments;
  }

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ entityType, entityId });
    void fetch(`/api/comments?${query}`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load comments");
        return response.json() as Promise<{ comments: CommentView[] }>;
      })
      .then((payload) => {
        if (!cancelled) setComments(payload.comments);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error ? reason.message : "Could not load comments",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [entityId, entityType]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          body,
          ...(replyTo ? { parentCommentId: replyTo } : {}),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not post comment");
      setBody("");
      setReplyTo(null);
      setComments(await fetchComments());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not post comment");
    } finally {
      setBusy(false);
    }
  }

  function renderComment(comment: CommentView, reply = false) {
    return (
      <li
        className={reply ? "ml-8 border-l border-black/10 pl-4" : ""}
        id={`comment-${comment.id}`}
        key={comment.id}
      >
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="flex items-center justify-between gap-3 text-xs text-black/45">
            <strong className="text-black/70">{comment.authorName}</strong>
            <time>{new Date(comment.createdAt).toLocaleString()}</time>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{comment.body}</p>
          {!reply ? (
            <button
              className="mt-2 text-xs font-medium text-blue-700"
              onClick={() => setReplyTo(comment.id)}
              type="button"
            >
              Reply
            </button>
          ) : null}
        </div>
        {comment.replies.length ? (
          <ul className="mt-2 space-y-2">
            {comment.replies.map((child) => renderComment(child, true))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <section className="mt-6 rounded-[24px] border border-black/10 bg-white p-6">
      <h2 className="text-xl font-semibold">Team comments</h2>
      <p className="mt-1 text-xs text-black/45">
        Notes are editable collaboration data. Timeline evidence remains read-only.
      </p>
      <ul className="mt-5 space-y-3" data-testid="comment-list">
        {comments.map((comment) => renderComment(comment))}
      </ul>
      <form className="mt-5" onSubmit={submit}>
        {replyTo ? (
          <div className="mb-2 flex items-center justify-between text-xs text-blue-700">
            <span>Replying to a comment</span>
            <button onClick={() => setReplyTo(null)} type="button">Cancel reply</button>
          </div>
        ) : null}
        <label className="sr-only" htmlFor={`comment-${entityId}`}>Add a comment</label>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-black/10 p-4 text-sm outline-none focus:border-blue-500"
          id={`comment-${entityId}`}
          maxLength={10_000}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a team note…"
          required
          value={body}
        />
        <div className="mt-2 flex items-center justify-between">
          <p aria-live="polite" className="text-xs text-rose-700">{error}</p>
          <button
            className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            disabled={busy || !body.trim()}
            type="submit"
          >
            {busy ? "Posting…" : replyTo ? "Post reply" : "Post comment"}
          </button>
        </div>
      </form>
    </section>
  );
}
