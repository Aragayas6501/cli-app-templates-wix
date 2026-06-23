import type { APIRoute } from "astro";

/**
 * OAuth redirect target. Pinterest sends the user's browser here with `?code`
 * and `?state`. This route has no Wix auth context, so it does NOT touch app
 * data — it simply relays the code back to the dashboard (the opener), which
 * completes the exchange via an authenticated `/exchange` call.
 */
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const error = url.searchParams.get("error") ?? "";

  // Escape "<" so a hostile value can't break out of the inline script.
  const payload = JSON.stringify({ source: "pinflow-oauth", code, state, error }).replace(
    /</g,
    "\\u003c",
  );
  const targetOrigin = JSON.stringify(url.origin);

  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Connecting Pinterest…</title></head>
  <body style="font-family: sans-serif; padding: 24px;">
    <p>Finishing Pinterest connection… you can close this window.</p>
    <script>
      (function () {
        try {
          if (window.opener) window.opener.postMessage(${payload}, ${targetOrigin});
        } catch (e) {}
        window.close();
      })();
    </script>
  </body>
</html>`;

  return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
};
