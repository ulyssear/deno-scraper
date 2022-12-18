import Scraper from "../index.ts";
import { $, $$eval, $eval } from "../helper.ts";

const args = Deno.args.reduce((
  acc: { [key: string]: string | number | boolean | undefined },
  arg: string,
) => {
  const [key, value] = arg.split("=");
  acc[key.substring(2) as string] = value as string;
  return acc;
}, {
  bot_name: "retroachievements",
}) as any;

const scraper = new Scraper(args) as any;

await scraper
  .chooseExecutable()
  .addTask({
    file: "categories",
    url: "https://retroachievements.org/",
    callable: callableHome,
  })
  .run({});

scraper.run({
  mode: "sequential",
  wait: 1500,
});

async function callableGame(page: any, browser: any) {
  const entry = {
    title: "",
    cover: "",
    cover_alt: "",
    developer: "",
    publisher: "",
    release_date: "",
    genre: "",
    checksum: "",
    players: "",
    rating: "",
    achievements: [],
    images: [],
  } as any;

  const mainpage = await $(page, "#mainpage") as any;
  const leftcontainer = await $(mainpage, "#leftcontainer") as any;
  const achievement = await $(leftcontainer, "#achievement") as any;
  const achievementlist = await $(achievement, "table.achievementlist") as any;

  const title = await $eval(
    achievement,
    "h3",
    (h3: any) => h3.innerText,
  ) as any;
  if (title) entry.title = title;

  const cover_alt = await $eval(
    leftcontainer,
    "img",
    (img: any) => img.src,
  ) as any;
  if (cover_alt) entry.cover_alt = cover_alt;

  const images = await $$eval(achievement, "div > div > img", (imgs: any) => {
    for (let i = 0 as number; i < imgs.length; i++) {
      const img = imgs[i];
      if (img.src) {
        imgs[i] = img.src;
      }
    }
    return imgs;
  }) as any;
  if (images) entry.images = images;

  const table = await $(achievement, "table") as any;

  const developer = await $eval(
    table,
    "tr:nth-child(1) > td:nth-child(2) > b",
    (b: any) => b.innerText,
  ) as any;
  if (developer) entry.developer = developer;

  const publisher = await $eval(
    table,
    "tr:nth-child(2) > td:nth-child(2) > b",
    (b: any) => b.innerText,
  ) as any;
  if (publisher) entry.publisher = publisher;

  const genre = await $eval(
    table,
    "tr:nth-child(3) > td:nth-child(2) > b",
    (b: any) => b.innerText,
  ) as any;
  if (genre) entry.genre = genre;

  const release_date = await $eval(
    table,
    "tr:nth-child(4) > td:nth-child(2) > b",
    (b: any) => b.innerText,
  ) as any;
  if (release_date) entry.release_date = release_date;

  const rightcontainer = await $(mainpage, "#rightcontainer") as any;

  try {
    const checksum_link = await $eval(
      rightcontainer,
      "ul > li:nth-child(2) > a",
      (a: any) => a.href,
    ) as any;
    if (checksum_link) {
      const checksum_page = await browser.newPage() as any;
      await checksum_page.goto(checksum_link);

      const checksum = await $eval(
        checksum_page,
        "code",
        (code) => code.innerText?.trim(),
      ) as any;
      if (checksum) entry.checksum = checksum;

      await checksum_page.close();
    }
  } catch (e) {
    console.error(e);
  }

  if (!entry.checksum) {
    const forum_link = await $eval(rightcontainer, "a", (a) => a.href) as any;
    if (forum_link) {
      const forum_page = await browser.openPage(forum_link) as any;

      const checksum = await $eval(forum_page, ".comment", (comment: any) => {
        const text = comment.innerText.trim();
        const match = text.match(/([0-9a-f]{32})/);
        if (match) {
          return match[1];
        }
        return null;
      }) as any;

      if (checksum) entry.checksum = checksum;

      await forum_page.close();
    }
  }

  const cover = await $eval(
    rightcontainer,
    "img",
    (img: any) => img.src,
  ) as any;
  if (cover) entry.cover = cover;

  let achievements;

  if (achievementlist) {
    const rows = await $$eval(
      achievementlist,
      "tbody > tr:not(:first-child)",
      async (rows: any) => {
        let _rows = [] as any[],
          _generic_achievement = {
            name: "",
            badge: "",
            url: "",
            description: "",
            points: "",
            points_hardcore: "",
            players: "",
            players_hardcore: "",
          } as any;

        for (let i = 0 as number; i < rows.length; i++) {
          const row = rows[i];
          const _achievement = Object.assign({}, _generic_achievement);

          const title = row.querySelector(".achievementdata a") as any;
          let {
            innerText: _name,
            href: _url,
          } = title;
          if (title) {
            const match_points = _name.match(/\((\d+)\)/);
            if (match_points) _achievement.points = +match_points[1];

            _achievement.name = _name.replace(/\(\d+\)/, "").trim();
            _achievement.url = _url;
          }

          const badge = row.querySelector("a:nth-child(1) > img") as any;
          if (badge) _achievement.badge = badge.src;

          const description = row.querySelector("div.mb-2") as any;
          if (description) _achievement.description = description?.innerText;

          const true_ratio = row.querySelector("span.TrueRatio") as any;
          if (true_ratio) {
            const match = true_ratio.innerText.match(/\((\d+)\)/);
            if (match) {
              _achievement.points_hardcore = +match[1];
            }
          }

          const players = row.querySelector("div.progressbar-label") as any;
          if (players) {
            const match = players.innerText.match(/(\d+) \((\d+)\) of (\d+)/);
            if (match) {
              _achievement.players = +match[1];
              _achievement.players_hardcore = +match[2];
            }
          }
          _rows.push(_achievement as never);
        }

        return _rows;
      },
    ) as any[];
    achievements = rows;
  }

  const players = await $eval(
    page,
    ".progressbar-label",
    (players: any) => players.innerText,
  ) as any;
  if (players) {
    const match = players.match(/of (\d+)/) as any[];
    if (match) {
      entry.players = match[1];
    }
  }

  entry.achievements = achievements;

  await browser.closePage(page);

  return entry;
}

async function callableGameConsole(page: any, browser: any) {
  const table = await $(page, "table") as any;

  const headers = await $$eval(
    table,
    "tbody > tr:first-child > th:not(:first-child)",
    (headers: any) => {
      let _headers = [] as any[];
      for (let i = 0 as number; i < headers.length; i++) {
        const header = headers[i];
        _headers.push(header.innerText as never);
      }
      _headers.push("URL" as never);
      return _headers;
    },
  ) as any[];

  const rows = await $$eval(
    table,
    "tbody > tr:not(:first-child)",
    (rows: any) => {
      let _rows = [] as any[];
      for (let i = 0 as number; i < rows.length; i++) {
        const row = rows[i] as any;
        const cells = Array.from(
          row.querySelectorAll("td:not(:first-child)"),
        ) as any[];
        const url = cells[0].querySelector("a")?.href as any;
        let texts = [] as any[];
        for (let j = 0 as number; j < cells.length; j++) {
          const cell = cells[j] as any;
          texts.push(cell.innerText as never);
        }

        if (url) texts.push(url as never);
        _rows.push(texts as never);
      }
      return _rows;
    },
  ) as any[];

  for (const row of rows) {
    if (!row) continue;
    const url = row[row.length - 1] as any;
    if (!url) {
      continue;
    }
    scraper.addTask({
      file: `${encodeURIComponent(this.section)}/${
        encodeURIComponent(this.item.name)
      }/${encodeURIComponent(row[0])}`,
      url,
      callable: callableGame,
    });
  }

  await browser.closePage(page);

  return {
    headers,
    rows,
  };
}

async function callableHome(page: any, browser: any) {
  await page.setDefaultNavigationTimeout(0);

  const entries = await $$eval(
    page,
    "#innermenu > ul > li > div > ul",
    (lists: any) => {
      let _lists = [] as any[];
      for (let i = 0 as number; i < lists.length; i++) {
        const list = lists[i] as any;
        const items = Array.from(list.querySelectorAll("li")) as any[];
        for (let j = 0 as number; j < items.length; j++) {
          const item = items[j] as any;
          const a = item.querySelector('a[href*="gameList.php"]') as any;
          if (a) {
            _lists.push({
              name: a.innerText,
              url: a.href,
            } as never);
            continue;
          }
          _lists.push({
            name: item.innerText,
            url: null,
          } as never);
        }
      }
      return _lists;
    },
  ) as any[];

  const sections = {} as any;
  let current_section = "Uncategorized" as string;
  for (const entry of entries) {
    if (!current_section) {
      if (sections[current_section].length === 0) {
        delete sections[current_section];
      }
      current_section = entry.name || "Uncategorized";
      sections[current_section] = [];
      continue;
    }

    if (entry.url) {
      sections[current_section].push(entry);
      continue;
    }

    current_section = entry.name;
    sections[current_section] = [];
  }

  for (const section of Object.keys(sections)) {
    for (const item of sections[section]) {
      if (!item.url) {
        continue;
      }
      scraper.addTask({
        file: `${encodeURIComponent(section)}/${encodeURIComponent(item.name)}`,
        url: item.url,
        callable: callableGameConsole.bind({
          section,
          item,
        }),
      });
    }
  }

  await scraper.run({
    mode: "sequential",
    wait: 1500,
  });

  return sections;
}
