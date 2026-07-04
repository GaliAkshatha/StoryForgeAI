import { MemoryStore } from "./memory/MemoryStore";
import { MemoryClient } from "./memory/MemoryClient";

const store = new MemoryStore();
const memory = new MemoryClient(store);

console.log("===== Memory Test =====");

memory.set("story", "Hello StoryForge!");

const story = memory.get<string>("story");

console.log(story);

console.log(memory.has("story"));

console.log(memory.keys());

memory.delete("story");

console.log(memory.has("story"));