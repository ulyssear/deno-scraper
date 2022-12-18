// @ts-nocheck
const args = Deno.args.reduce((
  acc: { [key: string]: string },
  arg: string,
) => {
  const [key, value] = arg.split("=");
  acc[key.substring(2)] = value;
  return acc;
}, {});

const os = Deno.build.os.toLowerCase();

let prompt = (window as any).prompt ?? function (message: string) {
  Deno.stdout.writeSync(new TextEncoder().encode(message + " "));
  const buf = new Uint8Array(1024);
  const n = Deno.stdin.readSync(buf) as number;
  return new TextDecoder().decode(buf.subarray(0, n)).trim();
};

function section_main_menu() {
  const options = [
    {
      name: "Retroachievements",
      description: "Retrieve the games and their achievements.",
      executable: "retroachievements",
    },
    {
      name: "Metacritic",
      description: "Retrieve the games and their metacritic scores.",
      executable: "metacritic",
    },
    {
      name: "Exit",
      description: "Exit the program.",
      execute: () => {
        console.log("Bye!");
        Deno.exit(0);
      },
    },
  ];

  const choice = create_choice(options);
  execute_choice(options, choice);

  section_browsers({
    executable: options[choice - 1].executable as string,
  });
}

function section_browsers({ executable }: {
  executable: string;
}) {
  const options_browsers = [
    { name: "Chrome" },
    { name: "Firefox" },
    { name: "Edge" },
    {
      name: "Back",
      execute: () => {
        console.clear();
        section_main_menu();
      },
    },
  ];

  const choice_browser = create_choice(options_browsers);
  execute_choice(options_browsers, choice_browser);

  section_headless({
    executable,
    browser: options_browsers[choice_browser - 1].name,
  });
}

function section_headless({ executable, browser }: {
  executable: string;
  browser: string;
}) {
  let headless;
  while (!["y", "n"].includes(headless)) {
    headless = prompt("Headless (y/n) :");
  }

  headless = headless === "y";

  section_run({ executable, browser, headless });
}

function section_run({ executable, browser, headless }: {
  executable: string;
  browser: string;
  headless: boolean;
}) {
  console.debug(
    `Running ${executable} with ${browser} and headless as ${headless}`,
  );
  const process = Deno.run({
    cmd: [
      "deno",
      "run",
      "--unstable",
      "--allow-net",
      "--allow-read",
      "--allow-write",
      "--allow-env",
      "--allow-run",
      `bots/${executable}.ts`,
      `--executable=${browser}`,
      `--headless=${headless}`,
    ],
  });

  process.status().then(({ code }) => {
    return code;
  }).then(async (code) => {
    if (code === 0) {
      // const rawOutput = await process.output();
      // console.log(new TextDecoder().decode(rawOutput));
      return;
    }
    // const rawError = await process.stderrOutput();
    // console.error(new TextDecoder().decode(rawError))
  });
}

function display_options(options: any[]) {
  console.clear();
  for (let i = 0; i < options.length; i++) {
    console.log(`${i + 1}. ${options[i].name}`);
    if (options[i]?.description) {
      console.log(`${" ".repeat(3)}${options[i].description}`);
    }
  }
  console.log();
}

function create_choice(options: any[]) {
  display_options(options);
  let choice;
  while (isNaN(choice) || choice < 1 || choice > options.length) {
    choice = prompt("Choose an option :");
    if (choice) choice = +choice;
  }
  console.log(`You have chosen: ${options[+choice - 1].name}`);
  console.log();
  return +choice;
}

function execute_choice(options: any[], choice: number) {
  if (
    options[+choice - 1].execute &&
    typeof options[+choice - 1].execute === "function"
  ) {
    options[+choice - 1].execute();
    return;
  }
}

(function () {
  if (args.hasOwnProperty("no-interaction")) {
    section_run({
      executable: args.executable,
      browser: args.browser,
      headless: args.headless === "true",
    });
    return;
  }

  section_main_menu();
})();
