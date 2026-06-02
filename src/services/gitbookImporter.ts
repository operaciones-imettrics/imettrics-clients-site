import { v4 as uuidv4 } from "uuid";
import JSZip from "jszip";
import { parseGitbookMarkdown } from "../lib/gitbookParser";
import { Editor, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { storage } from "./storage";
import type { Folder, Guide } from "../types";

import { ResizableImage } from "../components/Editor/extensions/ResizableImage";
import { CalloutExtension } from "../components/Editor/extensions/CalloutExtension";
import { StatusBadgeExtension } from "../components/Editor/extensions/StatusBadgeExtension";
import { ParameterTableExtension } from "../components/Editor/extensions/ParameterTableExtension";
import { CollapsibleBlock, CollapsibleSection, CollapsibleSummary, CollapsibleContent } from "../components/Editor/extensions/CollapsibleExtension";

// Interfaces
interface SummaryItem {
  title: string;
  path?: string;
  indent: number;
  children: SummaryItem[];
}

interface ImportStats {
  folderCount: number;
  guideCount: number;
  firstGuideId: string | null;
}

// 1. Image Compressor
async function compressImage(base64Str: string, maxWidth = 600, quality = 0.5): Promise<string> {
  if (!base64Str.startsWith("data:image/")) return base64Str;
  if (base64Str.startsWith("data:image/svg+xml")) return base64Str; // Skip SVGs

  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      } else if (base64Str.length < 150000) {
        // Skip small images to preserve quality and reduce load
        resolve(base64Str);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

// 2. MIME type helper
function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "svg": return "image/svg+xml";
    case "webp": return "image/webp";
    default: return "image/png";
  }
}

// 3. Resolve Relative Paths
function resolveRelativePath(basePath: string, relativePath: string): string {
  const parts = basePath.split("/");
  parts.pop(); // Remove current file name to get base directory
  
  const relParts = relativePath.split("/");
  for (const part of relParts) {
    if (part === "." || part === "") {
      continue;
    } else if (part === "..") {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/");
}

// 4. Strip Frontmatter
export function stripFrontmatter(markdown: string) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
  const match = markdown.match(frontmatterRegex);
  let title = "";
  let cleanMarkdown = markdown;
  
  if (match) {
    cleanMarkdown = markdown.replace(frontmatterRegex, "");
    const yamlContent = match[1];
    const titleMatch = yamlContent.match(/^title:\s*(["']?)(.*?)\1\s*$/m);
    if (titleMatch) {
      title = titleMatch[2];
    }
  }
  return { title, markdown: cleanMarkdown };
}

// 5. Parameter Table Parser
function translateParameterTables(markdown: string): string {
  const lines = markdown.split("\n");
  const resultLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const headerRow = line;
      const headers = headerRow.split("|").map(s => s.trim().toLowerCase()).filter(s => s !== "");
      
      const hasParam = headers.some(h => h.includes("param") || h.includes("nombre") || h.includes("name"));
      const hasType = headers.some(h => h.includes("tipo") || h.includes("type"));
      
      if (hasParam && hasType && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.trim().startsWith("|") && nextLine.includes("---")) {
          const rows: { parameter: string; value: string; type: string }[] = [];
          let j = i + 2;
          
          while (j < lines.length && lines[j].trim().startsWith("|") && lines[j].trim().endsWith("|")) {
            const cells = lines[j].split("|").map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
            
            const parameter = cells[0] ? cells[0].replace(/[`*]/g, "") : "";
            const value = cells[1] ? cells[1].replace(/[`*]/g, "") : "";
            const type = cells[2] ? cells[2].replace(/[`*]/g, "") : "";
            
            if (parameter || value || type) {
              rows.push({ parameter, value, type });
            }
            j++;
          }
          
          const jsonRows = JSON.stringify(rows);
          const tableHtml = `\n<div data-type="parameter-table" rows='${jsonRows.replace(/'/g, "&#39;")}' columnwidths="[33,33,34]"></div>\n`;
          resultLines.push(tableHtml);
          
          i = j;
          continue;
        }
      }
    }
    
    resultLines.push(line);
    i++;
  }

  return resultLines.join("\n");
}

// Helper function to decode hexadecimal and decimal HTML entities
function decodeEntities(str: string): string {
  if (!str) return str;
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

// Helper function to convert basic inline Markdown inside HTML structures into clean HTML tags
function convertInlineMarkdownToHTML(text: string): string {
  if (!text) return text;
  let result = text;
  // Bold: **text**
  result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Inline code: `code`
  result = result.replace(/`(.*?)`/g, "<code>$1</code>");
  // Italic: *text* (avoiding spaces next to asterisks to avoid accidental math matching)
  result = result.replace(/\*([^\s*](?:.*?[^\s*])?)\*/g, "<em>$1</em>");
  return result;
}

// 6. Preprocess GitBook Blocks (hints, details, tabs)
function preprocessMarkdownBlocks(markdown: string): string {
  let result = markdown;

  // Process parameter tables first
  result = translateParameterTables(result);

  // Process Hints
  const hintRegex = /{% hint style="([a-zA-Z]+)" %}\r?\n([\s\S]*?)\r?\n{% endhint %}/g;
  result = result.replace(hintRegex, (_, style, content) => {
    let type = "info";
    if (style === "danger" || style === "warning") {
      type = "warning";
    } else if (style === "success") {
      type = "success";
    }
    const htmlContent = convertInlineMarkdownToHTML(content);
    return `<div data-type="callout" type="${type}">${htmlContent}</div>`;
  });

  // Process Details
  const detailsRegex = /{% details title="([^"]*)" %}\r?\n([\s\S]*?)\r?\n{% enddetails %}/g;
  result = result.replace(detailsRegex, (_, title, content) => {
    const htmlContent = convertInlineMarkdownToHTML(content);
    return `<details><summary>${title}</summary><div class="collapsible-content">${htmlContent}</div></details>`;
  });

  // Process Tabs
  const tabsRegex = /{% tabs %}\r?\n([\s\S]*?)\r?\n{% endtabs %}/g;
  result = result.replace(tabsRegex, (_, tabsContent) => {
    const tabBlockRegex = /{% tab title="([^"]*)" %}\r?\n([\s\S]*?)\r?\n{% endtab %}/g;
    let tabsHtml = "";
    let tabMatch;
    
    while ((tabMatch = tabBlockRegex.exec(tabsContent)) !== null) {
      const title = tabMatch[1].trim();
      const content = tabMatch[2];
      
      if (title.toLowerCase() === "parámetros" || title.toLowerCase() === "parametros") {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, "text/html");
          const rows = doc.querySelectorAll("tr");
          const parameterRows: { parameter: string; value: string; type: string }[] = [];
          
          // Skip first row which is the repeated bold header
          for (let r = 1; r < rows.length; r++) {
            const cells = rows[r].querySelectorAll("td");
            if (cells.length >= 2) {
              const parameter = cells[0].textContent?.trim() || "";
              const value = cells[1].textContent?.trim() || "";
              const type = cells[2]?.textContent?.trim() || "Default";
              
              if (parameter || value) {
                parameterRows.push({ parameter, value, type });
              }
            }
          }
          
          if (parameterRows.length > 0) {
            const jsonRows = JSON.stringify(parameterRows);
            tabsHtml += `\n<div data-type="parameter-table" rows='${jsonRows.replace(/'/g, "&#39;")}' columnwidths="[33,33,34]"></div>\n`;
          }
        } catch (e) {
          console.error("Error parsing parameter table HTML", e);
          tabsHtml += `\n<!-- Error al parsear tabla de parámetros -->\n`;
        }
      } else if (title.toLowerCase() === "datalayer") {
        const codeMatch = content.match(/```(?:javascript)?\r?\n([\s\S]*?)\r?\n```/);
        const codeText = codeMatch ? codeMatch[1].trim() : content.trim();
        tabsHtml += `\n\`\`\`javascript\n${codeText}\n\`\`\`\n`;
      } else {
        // Fallback for generic tabs
        tabsHtml += `\n<details><summary>Pestaña: ${title}</summary><div class="collapsible-content">\n\n${content}\n\n</div></details>\n`;
      }
    }
    return tabsHtml || tabsContent;
  });

  return result;
}

// 7. Parse Markdown to Tiptap JSON content headlessly
export function parseMarkdownToJSON(markdown: string): JSONContent {
  const editor = new Editor({
    extensions: [
      StarterKit,
      ResizableImage,
      CalloutExtension,
      StatusBadgeExtension,
      ParameterTableExtension,
      CollapsibleBlock,
      CollapsibleSection,
      CollapsibleSummary,
      CollapsibleContent,
      Markdown.configure({
        html: true,
        tightLists: true,
        tightListClass: "tight",
        bulletListMarker: "-",
        linkify: true,
        breaks: true,
      }),
    ],
    content: markdown,
  });

  const json = editor.getJSON();
  editor.destroy();
  return json;
}

// 8. Preprocess markdown files (strip yaml, convert images, callouts)
export async function preprocessMarkdown(
  markdown: string,
  mdPath: string,
  imageResolver: (mdPath: string, relImgPath: string) => Promise<string>
): Promise<string> {
  let processed = preprocessMarkdownBlocks(markdown);
  
  // Preprocess Headings: convert H3 to H4, and strip any bold asterisks inside H3 and H4 headings
  const lines = processed.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h3Match = line.match(/^(###)\s+(.*)$/);
    const h4Match = line.match(/^(####)\s+(.*)$/);
    
    if (h3Match) {
      let content = h3Match[2].trim();
      content = content.replace(/\*\*(.*?)\*\*/g, "$1");
      lines[i] = `#### ${content}`;
    } else if (h4Match) {
      let content = h4Match[2].trim();
      content = content.replace(/\*\*(.*?)\*\*/g, "$1");
      lines[i] = `#### ${content}`;
    }
  }
  processed = lines.join("\n");
  
  // 1. Decode HTML entities globally
  processed = decodeEntities(processed);

  // 2. Clean empty HTML anchor tags (like ## Title <a href="#id" id="id"></a>)
  processed = processed.replace(/<a\s+[^>]*>\s*<\/a>/gi, "");

  // 3. Translate backslash escapes in event names or anywhere (e.g. select\_content -> select_content)
  processed = processed.replace(/\\_/g, "_");

  // Preserve <figure> tags by stripping the wrapper but keeping its content (img + figcaption)
  processed = processed.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, (_, inner) => inner.trim());

  // Markdown image matching: ![alt](path)
  const mdImgRegex = /!\[(.*?)\]\((.*?)\)/g;
  const matches: { fullMatch: string; alt: string; path: string }[] = [];
  let match;
  while ((match = mdImgRegex.exec(processed)) !== null) {
    let path = match[2].trim();
    if (path.startsWith("<") && path.endsWith(">")) {
      path = path.slice(1, -1);
    }
    matches.push({ fullMatch: match[0], alt: match[1], path });
  }

  for (const m of matches) {
    if (!m.path.startsWith("http://") && !m.path.startsWith("https://") && !m.path.startsWith("data:")) {
      try {
        const dataUrl = await imageResolver(mdPath, m.path);
        if (dataUrl) {
          processed = processed.replace(m.fullMatch, `![${m.alt}](${dataUrl})`);
        } else {
          // Fallback to filename (clean up path)
          const fileName = m.path.split("/").pop() || m.path;
          processed = processed.replace(m.fullMatch, `![${m.alt}](${fileName})`);
        }
      } catch (err) {
        console.warn(`Could not resolve image ${m.path} for guide ${mdPath}`, err);
        const fileName = m.path.split("/").pop() || m.path;
        processed = processed.replace(m.fullMatch, `![${m.alt}](${fileName})`);
      }
    }
  }

  // HTML img matching: <img src="path" />
  const htmlImgRegex = /<img\s+[^>]*src=["'](.*?)["'][^>]*>/g;
  const htmlMatches: { fullMatch: string; path: string }[] = [];
  while ((match = htmlImgRegex.exec(processed)) !== null) {
    htmlMatches.push({ fullMatch: match[0], path: match[1] });
  }

  for (const hm of htmlMatches) {
    if (!hm.path.startsWith("http://") && !hm.path.startsWith("https://") && !hm.path.startsWith("data:")) {
      try {
        const dataUrl = await imageResolver(mdPath, hm.path);
        if (dataUrl) {
          const newTag = hm.fullMatch.replace(hm.path, dataUrl);
          processed = processed.replace(hm.fullMatch, newTag);
        } else {
          const fileName = hm.path.split("/").pop() || hm.path;
          const newTag = hm.fullMatch.replace(hm.path, fileName);
          processed = processed.replace(hm.fullMatch, newTag);
        }
      } catch (err) {
        console.warn(`Could not resolve HTML image ${hm.path} for guide ${mdPath}`, err);
        const fileName = hm.path.split("/").pop() || hm.path;
        const newTag = hm.fullMatch.replace(hm.path, fileName);
        processed = processed.replace(hm.fullMatch, newTag);
      }
    }
  }

  return processed;
}

// 9. SUMMARY.md parser
export function parseSummary(summaryText: string): SummaryItem[] {
  const lines = summaryText.split("\n");
  const items: SummaryItem[] = [];
  
  const activeItemsByIndent: { [key: number]: SummaryItem } = {};

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      const title = headerMatch[1].trim();
      const item: SummaryItem = {
        title,
        indent: -1,
        children: [],
      };
      items.push(item);
      continue;
    }

    const listItemMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (listItemMatch) {
      const indentStr = listItemMatch[1];
      const indent = indentStr.length;
      const content = listItemMatch[2].trim();

      const linkMatch = content.match(/^\[(.*?)\]\((.*?)\)$/);
      let title = content;
      let path: string | undefined = undefined;
      
      if (linkMatch) {
        title = linkMatch[1];
        path = linkMatch[2];
        path = path.split("#")[0].split("?")[0];
      }

      const item: SummaryItem = {
        title,
        path,
        indent,
        children: [],
      };

      let parent: SummaryItem | null = null;
      let possibleParentIndent = indent - 1;
      while (possibleParentIndent >= 0) {
        if (activeItemsByIndent[possibleParentIndent]) {
          parent = activeItemsByIndent[possibleParentIndent];
          break;
        }
        possibleParentIndent--;
      }

      if (parent) {
        parent.children.push(item);
      } else {
        items.push(item);
      }

      activeItemsByIndent[indent] = item;
    }
  }

  return items;
}

// 10. Core Import Function
export async function importGitBook(
  input: File | File[],
  onProgress?: (progress: number) => void,
  options?: { skipImages?: boolean; onStatusChange?: (fileName: string, phase: "pre" | "mig" | "lnk") => void }
): Promise<ImportStats> {
  const isZip = !Array.isArray(input);
  
  let fileNames: string[] = [];
  let zipInstance: JSZip | null = null;
  let filesList: File[] = [];
  
  if (isZip) {
    try {
      zipInstance = await JSZip.loadAsync(input as File);
    } catch (err) {
      console.error('Error loading ZIP file:', err);
      throw new Error('No se pudo leer el archivo ZIP. Asegúrate de que sea un archivo .zip válido.');
    }
    fileNames = Object.keys(zipInstance.files);
  } else {
    filesList = input as File[];
    fileNames = filesList.map(f => f.webkitRelativePath);
  }

  // A. Find SUMMARY.md and Root Prefix
  let summaryFileKey = "";
  let rootPrefix = "";
  
  for (const name of fileNames) {
    if (name.toLowerCase().endsWith("summary.md")) {
      summaryFileKey = name;
      const idx = name.toLowerCase().lastIndexOf("summary.md");
      rootPrefix = name.substring(0, idx);
      break;
    }
  }

  // B. Define Readers
  const fileReader = async (relativePath: string): Promise<string | null> => {
    // Use the full key as stored in the zip (including any root prefix)
    const fullPath = rootPrefix ? rootPrefix + relativePath : relativePath;
    if (isZip && zipInstance) {
      const file = zipInstance.file(fullPath) || zipInstance.file(relativePath);
      if (file) return await file.async("string");
    } else {
      const file = filesList.find(f => f.webkitRelativePath === fullPath || f.webkitRelativePath.endsWith(relativePath));
      if (file) return await file.text();
    }
    return null;
  };

  const imageResolver = async (mdPath: string, relImgPath: string): Promise<string> => {
    if (options?.skipImages) {
      return ""; // Skip converting images
    }

    // 1. Resolve relative to mdPath
    let resolvedPath = resolveRelativePath(mdPath, relImgPath);

    // Helper to attempt find the file in the archive or file list
    const tryFind = (path: string): boolean => {
      const key = rootPrefix + path;
      if (isZip && zipInstance) {
        return !!(zipInstance.file(key) || zipInstance.file(path));
      } else {
        return filesList.some(f => f.webkitRelativePath === key || f.webkitRelativePath.endsWith(path));
      }
    };

    // 2. Normal lookup
    let found = tryFind(resolvedPath);

    // 3. If not found, iteratively strip leading ../ segments (GitBook often stores assets with ../../)
    let attempts = 0;
    while (!found && attempts < 5) {
      if (resolvedPath.startsWith("../")) {
        resolvedPath = resolvedPath.replace(/^\.\/\../, "");
        found = tryFind(resolvedPath);
      } else {
        break;
      }
      attempts++;
    }

    // 4. Fallback: try path relative to project root (remove any leading slash)
    if (!found) {
      const rootPath = relImgPath.startsWith("/") ? relImgPath.substring(1) : relImgPath;
      resolvedPath = rootPath;
      found = tryFind(resolvedPath);
    }

    if (!found) return ""; // Image not found after all attempts

    let base64 = "";
    const mimeType = getMimeType(resolvedPath);
    
    // 5. Load file contents
    if (isZip && zipInstance) {
      const file = zipInstance.file(rootPrefix + resolvedPath) || zipInstance.file(resolvedPath);
      if (file) {
        base64 = await file.async("base64");
      }
    } else {
      const file = filesList.find(f => f.webkitRelativePath === rootPrefix + resolvedPath || f.webkitRelativePath.endsWith(resolvedPath));
      if (file) {
        const arrBuffer = await file.arrayBuffer();
        // Convert arrayBuffer to base64
        let binary = "";
        const bytes = new Uint8Array(arrBuffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64 = btoa(binary);
      }
    }
    
    if (!base64) return "";

    const rawDataUrl = `data:${mimeType};base64,${base64}`;
    // Compress image to fit within localStorage limits (using max width 800 and quality 0.6)
    return await compressImage(rawDataUrl, 800, 0.6);
  };

  // C. Parse Hierarchy
  let summaryItems: SummaryItem[] = [];
  const summaryText = summaryFileKey ? await fileReader(summaryFileKey.substring(rootPrefix.length)) : null;

  if (summaryText) {
    summaryItems = parseSummary(summaryText);
  } else {
    // Fallback: Auto-generate flat structure of all markdown files
    const mdFiles = fileNames.filter(name => name.endsWith(".md") && !name.toLowerCase().endsWith("summary.md"));
    summaryItems = mdFiles.map(name => {
      const cleanPath = name.substring(rootPrefix.length);
      const title = cleanPath.split("/").pop()?.replace(".md", "") || "Guía";
      return {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        path: cleanPath,
        indent: 0,
        children: []
      };
    });
  }

  // D. Create a new root folder for the import
  const spaceName = isZip 
    ? (input as File).name.replace(".zip", "")
    : (filesList[0]?.webkitRelativePath.split("/")[0] || "Importación");
    
  const importRootFolderId = uuidv4();
  const importRootFolder: Folder = {
    id: importRootFolderId,
    name: `Importación: ${spaceName}`,
    parentId: null,
  };
  storage.saveFolder(importRootFolder);

  // E. Recursively Import Items
  let importedFolderCount = 1; // start with the root import folder
  let importedGuideCount = 0;
  let firstGuideId: string | null = null;
  
  const importedGuideIds: { [key: string]: string } = {};
  
  // Count total guides to import for progress bar
  let totalGuides = 0;
  const countGuides = (items: SummaryItem[]) => {
    for (const item of items) {
      if (item.path) totalGuides++;
      countGuides(item.children);
    }
  };
  countGuides(summaryItems);
  if (totalGuides === 0) totalGuides = 1;
  // Helper to estimate current localStorage usage (approx bytes)
  const estimateStorageSize = () => {
    try {
      const data = localStorage.getItem('ga4_measurement_guides');
      return data ? data.length : 0;
    } catch {
      return 0;
    }
  };
  const STORAGE_LIMIT = 4.5 * 1024 * 1024; // ~4.5 MiB safety margin

  let processedCount = 0;

  const importSummaryItem = async (
    item: SummaryItem,
    parentFolderId: string | null
  ): Promise<string | null> => {
    let currentFolderId = parentFolderId;
    const isFolderNode = item.children.length > 0 || item.indent === -1;
    
    if (isFolderNode) {
      // Before creating any folder, verify storage quota
      if (estimateStorageSize() > STORAGE_LIMIT) {
        console.warn('LocalStorage quota reached before folder creation. Skipping remaining imports.');
        // Abort further processing by throwing a custom error
        throw new Error('QuotaExceeded');
      }
      // Generate a unique ID for the new folder
      const folderId = uuidv4();
      const folder: Folder = {
        id: folderId,
        name: item.title,
        parentId: parentFolderId,
      };
      storage.saveFolder(folder);
      importedFolderCount++;
      currentFolderId = folderId;
    }

    let guideId: string | null = null;
    if (item.path) {
      if (options?.onStatusChange) {
        options.onStatusChange(item.title || item.path, "pre");
      }
      const rawMarkdown = await fileReader(item.path);
      if (rawMarkdown !== null) {
        guideId = uuidv4();
        if (!firstGuideId) firstGuideId = guideId;

        if (options?.onStatusChange) {
          options.onStatusChange(item.title || item.path, "mig");
        }
        const { title, jsonContent } = await parseGitbookMarkdown(rawMarkdown, item.path, imageResolver);

        const guide: Guide = {
          id: guideId,
          title: title || item.title || "Guía sin título",
          content: jsonContent,
          folderId: currentFolderId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          // Before saving guide, verify storage quota
        if (estimateStorageSize() > STORAGE_LIMIT) {
          console.warn('LocalStorage quota reached. Enabling image skipping for remaining imports.');
          // Enable skipImages for the rest of the import
          options = { ...(options || {}), skipImages: true };
        }
        try {
          storage.saveGuide(guide);
        } catch (e: any) {
          if (e.name === 'QuotaExceededError' || e.message?.includes('storage')) {
            console.warn('LocalStorage quota reached while saving guide. Skipping remaining guides.');
            throw new Error('QuotaExceeded');
          } else {
            throw e;
          }
        }
        } catch (e: any) {
          if (e.name === 'QuotaExceededError' || e.message?.includes('storage')) {
            console.warn('LocalStorage quota reached. Skipping remaining image imports.');
            // Enable image skipping for the rest of the import
            ; // will be handled by the outer loop's options flag
          } else {
            throw e;
          }
        }
        importedGuideCount++;
        importedGuideIds[item.path.toLowerCase()] = guideId;
      }
            processedCount++;
        // After each guide, check storage usage; if exceeded, enforce image skipping for remaining imports
        if (estimateStorageSize() > STORAGE_LIMIT) {
          options = { ...(options || {}), skipImages: true };
        }
        if (onProgress) {
          onProgress(Math.round((processedCount / totalGuides) * 100));
        }
      }

    // Children
    for (const child of item.children) {
      await importSummaryItem(child, currentFolderId);
    }

    return guideId;
  };

  // Run the import recursively starting at the root folder we created
  for (const item of summaryItems) {
    await importSummaryItem(item, importRootFolderId);
  }

  // F. Second Pass: Resolve internal links
  const resolveInternalLinksInGuide = (guideId: string, guidePath: string) => {
    const guide = storage.getGuide(guideId);
    if (!guide) return;

    let modified = false;

    const traverseNodes = (node: any) => {
      if (!node) return;
      
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === "link" && mark.attrs && mark.attrs.href) {
            const href = mark.attrs.href;
            if (!href.startsWith("http://") && !href.startsWith("https://") && !href.startsWith("data:") && href.toLowerCase().includes(".md")) {
              const [pathPart, anchorPart] = href.split("#");
              const resolvedPath = resolveRelativePath(guidePath, pathPart);
              
              const targetGuideId = importedGuideIds[resolvedPath.toLowerCase()];
              if (targetGuideId) {
                mark.attrs.href = `#guide-${targetGuideId}${anchorPart ? "#" + anchorPart : ""}`;
                modified = true;
              }
            }
          }
        }
      }

      if (node.content) {
        for (const child of node.content) {
          traverseNodes(child);
        }
      }
    };

    traverseNodes(guide.content);

    if (modified) {
      storage.saveGuide(guide);
    }
  };

  for (const path of Object.keys(importedGuideIds)) {
    const guideId = importedGuideIds[path];
    const guide = storage.getGuide(guideId);
    if (guide && options?.onStatusChange) {
      options.onStatusChange(guide.title, "lnk");
    }
    resolveInternalLinksInGuide(guideId, path);
  }

  return {
    folderCount: importedFolderCount,
    guideCount: importedGuideCount,
    firstGuideId,
  };
}
