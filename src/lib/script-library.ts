/**
 * Uploadable agent call script.
 * Agents/admins can upload a new script document (.docx, .txt, .md) at any time
 * and delete it to fall back to the built-in Policy Bear script.
 */

export const SCRIPT_DOC_EVENT = "pb:script-doc-updated";
const STORE_KEY = "pb.script.custom-doc";

export interface ScriptDocBlock {
  kind: "heading" | "paragraph" | "bullet";
  text: string;
}

export interface ScriptDoc {
  name: string;
  uploadedAt: string;
  blocks: ScriptDocBlock[];
}

export function loadScriptDoc(): ScriptDoc | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const doc = JSON.parse(raw) as ScriptDoc;
    return Array.isArray(doc?.blocks) && doc.blocks.length ? doc : null;
  } catch {
    return null;
  }
}

export function saveScriptDoc(doc: ScriptDoc) {
  window.localStorage.setItem(STORE_KEY, JSON.stringify(doc));
  window.dispatchEvent(new CustomEvent(SCRIPT_DOC_EVENT));
}

export function deleteScriptDoc() {
  window.localStorage.removeItem(STORE_KEY);
  window.dispatchEvent(new CustomEvent(SCRIPT_DOC_EVENT));
}

function blocksFromHtml(html: string): ScriptDocBlock[] {
  const container = document.createElement("div");
  container.innerHTML = html;
  const blocks: ScriptDocBlock[] = [];
  container.querySelectorAll("h1,h2,h3,h4,p,li").forEach((el) => {
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) return;
    const tag = el.tagName.toLowerCase();
    blocks.push({
      kind: tag.startsWith("h") ? "heading" : tag === "li" ? "bullet" : "paragraph",
      text,
    });
  });
  return blocks;
}

function blocksFromText(text: string): ScriptDocBlock[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map<ScriptDocBlock>((line) => {
      if (/^#{1,6}\s/.test(line)) return { kind: "heading", text: line.replace(/^#{1,6}\s*/, "") };
      if (/^([-*•]|\d+[.)])\s/.test(line))
        return { kind: "bullet", text: line.replace(/^([-*•]|\d+[.)])\s*/, "") };
      const isHeading = line.length < 70 && line === line.toUpperCase() && /[A-Z]/.test(line);
      return { kind: isHeading ? "heading" : "paragraph", text: line };
    });
}

/** Parse an uploaded script file into displayable blocks. */
export async function parseScriptFile(file: File): Promise<ScriptDoc> {
  const lower = file.name.toLowerCase();
  let blocks: ScriptDocBlock[];

  if (lower.endsWith(".docx")) {
    const mammoth = (await import(
      /* @vite-ignore */ "mammoth/mammoth.browser"
    )) as unknown as {
      convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    };
    const buffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    blocks = blocksFromHtml(result.value);
  } else if (lower.endsWith(".txt") || lower.endsWith(".md") || file.type.startsWith("text/")) {
    blocks = blocksFromText(await file.text());
  } else {
    throw new Error("Unsupported file. Upload a .docx, .txt or .md script.");
  }

  if (!blocks.length) throw new Error("No readable text found in that document.");

  return { name: file.name, uploadedAt: new Date().toISOString(), blocks };
}
