// Local, self-hosted text embeddings for "Ask the Fathers" semantic search.
//
// The model (open-source BGE-small, 384-dim) runs in-process via
// Transformers.js + onnxruntime — there is NO third-party AI service in the
// loop and NO generated text: we only turn text into a vector so we can rank
// real catalogued writings by meaning similarity.
//
// Used by two callers, both server/Node only:
//   • the API route src/app/api/search/fathers/route.ts (embeds the query)
//   • the build script scripts/search/build-embeddings.ts (embeds the corpus)
// Intentionally NOT marked `server-only` so the tsx build script can import it;
// nothing under apps/mobile or the web client ever imports it.

import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";

// Open BGE-small retrieval model. Same model at build + query time so the
// document and query vectors live in the same space.
const MODEL_ID = "Xenova/bge-small-en-v1.5";
// BGE recommends prefixing the *query* (not the passages) with this retrieval
// instruction for best results.
const QUERY_INSTRUCTION =
  "Represent this sentence for searching relevant passages: ";

export const EMBEDDING_DIM = 384;

// On Vercel the only writable path is /tmp; point the model cache there so the
// first cold query can fetch + cache the weights. Locally (dev server, build
// script) the default cache dir under the package is fine. (To go fully
// offline / bundle the weights, commit them and set env.localModelPath +
// env.allowRemoteModels = false.)
if (process.env.VERCEL) {
  env.cacheDir = "/tmp/transformers-cache";
}

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    // q8 = 8-bit quantized weights (~33 MB) — plenty for retrieval, small
    // enough to keep cold start and memory reasonable.
    extractorPromise = pipeline("feature-extraction", MODEL_ID, {
      dtype: "q8",
    });
  }
  return extractorPromise;
}

async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  // Mean-pool token embeddings + L2-normalize so cosine distance is meaningful.
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}

// Embed a user's search query (with the BGE retrieval instruction prefix).
export async function embedQuery(query: string): Promise<number[]> {
  const [vec] = await embed([`${QUERY_INSTRUCTION}${query}`]);
  return vec;
}

// Embed corpus passages (no instruction prefix), e.g. from the build script.
export async function embedPassages(texts: string[]): Promise<number[][]> {
  return embed(texts);
}

// pgvector accepts a vector literal of the form "[0.1,0.2,...]".
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
