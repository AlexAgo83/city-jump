import { parseCity, type CitySave } from "./save";

const PREFIX = "city=";
export const MAX_SHARE_FRAGMENT = 12_000;
export const MAX_SHARE_JSON = 1_000_000;

export interface SharedCity {
  readonly name: string;
  readonly city: CitySave;
}

export async function encodeShare({ name, city }: SharedCity): Promise<string | null> {
  const json = JSON.stringify({ name, city: quantized(city) });
  const bytes = await gzip(new TextEncoder().encode(json));
  const payload = PREFIX + base64url(bytes);
  return payload.length <= MAX_SHARE_FRAGMENT ? payload : null;
}

export async function decodeShare(fragment: string): Promise<SharedCity> {
  const payload = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (!payload.startsWith(PREFIX)) throw new Error("not a city share link");
  if (payload.length > MAX_SHARE_FRAGMENT) throw new Error("share link is too large");
  let parsed: unknown;
  try {
    const json = new TextDecoder().decode(await gunzip(unbase64url(payload.slice(PREFIX.length)), MAX_SHARE_JSON));
    parsed = JSON.parse(json);
  } catch {
    throw new Error("share link is malformed");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("share link is malformed");
  const value = parsed as { name?: unknown; city?: unknown };
  if (typeof value.name !== "string") throw new Error("share link is malformed");
  const city = parseCity(JSON.stringify(value.city));
  if (!city) throw new Error("share link was made by a newer or incompatible build");
  return { name: value.name, city };
}

function quantized(city: CitySave): CitySave {
  return JSON.parse(JSON.stringify(city), (_key, value) => (typeof value === "number" ? Math.round(value * 10) / 10 : value));
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([arrayBufferOf(bytes)]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array, cap: number): Promise<Uint8Array> {
  const reader = new Blob([arrayBufferOf(bytes)]).stream().pipeThrough(new DecompressionStream("gzip")).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > cap) throw new Error("share link expands too large");
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function arrayBufferOf(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function unbase64url(text: string): Uint8Array {
  const padded = text.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}
