// A YAML subset reader for the config this repo writes.
// Accepts comments, single-quoted strings, null, bools, ints, [], and
// indent-2 maps and scalar lists. It is not a general YAML parser.

export function parseYamlSubset(text) {
  const lines = String(text).split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, value: root, kind: "obj" }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indent = line.match(/^ */)[0].length;
    if (indent % 2 !== 0) throw new Error(`odd indent at line ${i + 1}: ${line}`);
    const content = stripComment(line.trim());
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1];

    if (content.startsWith("- ")) {
      if (parent.kind !== "arr") {
        throw new Error(`list item outside an array at line ${i + 1}: ${line}`);
      }
      parent.value.push(parseScalar(content.slice(2).trim()));
      continue;
    }

    const match = content.match(/^([A-Za-z0-9_]+):(.*)$/);
    if (!match) throw new Error(`bad line ${i + 1}: ${line}`);
    if (parent.kind !== "obj") throw new Error(`key inside an array at line ${i + 1}: ${line}`);

    const key = match[1];
    const rest = match[2].trim();
    if (rest === "[]") {
      parent.value[key] = [];
      continue;
    }
    if (rest === "") {
      const next = nextContent(lines, i + 1);
      if (next !== null && next.trim().startsWith("- ")) {
        const arr = [];
        parent.value[key] = arr;
        stack.push({ indent, value: arr, kind: "arr" });
      } else {
        const obj = {};
        parent.value[key] = obj;
        stack.push({ indent, value: obj, kind: "obj" });
      }
      continue;
    }
    parent.value[key] = parseScalar(rest);
  }

  return root;
}

export function leafPaths(value, prefix = "", out = []) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of Object.keys(value)) {
      leafPaths(value[key], prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  out.push(prefix);
  return out;
}

function nextContent(lines, start) {
  for (let i = start; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    return lines[i];
  }
  return null;
}

function stripComment(text) {
  let out = "";
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      out += char;
      if (char === quote) {
        if (quote === "'" && text[i + 1] === "'") {
          out += text[i + 1];
          i++;
          continue;
        }
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      out += char;
      continue;
    }
    if (char === "#") break;
    out += char;
  }
  return out.trim();
}

function parseScalar(raw) {
  const text = raw.trim();
  if (text === "null" || text === "~") return null;
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+$/.test(text)) return Number(text);
  if (text === "[]") return [];
  if (text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
  if (text.startsWith('"') && text.endsWith('"')) return JSON.parse(text);
  return text;
}
