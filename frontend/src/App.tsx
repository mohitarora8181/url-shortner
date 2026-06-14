import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Copy,
  Gauge,
  Link2,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Radar,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlink,
  Zap
} from "lucide-react";
import kineticLinks from "./assets/kinetic-links.png";
import { ApiError, api } from "./lib/api";
import type { AliasResult, AuthPayload, ShortUrl, UrlListResponse, User } from "./lib/types";

const TOKEN_KEY = "short-circuit-token";

type Toast = {
  tone: "success" | "error" | "info";
  message: string;
};

type ValidationDetail = {
  property?: string;
  path?: string;
  message?: string;
  constraints?: Record<string, string>;
  children?: ValidationDetail[];
};

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              type?: "standard" | "icon";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
            }
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const showDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value))
    : "Never";

const humanizeFieldName = (value?: string) => {
  if (!value) {
    return "";
  }

  return value
    .replace(/\[(\d+)\]/g, " $1")
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
};

const formatValidationDetails = (details: unknown): string[] => {
  if (!details) {
    return [];
  }

  if (typeof details === "string") {
    return [details];
  }

  if (Array.isArray(details)) {
    return details.flatMap(formatValidationDetails);
  }

  if (typeof details !== "object") {
    return [];
  }

  const detail = details as ValidationDetail;
  const fieldName = humanizeFieldName(detail.property ?? detail.path);
  const messages = [
    ...(detail.message ? [detail.message] : []),
    ...(detail.constraints ? Object.values(detail.constraints) : [])
  ];
  const ownMessages = messages.map((message) => (fieldName ? `${fieldName}: ${message}` : message));
  const childMessages = detail.children?.flatMap(formatValidationDetails) ?? [];

  return [...ownMessages, ...childMessages];
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    const validationMessages = formatValidationDetails(error.details);
    if (validationMessages.length > 0) {
      return validationMessages.slice(0, 3).join(" | ");
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
};

const copyToClipboard = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(Boolean(token));
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((message: string, tone: Toast["tone"] = "info") => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), toast.tone === "error" ? 5600 : 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }

    let isCurrent = true;

    api
      .me(token)
      .then((result) => {
        if (isCurrent) {
          setUser(result.user);
        }
      })
      .catch(() => {
        if (isCurrent) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setBooting(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [token]);

  const handleAuth = (payload: AuthPayload) => {
    localStorage.setItem(TOKEN_KEY, payload.accessToken);
    setToken(payload.accessToken);
    setUser(payload.user);
    notify(`Signed in as ${payload.user.name}`, "success");
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    notify("Session closed", "info");
  };

  return (
    <div className="app">
      <div className="ambient" style={{ backgroundImage: `url(${kineticLinks})` }} />
      <div className="scanline" />
      <AnimatePresence>
        {toast ? (
          <motion.div
            className={`toast toast-${toast.tone}`}
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
          >
            {toast.tone === "success" ? <Check size={17} /> : toast.tone === "error" ? <Zap size={17} /> : <Sparkles size={17} />}
            <span>{toast.message}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {booting ? (
        <div className="boot-screen">
          <Loader2 className="spin" size={32} />
          <span>Loading console</span>
        </div>
      ) : user && token ? (
        <Dashboard token={token} user={user} onLogout={logout} notify={notify} />
      ) : (
        <AuthShell onAuth={handleAuth} notify={notify} />
      )}
    </div>
  );
}

function AuthShell({ onAuth, notify }: { onAuth: (payload: AuthPayload) => void; notify: (message: string, tone?: Toast["tone"]) => void }) {
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
  const [scriptReady, setScriptReady] = useState(Boolean(window.google?.accounts?.id));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => setScriptReady(true), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => notify("Could not load Google Sign-In", "error");
    document.head.appendChild(script);
  }, [notify]);

  useEffect(() => {
    if (!scriptReady || !googleClientId || !googleButtonRef.current || !window.google?.accounts?.id) {
      return;
    }

    const loginWithCredential = async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        notify("Google did not return a login credential", "error");
        return;
      }

      setBusy(true);
      try {
        const payload = await api.googleLogin({ credential: response.credential });
        onAuth(payload);
      } catch (error) {
        notify(getErrorMessage(error), "error");
      } finally {
        setBusy(false);
      }
    };

    googleButtonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: loginWithCredential,
      auto_select: false,
      cancel_on_tap_outside: true
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "filled_black",
      size: "large",
      type: "standard",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: Math.min(360, googleButtonRef.current.clientWidth || 320)
    });
  }, [googleClientId, notify, onAuth, scriptReady]);

  return (
    <main className="auth-layout">
      <motion.section
        className="auth-panel"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="brand-row">
          <div className="brand-mark">
            <Link2 size={22} />
          </div>
          <div>
            <p className="eyebrow">Short Circuit</p>
            <h1>Link control room</h1>
          </div>
        </div>

        <div className="google-auth-card">
          <div>
            <p className="eyebrow">Google access</p>
            <h2>Continue with your Google account</h2>
            <p className="auth-copy">Your account is created automatically the first time Google verifies your identity.</p>
          </div>

          {googleClientId ? (
            <div className="google-button-shell">
              <div ref={googleButtonRef} />
              {!scriptReady || busy ? (
                <div className="google-loading">
                  <Loader2 className="spin" size={18} />
                  <span>{busy ? "Signing you in" : "Loading Google"}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="setup-warning">
              <Sparkles size={18} />
              <span>Set VITE_GOOGLE_CLIENT_ID in frontend/.env and GOOGLE_CLIENT_ID in the backend .env.</span>
            </div>
          )}
        </div>
      </motion.section>
    </main>
  );
}

function Dashboard({
  token,
  user,
  onLogout,
  notify
}: {
  token: string;
  user: User;
  onLogout: () => void;
  notify: (message: string, tone?: Toast["tone"]) => void;
}) {
  const [urls, setUrls] = useState<UrlListResponse>({ items: [], page: 1, limit: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [originalUrl, setOriginalUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [aliasQuery, setAliasQuery] = useState("");
  const [aliases, setAliases] = useState<AliasResult[]>([]);
  const [editing, setEditing] = useState<ShortUrl | null>(null);

  const refreshUrls = useCallback(
    async (nextSearch = search) => {
      setLoading(true);

      try {
        const result = await api.listUrls(token, { search: nextSearch, page: 1, limit: 50 });
        setUrls(result);
      } catch (error) {
        notify(getErrorMessage(error), "error");
      } finally {
        setLoading(false);
      }
    },
    [notify, search, token]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshUrls(search);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [refreshUrls, search]);

  useEffect(() => {
    if (!aliasQuery.trim()) {
      setAliases([]);
      return;
    }

    let isCurrent = true;
    const timeout = window.setTimeout(() => {
      api
        .searchAliases(token, { q: aliasQuery.trim(), limit: 8 })
        .then((result) => {
          if (isCurrent) {
            setAliases(result);
          }
        })
        .catch((error) => notify(getErrorMessage(error), "error"));
    }, 240);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [aliasQuery, notify, token]);

  const stats = useMemo(() => {
    const totalClicks = urls.items.reduce((sum, url) => sum + url.clickCount, 0);
    const customCount = urls.items.filter((url) => Boolean(url.customAlias)).length;
    const activeCount = urls.items.filter((url) => url.isActive).length;

    return {
      total: urls.total,
      clicks: totalClicks,
      custom: customCount,
      active: activeCount
    };
  }, [urls]);

  const createUrl = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);

    try {
      await api.createUrl(token, {
        originalUrl,
        ...(customAlias.trim() ? { customAlias: customAlias.trim() } : {})
      });
      setOriginalUrl("");
      setCustomAlias("");
      await refreshUrls("");
      setSearch("");
      notify("Short URL launched", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (value: string) => {
    await copyToClipboard(value);
    notify("Copied to clipboard", "success");
  };

  const handleDeactivate = async (url: ShortUrl) => {
    try {
      await api.deleteUrl(token, url.id);
      await refreshUrls();
      notify("URL deactivated", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    }
  };

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand-row compact">
          <div className="brand-mark">
            <Link2 size={21} />
          </div>
          <div>
            <p className="eyebrow">Short Circuit</p>
            <h1>Links</h1>
          </div>
        </div>

        <div className="user-chip">
          <span>{user.name}</span>
          <button onClick={onLogout} title="Log out" type="button">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <section className="metric-grid">
        <Metric icon={<Gauge size={20} />} label="Total" value={stats.total} tone="cyan" />
        <Metric icon={<Zap size={20} />} label="Clicks" value={stats.clicks} tone="coral" />
        <Metric icon={<Sparkles size={20} />} label="Custom" value={stats.custom} tone="yellow" />
        <Metric icon={<ShieldCheck size={20} />} label="Active" value={stats.active} tone="green" />
      </section>

      <section className="workspace-grid">
        <div className="control-column">
          <section className="tool-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Create</p>
                <h2>New short URL</h2>
              </div>
              <Plus size={20} />
            </div>

            <form className="create-form" noValidate onSubmit={createUrl}>
              <label>
                <span>Destination URL</span>
                <input
                  value={originalUrl}
                  onChange={(event) => setOriginalUrl(event.target.value)}
                  placeholder="https://example.com/very/long/path"
                  type="url"
                  required
                />
              </label>

              <label>
                <span>Custom name</span>
                <input
                  value={customAlias}
                  onChange={(event) => setCustomAlias(event.target.value)}
                  placeholder="launch-page"
                  maxLength={64}
                />
              </label>

              <button className="command-button" disabled={creating} type="submit">
                {creating ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
                Shorten
              </button>
            </form>
          </section>

          <section className="tool-panel alias-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Find</p>
                <h2>Alias radar</h2>
              </div>
              <Radar size={20} />
            </div>
            <label className="search-field">
              <Search size={17} />
              <input value={aliasQuery} onChange={(event) => setAliasQuery(event.target.value)} placeholder="Search custom names" />
            </label>

            <div className="alias-list">
              <AnimatePresence initial={false}>
                {aliases.map((alias) => (
                  <motion.button
                    key={alias.id}
                    className="alias-result"
                    onClick={() => void handleCopy(alias.shortUrl)}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <span>{alias.customAlias}</span>
                    <Copy size={15} />
                  </motion.button>
                ))}
              </AnimatePresence>
              {aliasQuery && aliases.length === 0 ? <p className="empty-note">No custom aliases found.</p> : null}
            </div>
          </section>
        </div>

        <section className="list-panel">
          <div className="list-toolbar">
            <div>
              <p className="eyebrow">Manage</p>
              <h2>Your saved links</h2>
            </div>
            <label className="search-field wide">
              <Search size={17} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search URLs and aliases" />
            </label>
          </div>

          <div className="url-list">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2 className="spin" size={24} />
                  <span>Loading links</span>
                </motion.div>
              ) : urls.items.length ? (
                urls.items.map((url, index) => (
                  <UrlRow
                    key={url.id}
                    url={url}
                    index={index}
                    onCopy={handleCopy}
                    onEdit={setEditing}
                    onDeactivate={handleDeactivate}
                  />
                ))
              ) : (
                <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Unlink size={24} />
                  <span>No links in this view</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </section>

      <AnimatePresence>
        {editing ? (
          <EditDialog
            token={token}
            url={editing}
            onClose={() => setEditing(null)}
            onUpdated={async () => {
              setEditing(null);
              await refreshUrls();
              notify("URL updated", "success");
            }}
            notify={notify}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "cyan" | "coral" | "yellow" | "green";
}) {
  return (
    <motion.article
      className={`metric-card tone-${tone}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </motion.article>
  );
}

function UrlRow({
  url,
  index,
  onCopy,
  onEdit,
  onDeactivate
}: {
  url: ShortUrl;
  index: number;
  onCopy: (value: string) => Promise<void>;
  onEdit: (url: ShortUrl) => void;
  onDeactivate: (url: ShortUrl) => Promise<void>;
}) {
  return (
    <motion.article
      className={`url-row ${url.isActive ? "" : "inactive"}`}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.28, ease: "easeOut", delay: Math.min(index * 0.025, 0.18) }}
    >
      <div className="url-main">
        <div className="code-line">
          <span className="status-dot" />
          <strong>{url.shortCode}</strong>
          {url.customAlias ? <span className="alias-badge">custom</span> : null}
        </div>
        <a href={url.originalUrl} target="_blank" rel="noreferrer">
          {url.originalUrl}
        </a>
        <div className="row-meta">
          <span>{url.clickCount} clicks</span>
          <span>Updated {showDate(url.updatedAt)}</span>
          <span>Last opened {showDate(url.lastAccessedAt)}</span>
        </div>
      </div>

      <div className="row-actions">
        <button onClick={() => void onCopy(url.shortUrl)} title="Copy short URL" type="button">
          <Copy size={17} />
        </button>
        <a href={url.shortUrl} target="_blank" rel="noreferrer" title="Open short URL">
          <ArrowUpRight size={17} />
        </a>
        <button onClick={() => onEdit(url)} title="Edit URL" type="button">
          <Pencil size={17} />
        </button>
        <button onClick={() => void onDeactivate(url)} title="Deactivate URL" type="button">
          <Trash2 size={17} />
        </button>
      </div>
    </motion.article>
  );
}

function EditDialog({
  token,
  url,
  onClose,
  onUpdated,
  notify
}: {
  token: string;
  url: ShortUrl;
  onClose: () => void;
  onUpdated: () => Promise<void>;
  notify: (message: string, tone?: Toast["tone"]) => void;
}) {
  const [originalUrl, setOriginalUrl] = useState(url.originalUrl);
  const [customAlias, setCustomAlias] = useState(url.customAlias ?? "");
  const [removeAlias, setRemoveAlias] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await api.updateUrl(token, url.id, {
        originalUrl,
        customAlias: removeAlias ? null : customAlias.trim() || undefined
      });
      await onUpdated();
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.form
        className="edit-dialog"
        noValidate
        onSubmit={submit}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Tune</p>
            <h2>{url.shortCode}</h2>
          </div>
          <button className="icon-soft" onClick={onClose} title="Close dialog" type="button">
            <RotateCcw size={18} />
          </button>
        </div>

        <label>
          <span>Destination URL</span>
          <input value={originalUrl} onChange={(event) => setOriginalUrl(event.target.value)} type="url" required />
        </label>

        <label>
          <span>Custom name</span>
          <input
            value={customAlias}
            onChange={(event) => setCustomAlias(event.target.value)}
            disabled={removeAlias}
            maxLength={64}
          />
        </label>

        <label className="checkbox-row">
          <input checked={removeAlias} onChange={(event) => setRemoveAlias(event.target.checked)} type="checkbox" />
          <span>Remove custom name</span>
        </label>

        <button className="command-button" disabled={saving} type="submit">
          {saving ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
          Save changes
        </button>
      </motion.form>
    </motion.div>
  );
}
