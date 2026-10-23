import https from "node:https";
import http from "node:http";

// Read-only diagnostics run from GitHub's public-network runner. Never touches DNS.
const escape = value => String(value).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
const notice = (title, value) => console.log(`::notice title=${escape(title)}::${escape(value)}`);
for (const host of ["sundaerun.com", "www.sundaerun.com"]) {
  for (const type of ["CNAME", "A", "AAAA", "CAA"]) {
    try {
      const response = await fetch(`https://dns.google/resolve?name=${host}&type=${type}`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Resolver HTTP ${response.status}`);
      const result = await response.json();
      notice(`${host} ${type}`, JSON.stringify({ status: result.Status, answers: result.Answer ?? [] }));
    } catch (error) { notice(`${host} ${type}`, error.message); }
  }
  for (const protocol of ["http:", "https:"]) {
    await new Promise(resolve => {
      const client = protocol === "https:" ? https : http;
      const request = client.get(`${protocol}//${host}/`, { timeout: 15000 }, response => {
        notice(`${protocol}//${host}/`, JSON.stringify({ status: response.statusCode, location: response.headers.location ?? null,
          ...(protocol === "https:" ? { tlsAuthorized: response.socket.authorized, certificateExpiry: response.socket.getPeerCertificate().valid_to } : {}) }));
        response.resume();resolve();
      });
      request.on("timeout", () => request.destroy(new Error("Connection timed out")));
      request.on("error", error => { notice(`${protocol}//${host}/`, `${error.code ?? "ERROR"}: ${error.message}`);resolve(); });
    });
  }
}
