// Hosted query embedding for "Ask the Fathers".
//
// The patristic corpus in content_embeddings is embedded with bge-small-en-v1.5
// (384-dim, MEAN pooling) by scripts/search/build-embeddings.ts via the local
// model (src/lib/search/embeddings.ts). Running that model inside this query
// route would pull in @huggingface/transformers + onnxruntime-node — ~335 MB of
// native binaries that blow past Vercel's 250 MB function cap. Instead we embed
// only the *query* through a hosted call to the SAME model, so the query vector
// lands in the corpus's vector space while the function stays tiny (fetch + pg).
//
// Provider: Cloudflare Workers AI (@cf/baai/bge-small-en-v1.5) — chosen because
// it runs the identical model AND exposes a `pooling` parameter, letting us pin
// MEAN pooling to match the corpus. Cloudflare's own docs warn that mean- and
// cls-pooled embeddings are mutually INCOMPATIBLE, so this pin is load-bearing —
// a cls-pooled query would silently mis-rank against our mean-pooled corpus.
// Reuses the Cloudflare account already used for R2 content hosting.
//
// Retrieval-only: the query text is sent out solely to be turned into a vector —
// no text is generated, and the corpus itself never leaves our infra.

export const EMBEDDING_DIM = 384;

// BGE retrieval is asymmetric: the QUERY gets this instruction prefix, passages
// do not. Must match src/lib/search/embeddings.ts (QUERY_INSTRUCTION) and the
// prefix-free passage embedding in scripts/search/build-embeddings.ts.
const QUERY_INSTRUCTION =
  "Represent this sentence for searching relevant passages: ";

// MUST equal the pooling the corpus was built with (embeddings.ts uses "mean").
const POOLING = "mean";

const MODEL = "@cf/baai/bge-small-en-v1.5";

type WorkersAiEmbeddingResponse = {
  result?: { data?: number[][]; shape?: number[]; pooling?: string };
  success?: boolean;
  errors?: { message?: string }[];
};

// Embed a user's search query into the corpus's 384-dim space via Cloudflare
// Workers AI. Throws on missing creds or a bad response; the caller degrades to
// an empty result set so the client never 500s.
export async function embedQueryHosted(query: string): Promise<number[]> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
  if (!account || !token) {
    throw new Error(
      "Cloudflare Workers AI credentials missing — set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_WORKERS_AI_TOKEN.",
    );
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [`${QUERY_INSTRUCTION}${query}`],
        pooling: POOLING,
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Cloudflare Workers AI ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as WorkersAiEmbeddingResponse;
  const vec = json.result?.data?.[0];
  if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIM) {
    const msg = (json.errors ?? [])
      .map((e) => e.message)
      .filter(Boolean)
      .join("; ");
    throw new Error(
      `Cloudflare Workers AI returned no embedding${
        msg ? ` (${msg})` : ` (shape=${JSON.stringify(json.result?.shape)})`
      }`,
    );
  }
  return vec;
}

// pgvector literal "[0.1,0.2,...]". Duplicated from embeddings.ts so this module
// stays free of the heavy @huggingface/transformers import that file carries.
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
