import { app, BrowserWindow, screen, session } from "electron";
import winston from "winston";
import * as path from "path";
import * as fs from "fs";

import { nody_greeter } from "./config";
import { URL } from "url";

const myFormat = winston.format.printf(
  ({ level, message, sourceID, line, timestamp }) => {
    return `${timestamp} [ ${level.toLocaleUpperCase()} ] ${sourceID} ${line}: ${message}`;
  }
);

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    myFormat
  ),
  defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.Console({
      stderrLevels: ["debug", "warn", "error"],
    }),
  ],
  exitOnError: false,
});

class Browser {
  ready = false;

  constructor() {
    app.whenReady().then(() => {
      this.init();
    })
  }

  // @ts-ignore
  win: BrowserWindow;

  whenReady(): Promise<void> {
    return new Promise((resolve) => {
      let interval = setInterval(() => {
        if (this.ready) {
          resolve();
          clearInterval(interval);
        }
      }, 100);
    });
  }

  init() {
    this.win = this.create_window();
    this.load_theme();
    this.init_listeners();
  }

  load_theme(): void {
    let theme = nody_greeter.config.greeter.theme;
    let dir = nody_greeter.app.theme_dir;
    let path_to_theme = path.join(dir, theme, "index.html");
    let def_theme = "gruvbox";

    if (!fs.existsSync(path_to_theme)) {
      logger.log({
        level: "warn",
        message: `"${theme}" theme does not exists. Using "${def_theme}" theme`,
        sourceID: path.basename(__filename),
        line: __line,
      });
      path_to_theme = path.join(dir, def_theme, "index.html");
    }

    this.win.loadFile(path_to_theme);
    this.win.setBackgroundColor("#000000");

    logger.log({
      level: "debug",
      message: "Theme loaded",
      sourceID: path.basename(__filename),
      line: __line,
    });
  }

  create_window() {
    logger.log({
      level: "debug",
      message: "Initializing Browser Window",
      sourceID: path.basename(__filename),
      line: __line,
    });

    let screen_size = screen.getPrimaryDisplay().workAreaSize;

    let win = new BrowserWindow({
      //fullscreen: nody_greeter.app.fullscreen,
      height: screen_size.height,
      width: screen_size.width,
      backgroundColor: "#000000",
      frame: nody_greeter.app.frame,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: false,
        //nodeIntegrationInWorker: true,
        allowRunningInsecureContent: !nody_greeter.config.greeter.secure_mode, // Should set option
        devTools: nody_greeter.app.debug_mode, // Should set option
      },
    });

    logger.log({
      level: "debug",
      message: "Browser Window created",
      sourceID: path.basename(__filename),
      line: global.__line,
    });

    this.ready = true;

    return win;
  }

  init_listeners() {
    this.win.once("ready-to-show", () => {
      this.win.setFullScreen(nody_greeter.app.fullscreen);
      this.win.show();
      this.win.focus();
      logger.log({
        level: "debug",
        message: "Nody Greeter started",
        sourceID: path.basename(__filename),
        line: __line,
      });
    });

    session.defaultSession.webRequest.onBeforeSendHeaders(
      (details, callback) => {
        let url = new URL(details.url);
        let block =
          !(
            url.protocol.includes("file") || url.protocol.includes("devtools")
          ) && nody_greeter.config.greeter.secure_mode;
        callback({ cancel: block });
      }
    );
  }
}

export { Browser };