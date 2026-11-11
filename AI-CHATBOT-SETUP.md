# HELGRO AI chatbot setup

The GitHub Pages website cannot safely call a paid AI provider directly from browser code. This project uses a small Cloudflare Worker as a private server-side bridge. The Worker calls Cloudflare Workers AI through its `AI` binding, so no provider API key is exposed in the website.

## 1. Deploy the AI Worker

1. Sign in to [Cloudflare](https://dash.cloudflare.com/).
2. Open **Workers & Pages** and create a Worker named `helgro-ai`.
3. Open the Worker editor and replace its starter code with the contents of `worker.js`.
4. Open **Settings → Bindings → Add → Workers AI**. Set the variable name to **AI**, save, and deploy.
5. If Cloudflare asks, enable Workers AI for the account. Usage limits or billing depend on the Cloudflare account and current plan.
6. Open the Worker URL. It will look like `https://helgro-ai.<your-subdomain>.workers.dev`.

You can also deploy from this folder with Wrangler after authenticating:

```bash
npx wrangler login
npx wrangler deploy
```

The included `wrangler.toml` already declares the AI binding.

## 2. Connect the website

1. Open `index.html` in this repository.
2. Find `const HELGRO_AI_ENDPOINT='';`
3. Paste your Worker URL followed by `/` only if needed; the Worker accepts POST at its root. Example:

```js
const HELGRO_AI_ENDPOINT='https://helgro-ai.your-subdomain.workers.dev';
```

4. Commit the change to `main` and wait for GitHub Pages to publish.

The Worker allows the published site origin `https://shankobewatta.github.io` by default. If you use a different custom domain, set a Worker environment variable named `ALLOWED_ORIGIN` to that exact origin (for example, `https://example.com`).

## 3. Test

Ask a question such as:
- How should I care for my paddy crop during the Yala season?
- My cow is not eating. What should I check?
- Why are my chilli leaves turning yellow?

The website has a small offline guidance fallback when the Worker URL has not yet been configured or the service is temporarily unavailable. That fallback is not generative AI. Full open-ended AI answers become available after the Worker is deployed and connected.

## Security notes

- Never put an AI provider key or Cloudflare API token in `index.html`.
- Keep the Worker AI binding server-side.
- The Worker limits request size and message length and only accepts POST requests.
- The assistant gives general guidance, not a substitute for a local agriculture officer or veterinarian.
