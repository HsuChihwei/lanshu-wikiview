import { app, BrowserWindow } from "electron";
import { createServer, type AddressInfo } from "net";
import { spawn, type ChildProcess } from "child_process";
import * as path from "path";
import * as http from "http";

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let serverPort = 0;

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address() as AddressInfo;
      srv.close(() => resolve(addr.port));
    });
  });
}

function getStandaloneDir(): string {
  return path.join(app.getAppPath(), ".next", "standalone");
}

function waitForServer(port: number, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = (): void => {
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        res.resume();
        if (
          res.statusCode === 200 ||
          res.statusCode === 307 ||
          res.statusCode === 308
        ) {
          resolve();
        } else {
          retry();
        }
      });
      req.on("error", retry);
      req.end();
    };

    const retry = (): void => {
      if (Date.now() - start > timeoutMs) {
        reject(
          new Error(`Next.js server did not start within ${timeoutMs}ms`)
        );
      } else {
        setTimeout(check, 250);
      }
    };

    check();
  });
}

async function startNextServer(): Promise<number> {
  const port = await findFreePort();
  const standaloneDir = getStandaloneDir();
  const serverPath = path.join(standaloneDir, "server.js");

  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(`[next] ${chunk}`);
  });
  serverProcess.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(`[next] ${chunk}`);
  });
  serverProcess.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`[next] exited with code=${code} signal=${signal}`);
    }
  });

  try {
    await waitForServer(port);
  } catch (err) {
    serverProcess.kill("SIGTERM");
    throw err;
  }

  return port;
}

function createWindow(port: number): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "LanShu WikiView",
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);
  mainWindow.on("page-title-updated", (e) => e.preventDefault());

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function cleanup(): void {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill("SIGKILL");
      }
    }, 3_000).unref();
  }
}

app
  .whenReady()
  .then(async () => {
    serverPort = await startNextServer();
    createWindow(serverPort);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(serverPort);
      }
    });
  })
  .catch((err) => {
    console.error("Failed to start LanShu WikiView:", err);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", cleanup);
