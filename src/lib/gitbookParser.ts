// src/lib/gitbookParser.ts

import type { JSONContent } from "@tiptap/core";
import { parseMarkdownToJSON, preprocessMarkdown, stripFrontmatter } from "../services/gitbookImporter";

/**
 * Parse raw GitBook markdown into a TipTap JSON document.
 *
 * This function performs the same preprocessing steps used during the full
 * GitBook import (hint, tabs, parameter tables, images, etc.) but without any
 * side‑effects such as persisting guides or folders. It returns a JSON object
 * compatible with the TipTap editor.
 *
 * @param mdContent   The raw markdown string exported from GitBook.
 * @param mdPath      Optional virtual path of the markdown file – useful for
 *                     resolving relative image URLs. If omitted, image resolution
 *                     is skipped (images will be omitted from the resulting
 *                     document).
 * @param imageResolver Optional async resolver that receives the markdown path
 *                     and a relative image path and should return a data‑URL or
 *                     public URL string. If not provided, images are ignored.
 * @returns           A TipTap JSON document (`{ type: 'doc', content: [...] }`).
 */
export async function parseGitbookMarkdown(
  mdContent: string,
  mdPath: string = "",
  imageResolver?: (mdPath: string, relImgPath: string) => Promise<string>
): Promise<{ title: string; jsonContent: JSONContent }> {
  const resolver = imageResolver ? imageResolver : async () => "";

  // Preprocess custom GitBook blocks (hints, tabs, parameter tables, images, etc.)
  const { title: fmTitle, markdown: cleanMarkdown } = stripFrontmatter(mdContent);
  const processed = await preprocessMarkdown(cleanMarkdown, mdPath, resolver);
  const json = parseMarkdownToJSON(processed);
  const finalJson = json && json.content ? json : { type: "doc", content: [{ type: "paragraph" }] } as JSONContent;
  return { title: fmTitle, jsonContent: finalJson };
}
