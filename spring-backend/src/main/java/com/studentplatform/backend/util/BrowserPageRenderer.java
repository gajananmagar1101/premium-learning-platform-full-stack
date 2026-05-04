package com.studentplatform.backend.util;

import jakarta.servlet.http.HttpServletRequest;

public final class BrowserPageRenderer {

    private BrowserPageRenderer() {
    }

    public static boolean wantsHtml(HttpServletRequest request) {
        String fetchDest = request.getHeader("sec-fetch-dest");
        if ("document".equalsIgnoreCase(fetchDest)) {
            return true;
        }

        String accept = request.getHeader("accept");
        return accept != null && accept.toLowerCase().contains("text/html");
    }

    public static String buildPage(
            String title,
            String eyebrow,
            String message,
            String hint,
            String appUrl,
            int statusCode
    ) {
        String safeTitle = escapeHtml(title);
        String safeEyebrow = escapeHtml(eyebrow);
        String safeMessage = escapeHtml(message);
        String safeHint = hint == null ? "" : escapeHtml(hint);
        String safeAppUrl = appUrl == null ? "" : escapeHtml(appUrl);
        String primaryAction = !safeAppUrl.isBlank()
                ? "<a class=\"button button-primary\" href=\"" + safeAppUrl + "\">Open App</a>"
                : "<a class=\"button button-primary\" href=\"/api/health\">Open API Health</a>";

        return """
                <!doctype html>
                <html lang="en">
                  <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>%s</title>
                    <style>
                      :root {
                        color-scheme: light;
                        --bg-1: #eef2ff;
                        --bg-2: #f8fafc;
                        --bg-3: #fff7ed;
                        --ink: #0f172a;
                        --muted: #64748b;
                        --card: rgba(255,255,255,0.86);
                        --border: rgba(148,163,184,0.22);
                        --shadow: 0 32px 90px rgba(15,23,42,0.15);
                      }
                      * { box-sizing: border-box; }
                      body {
                        margin: 0;
                        min-height: 100vh;
                        font-family: "Sora", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                        color: var(--ink);
                        background:
                          radial-gradient(circle at top left, rgba(79, 70, 229, 0.18), transparent 30%%),
                          radial-gradient(circle at top right, rgba(249, 115, 22, 0.16), transparent 26%%),
                          radial-gradient(circle at bottom right, rgba(20, 184, 166, 0.16), transparent 30%%),
                          linear-gradient(135deg, var(--bg-1), var(--bg-2) 52%%, var(--bg-3));
                        display: grid;
                        place-items: center;
                        padding: 24px;
                      }
                      .shell { width: min(100%%, 960px); display: grid; gap: 20px; }
                      .topbar {
                        display: flex;
                        flex-wrap: wrap;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                      }
                      .brand {
                        display: inline-flex;
                        align-items: center;
                        gap: 12px;
                        color: #1e1b4b;
                        font-weight: 700;
                        letter-spacing: 0.02em;
                      }
                      .brand-dot {
                        width: 16px;
                        height: 16px;
                        border-radius: 999px;
                        background: linear-gradient(135deg, #4f46e5, #14b8a6);
                        box-shadow: 0 0 0 6px rgba(79, 70, 229, 0.12);
                      }
                      .brand-copy { display: grid; gap: 3px; }
                      .brand-copy strong { font-size: 15px; }
                      .brand-copy span {
                        font-size: 12px;
                        color: #6366f1;
                        font-weight: 600;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                      }
                      .status-chip {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 10px 14px;
                        border-radius: 999px;
                        border: 1px solid rgba(79, 70, 229, 0.14);
                        background: rgba(255, 255, 255, 0.72);
                        color: #334155;
                        font-size: 13px;
                        font-weight: 700;
                      }
                      .status-chip::before {
                        content: "";
                        width: 9px;
                        height: 9px;
                        border-radius: 999px;
                        background: linear-gradient(135deg, #4f46e5, #14b8a6);
                        box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.08);
                      }
                      .card {
                        position: relative;
                        overflow: hidden;
                        border-radius: 28px;
                        border: 1px solid var(--border);
                        background: var(--card);
                        backdrop-filter: blur(18px);
                        box-shadow: var(--shadow);
                      }
                      .card::before {
                        content: "";
                        position: absolute;
                        inset: 0 auto auto 0;
                        width: 100%%;
                        height: 5px;
                        background: linear-gradient(90deg, #4f46e5, #14b8a6);
                      }
                      .card-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; }
                      .content { padding: 34px; }
                      .aside {
                        padding: 34px 30px;
                        background:
                          linear-gradient(180deg, rgba(79, 70, 229, 0.08), rgba(255, 255, 255, 0)),
                          radial-gradient(circle at top right, rgba(79, 70, 229, 0.12), transparent 42%%);
                        border-left: 1px solid rgba(148, 163, 184, 0.16);
                      }
                      .hero-mark {
                        display: inline-grid;
                        place-items: center;
                        width: 72px;
                        height: 72px;
                        border-radius: 22px;
                        background:
                          linear-gradient(135deg, rgba(79, 70, 229, 0.14), rgba(20, 184, 166, 0.14)),
                          #fff;
                        box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 16px 40px rgba(79, 70, 229, 0.12);
                        margin-bottom: 18px;
                        font-size: 28px;
                      }
                      .eyebrow {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 16px;
                        padding: 8px 12px;
                        border-radius: 999px;
                        background: rgba(255, 255, 255, 0.8);
                        color: #4f46e5;
                        font-size: 12px;
                        font-weight: 700;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                      }
                      h1 {
                        margin: 0;
                        font-size: clamp(30px, 5vw, 48px);
                        line-height: 1.02;
                        max-width: 10ch;
                      }
                      p {
                        margin: 0;
                        font-size: 16px;
                        line-height: 1.7;
                        color: var(--muted);
                      }
                      .stack { display: grid; gap: 16px; }
                      .note {
                        border-radius: 20px;
                        padding: 14px 16px;
                        background: rgba(79, 70, 229, 0.07);
                        color: #3730a3;
                        font-size: 14px;
                      }
                      .actions {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 12px;
                        margin-top: 8px;
                      }
                      .button {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        min-width: 160px;
                        border-radius: 14px;
                        padding: 13px 18px;
                        text-decoration: none;
                        font-weight: 700;
                        transition: transform 0.18s ease;
                      }
                      .button:hover { transform: translateY(-1px); }
                      .button-primary {
                        color: white;
                        background: linear-gradient(135deg, #4f46e5, #7c3aed);
                        box-shadow: 0 16px 30px rgba(79, 70, 229, 0.22);
                      }
                      .button-secondary {
                        color: #334155;
                        background: rgba(255, 255, 255, 0.92);
                        border: 1px solid rgba(148, 163, 184, 0.25);
                      }
                      .aside-title {
                        margin: 0 0 12px;
                        font-size: 14px;
                        font-weight: 800;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                        color: #6366f1;
                      }
                      .info-list { display: grid; gap: 12px; }
                      .info-card {
                        border-radius: 18px;
                        padding: 14px 15px;
                        background: rgba(255, 255, 255, 0.8);
                        border: 1px solid rgba(148, 163, 184, 0.16);
                      }
                      .info-card strong {
                        display: block;
                        margin-bottom: 4px;
                        font-size: 14px;
                      }
                      .info-card span {
                        display: block;
                        color: var(--muted);
                        font-size: 13px;
                        line-height: 1.55;
                      }
                      .status-code {
                        margin-top: 18px;
                        display: inline-flex;
                        border-radius: 14px;
                        padding: 10px 12px;
                        background: #0f172a;
                        color: #e2e8f0;
                        font-size: 13px;
                        font-weight: 700;
                        letter-spacing: 0.06em;
                      }
                      @media (max-width: 860px) {
                        .card-grid { grid-template-columns: 1fr; }
                        .aside { border-left: 0; border-top: 1px solid rgba(148, 163, 184, 0.16); }
                        h1 { max-width: none; }
                      }
                      @media (max-width: 640px) {
                        .content, .aside { padding: 24px; }
                        .button { width: 100%%; }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="shell">
                      <div class="topbar">
                        <div class="brand">
                          <span class="brand-dot"></span>
                          <div class="brand-copy">
                            <strong>KL University Student Learning Platform</strong>
                            <span>Live Backend Experience</span>
                          </div>
                        </div>
                        <div class="status-chip">Server response ready</div>
                      </div>
                      <section class="card">
                        <div class="card-grid">
                          <div class="content">
                            <div class="hero-mark">KL</div>
                            <div class="eyebrow">%s</div>
                            <div class="stack">
                              <h1>%s</h1>
                              <p>%s</p>
                              %s
                              <div class="actions">
                                %s
                                <a class="button button-secondary" href="/api/health">API Health</a>
                                <a class="button button-secondary" href="javascript:history.back()">Go Back</a>
                              </div>
                            </div>
                          </div>
                          <aside class="aside">
                            <h2 class="aside-title">What this means</h2>
                            <div class="info-list">
                              <div class="info-card">
                                <strong>Backend is reachable</strong>
                                <span>The deployed Spring backend is online and responding correctly.</span>
                              </div>
                              <div class="info-card">
                                <strong>Action is required</strong>
                                <span>This request needs a valid session, a fresh login, or access through the frontend app.</span>
                              </div>
                              <div class="info-card">
                                <strong>Best next step</strong>
                                <span>%s</span>
                              </div>
                            </div>
                            <div class="status-code">HTTP %d</div>
                          </aside>
                        </div>
                      </section>
                    </div>
                  </body>
                </html>
                """.formatted(
                safeTitle,
                safeEyebrow,
                safeTitle,
                safeMessage,
                safeHint.isBlank() ? "" : "<div class=\"note\">" + safeHint + "</div>",
                primaryAction,
                safeAppUrl.isBlank()
                        ? "Open the app entry point and continue from the login flow."
                        : "Open the frontend app and continue there for the full product experience.",
                statusCode
        );
    }

    private static String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
