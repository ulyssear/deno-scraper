import os from "os";
import puppeteer from "puppeteer";

let HEADLESS,
  EXECUTABLE_PATH,
  ROOT_PATH,
  DATA_DIRECTORY;

const OS = (() => {
  const platform = os.platform();
  const platforms = {
    linux: "linux",
    win32: "windows",
    darwin: "macos",
  };
  return platforms[platform] || "linux";
})();

class EXECUTABLES_DICT {
  static LINUX = {
    FIREFOX: "/usr/bin/firefox",
    CHROME: "/usr/bin/chromium-browser",
    EDGE: "/usr/bin/msedge",
  };
  static WINDOWS = {
    FIREFOX: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
    CHROME: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    EDGE: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  };
  static MACOS = {
    FIREFOX: "/Applications/Firefox.app/Contents/MacOS/firefox",
    CHROME: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    EDGE: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  };
}

class ScraperInterface {
  bot_name;
  date;
  root_path;
  data_directory;
  executable_path;
  os;
  executable;
  headless;

  instance;

  constructor({
    bot_name,
    date = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    })(),
    root_path = ".",
    data_directory = "data",
    executable_path = "",
    os = OS,
    executable = "chrome",
    headless = "true",
  }) {
    this.bot_name = bot_name;
    this.date = date;
    this.root_path = root_path;
    this.data_directory = data_directory;
    this.executable_path = executable_path;
    this.os = os;
    this.executable = executable;
    this.headless = headless === "true";

    HEADLESS = this.headless;
    ROOT_PATH = this.root_path;
    DATA_DIRECTORY = this.data_directory;

    const scraper = new Scraper({
      bot_name: this.bot_name,
      date: this.date,
      root_path: this.root_path,
      data_directory: this.data_directory,
      executable_path: this.executable_path,
      os: this.os,
      executable: this.executable,
      headless: this.headless,
    });

    this.instance = scraper;
  }

  async run({
    mode = "parallel",
    concurrency = Scraper.CHUNK_SIZE,
    wait = 1500,
  }) {
    this.chooseExecutable();
    return this.instance.run({
      mode,
      concurrency,
      wait,
    });
  }

  chooseExecutable() {
    if (this.executable_path) {
      EXECUTABLE_PATH = this.executable_path;
      return this;
    }

    const executable_path =
      (EXECUTABLES_DICT)[this.os.toUpperCase()][
        this.executable.toUpperCase()
      ] || "";

    if (!executable_path) {
      throw new Error(
        `executable_path is not provided and could not be retrieved from os and executable.\nDebug : os: ${this.os} - executable: ${this.executable}`,
      );
    }

    this.executable_path = executable_path;
    EXECUTABLE_PATH = this.executable_path;

    return this;
  }

  addTask(task) {
    return this.instance.addTask(task);
  }
}

class BrowserInterface {
  _browser;
  pages;

  constructor() {
    this._browser = null;
    this.pages = [];
  }

  async start() {
    this._browser = await puppeteer.launch({
      headless: HEADLESS,
      executablePath: EXECUTABLE_PATH,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });
  }

  async stop() {
    const browser = await this.browser();
    await browser.close();
  }

  async newPage() {
    const browser = await this.browser();
    const page = await browser.newPage();
    this.pages.push(page);
    return page;
  }

  async openPage(url) {
    const page = await this.newPage();
    for (let i = 0; i < 3; i++) {
      try {
        await page.goto(url);
        break;
      } catch (e) {
        error(`Error opening page ${url} - ${e}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return page;
  }

  async closePage(page) {
    await page.close();
    this.pages = this.pages.filter((p) => p !== page);
  }

  async closeAllPages() {
    await Promise.all(this.pages.map((page) => page.close()));
    this.pages = [];
  }

  async close() {
    await this.closeAllPages();
    await this.stop();
  }

  async restart() {
    await this.close();
    await this.start();
  }

  async restartPage(page) {
    await this.closePage(page);
    return this.newPage();
  }

  async restartAllPages() {
    await this.closeAllPages();
    return Promise.all(
      Array.from({ length: this.pages.length }).map(() => this.newPage()),
    );
  }

  async restartAll() {
    await this.restartAllPages();
    await this.restart();
  }

  async browser() {
    if (!this._browser) {
      await this.start();
    }

    return this._browser;
  }
}

class Scraper {
  /**
   * The size of the chunk
   * @type {number}
   * @static
   * @readonly
   * @default 10
   */
  static CHUNK_SIZE = 3;
  static TIMEOUTS = [
    800,
    1000,
    2000,
    3000,
    4000,
    5000,
    6000,
    7000,
    8000,
    9000,
    10000,
  ];

  tasks = [];
  bot_name;
  date;

  root_path;
  data_directory;
  executable_path;

  os;
  executable;
  headless;

  browser_interface;

  /**
   * Create a new instance of Scraper
   * @param {string} bot_name - The name of the bot
   * @param {string} date - The date of the scraping
   * @param {string} root_path - The root path of the project
   * @param {string} data_directory - The directory where the data will be stored
   *
   * @example
   * const scraper = new Scraper({
   *  bot_name: "demo",
   *  date: "2021-01-01",
   *  root_path: ".",
   *  data_directory: "data",
   * });
   */

  constructor({
    bot_name,
    date = new Date().toISOString().split("T")[0],
    root_path = ".",
    data_directory = "data",
    executable_path = "",
    os = OS,
    executable = "chrome",
    headless = true,
  }) {
    this.bot_name = bot_name;
    this.date = date;
    this.root_path = root_path;
    this.data_directory = data_directory;
    this.executable_path = executable_path;
    this.os = os;
    this.executable = executable;
    this.headless = headless;

    this.browser_interface = new BrowserInterface();
  }

  /**
   * Add a task to the scraper
   * @param {any} task - The task to add
   *
   * @example
   * scraper.addTask(async () => {
   *  console.log("Hello");
   * });
   *
   * scraper.addTask({
   *  file: "categories",
   *  url: "https://www.example.com/categories",
   *  callable: async (page) => {
   *     console.log("Hello");
   *  },
   * });
   */
  addTask(task) {
    if (typeof task === "function") {
      this.tasks.push(task);
      return this;
    }

    const { file, url, callable, params, save_file } = task;

    const _task = new Task({
      file,
      url,
      callable,
      bot_name: this.bot_name,
      date: this.date,
      browser_interface: this.browser_interface,
      params,
      save_file,
    });

    this.tasks.push(_task.run.bind(_task));

    return this;
  }

  /**
   * Run the scraper
   * @example
   * scraper.run();
   */
  async run({
    mode = "parallel",
    concurrency = Scraper.CHUNK_SIZE,
    wait = 1500,
  } = {}) {
    const browser = await this.browser_interface.browser();
    const tasks = chunk(this.tasks, concurrency);

    log(`Running ${this.tasks.length} tasks in ${tasks.length} chunks...`, {
      bot_name: this.bot_name,
      file: "",
      url: "",
    });

    for (const _chunk of tasks) {
      log(`Running chunk of ${_chunk.length} tasks...`, {
        bot_name: this.bot_name,
        file: "",
        url: "",
      });
      this.tasks = this.tasks.filter((task) => !_chunk.includes(task));

      if ("sequential" === mode) {
        for (const task of _chunk) {
          await task();
          log(`Waiting ${wait}ms...`, {
            bot_name: this.bot_name,
            file: "",
            url: "",
          });
          await new Promise((resolve) => setTimeout(resolve, wait));
        }
      }

      if ("parallel" === mode) {
        await Promise.all(_chunk.map(async (task) => await task()));
        log(`Waiting ${wait}ms...`, {
          bot_name: this.bot_name,
          file: "",
          url: "",
        });
        await new Promise((resolve) => setTimeout(resolve, wait));
      }

      log("Done!", {
        bot_name: this.bot_name,
        file: "",
        url: "",
      });
    }

    log("Done!", {
      bot_name: this.bot_name,
      file: "",
      url: "",
    });

    return this;
  }
}

class Task {
  bot_name;
  date;
  file;
  url;
  callable;
  params;
  save_file;

  browser_interface;

  constructor({
    bot_name,
    date,
    file,
    url = "",
    callable,
    browser_interface,
    params = {},
    save_file = true,
  }) {
    this.bot_name = bot_name;
    this.date = date;
    this.file = file;
    this.url = url;
    this.callable = callable;
    this.params = params;
    this.save_file = save_file;

    if (!this.file.match(/\.json|\.txt|\.xml|\.csv$/)) {
      this.file += ".json";
    }

    this.file = this.file.replace(/[*?]/g, "");

    this.browser_interface = browser_interface;
  }

  async run() {
    let data;

    log("Starting...", {
      bot_name: this.bot_name,
      file: this.file,
      url: this.url,
    });

    if (this.url) {
      const page = await this.browser_interface.openPage(this.url);
      // for (const timeout of Scraper.TIMEOUTS) {
      try {
        data = await this.callable(page, this.browser_interface, this.params);
        log("Saving data...", {
          bot_name: this.bot_name,
          file: this.file,
          url: this.url,
        });
        // break;
      } catch (err) {
        error(err, {
          bot_name: this.bot_name,
          file: this.file,
          url: this.url,
        });
        // console.log(`[INFO] [${new Date().toISOString()}] [${this.bot_name}] [${this.file}] [${this.url}] Retrying in ${timeout}ms...`);
        // await new Promise((resolve) => setTimeout(resolve, timeout));
      }
      // }
    }

    if (this.save_file) {
      const path =
        `${ROOT_PATH}/${DATA_DIRECTORY}/${this.bot_name}/${this.date}/${this.file}`;

      const directory = path.split("/").slice(0, -1).join("/");

      await Deno.mkdir(directory, { recursive: true });
      await Deno.writeTextFile(
        path,
        JSON.stringify({
          bot_name: this.bot_name,
          date: this.date,
          url: this.url,
          data,
        }),
      );
    }

    log("Done!", {
      bot_name: this.bot_name,
      file: this.file,
      url: this.url,
    });

    return data;
  }
}

/**
 * Chunk an array
 * @param arr  - The array to chunk
 * @param size - The size of the chunk
 * @returns - The chunked array
 */
function chunk(
  arr,
  size,
) {
  let chunked_arr = [];
  let index = 0;

  while (index < arr.length) {
    const chunk = arr.slice(index, size + index);
    chunked_arr.push(chunk);
    index += size;
  }

  return chunked_arr;
}

function generic_log(
  message,
  type = "INFO",
  {
    bot_name,
    file,
    url,
  }
) {
  const date = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");

  const string = [];
  string.push(`[${type}]`);
  string.push(`[${date}]`);
  if (bot_name) string.push(`[${bot_name}]`);
  if (file) string.push(`[${file}]`);
  if (url) string.push(`[${url}]`);
  string.push(message);
  console.log(string.join(" "));
}

function log(
  message,
  {
    bot_name,
    file,
    url,
  }
) {
  generic_log(message, "INFO", { bot_name, file, url });
}

function error(
  message,
  {
    bot_name,
    file,
    url,
  }
) {
  generic_log(message, "ERROR", { bot_name, file, url });
}

export default ScraperInterface;
