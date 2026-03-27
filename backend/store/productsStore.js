const path = require("path");
const fs = require("fs/promises");

const DATA_FILE = path.join(__dirname, "..", "data", "products.json");
const SEED_FILE = path.join(__dirname, "..", "data", "products.seed.json");

let writeQueue = Promise.resolve();

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    const seedRaw = await fs.readFile(SEED_FILE, "utf-8");
    await fs.writeFile(DATA_FILE, seedRaw, "utf-8");
  }
}

async function readAll() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw || "[]");
}

async function writeAll(list) {
  await ensureDataFile();
  const payload = JSON.stringify(list, null, 2);
  writeQueue = writeQueue.then(() => fs.writeFile(DATA_FILE, payload, "utf-8"));
  return writeQueue;
}

async function add(product) {
  const list = await readAll();
  list.push(product);
  await writeAll(list);
  return product;
}

async function patch(id, patchObj) {
  const list = await readAll();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patchObj };
  await writeAll(list);
  return list[idx];
}

async function remove(id) {
  const list = await readAll();
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  await writeAll(next);
  return true;
}

module.exports = { readAll, add, patch, remove };

