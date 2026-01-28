import { execSync } from "node:child_process";

const PORT = 5173;

function findPids(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { stdio: "pipe" }).toString();
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/\s+/).pop())
      .map((pid) => Number(pid))
      .filter((pid) => Number.isInteger(pid));
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: "pipe" });
    console.log(`Killed PID ${pid} using port ${PORT}`);
  } catch (error) {
    console.warn(`Could not kill PID ${pid}: ${error.message}`);
  }
}

const pids = Array.from(new Set(findPids(PORT))); // dedupe
if (pids.length) {
  console.log(`Port ${PORT} is in use by PID(s): ${pids.join(", ")}. Terminating...`);
  pids.forEach(killPid);
} else {
  console.log(`Port ${PORT} is free.`);
}
