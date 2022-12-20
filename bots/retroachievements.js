import Scraper from "../index.js";
import { $, $$eval, $eval } from "../helper.js";

const args = Object.assign(
  {
    bot_name: "retroachievements",
  },
  process.argv.reduce((acc, arg) => {
    const [key, value] = arg.split("=");
    acc[key.substring(2)] = value;
    return acc;
  }, {}),
);

const scraper = new Scraper(args);

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

async function callableGame(page, browser) {
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
  };

  const mainpage = await $(page, "#mainpage");
  const leftcontainer = await $(mainpage, "#leftcontainer");
  const achievement = await $(leftcontainer, "#achievement");
  const achievementlist = await $(achievement, "table.achievementlist");

  const title = await $eval(
    achievement,
    "h3",
    (h3) => h3.innerText,
  );
  if (title) entry.title = title;

  const cover_alt = await $eval(
    leftcontainer,
    "img",
    (img) => img.src,
  );
  if (cover_alt) entry.cover_alt = cover_alt;

  const images = await $$eval(achievement, "div > div > img", (imgs) => {
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      if (img.src) {
        imgs[i] = img.src;
      }
    }
    return imgs;
  });
  if (images) entry.images = images;

  const table = await $(achievement, "table");

  const developer = await $eval(
    table,
    "tr:nth-child(1) > td:nth-child(2) > b",
    (b) => b.innerText,
  );
  if (developer) entry.developer = developer;

  const publisher = await $eval(
    table,
    "tr:nth-child(2) > td:nth-child(2) > b",
    (b) => b.innerText,
  );
  if (publisher) entry.publisher = publisher;

  const genre = await $eval(
    table,
    "tr:nth-child(3) > td:nth-child(2) > b",
    (b) => b.innerText,
  );
  if (genre) entry.genre = genre;

  const release_date = await $eval(
    table,
    "tr:nth-child(4) > td:nth-child(2) > b",
    (b) => b.innerText,
  );
  if (release_date) entry.release_date = release_date;

  const rightcontainer = await $(mainpage, "#rightcontainer");

  try {
    const checksum_link = await $eval(
      rightcontainer,
      "ul > li:nth-child(2) > a",
      (a) => a.href,
    );
    if (checksum_link) {
      const checksum_page = await browser.newPage();
      await checksum_page.goto(checksum_link);

      const checksum = await $eval(
        checksum_page,
        "code",
        (code) => code.innerText?.trim(),
      );
      if (checksum) entry.checksum = checksum;

      await checksum_page.close();
    }
  } catch (e) {
    console.error(e);
  }

  if (!entry.checksum) {
    const forum_link = await $eval(rightcontainer, "a", (a) => a.href);
    if (forum_link) {
      const forum_page = await browser.openPage(forum_link);

      const checksum = await $eval(forum_page, ".comment", (comment) => {
        const text = comment.innerText.trim();
        const match = text.match(/([0-9a-f]{32})/);
        if (match) {
          return match[1];
        }
        return null;
      });

      if (checksum) entry.checksum = checksum;

      await forum_page.close();
    }
  }

  const cover = await $eval(
    rightcontainer,
    "img",
    (img) => img.src,
  );
  if (cover) entry.cover = cover;

  let achievements;

  if (achievementlist) {
    const rows = await $$eval(
      achievementlist,
      "tbody > tr:not(:first-child)",
      async (rows) => {
        let _rows = [],
          _generic_achievement = {
            name: "",
            badge: "",
            url: "",
            description: "",
            points: "",
            points_hardcore: "",
            players: "",
            players_hardcore: "",
          };

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const _achievement = Object.assign({}, _generic_achievement);

          const title = row.querySelector(".achievementdata a");
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

          const badge = row.querySelector("a:nth-child(1) > img");
          if (badge) _achievement.badge = badge.src;

          const description = row.querySelector("div.mb-2");
          if (description) _achievement.description = description?.innerText;

          const true_ratio = row.querySelector("span.TrueRatio");
          if (true_ratio) {
            const match = true_ratio.innerText.match(/\((\d+)\)/);
            if (match) {
              _achievement.points_hardcore = +match[1];
            }
          }

          const players = row.querySelector("div.progressbar-label");
          if (players) {
            const match = players.innerText.match(/(\d+) \((\d+)\) of (\d+)/);
            if (match) {
              _achievement.players = +match[1];
              _achievement.players_hardcore = +match[2];
            }
          }
          _rows.push(_achievement);
        }

        return _rows;
      },
    );
    achievements = rows;
  }

  const players = await $eval(
    page,
    ".progressbar-label",
    (players) => players.innerText,
  );
  if (players) {
    const match = players.match(/of (\d+)/);
    if (match) {
      entry.players = match[1];
    }
  }

  entry.achievements = achievements;

  await browser.closePage(page);

  return entry;
}

async function callableGameConsole(page, browser) {
  const table = await $(page, "table");

  const headers = await $$eval(
    table,
    "tbody > tr:first-child > th:not(:first-child)",
    (headers) => {
      let _headers = [];
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        _headers.push(header.innerText);
      }
      _headers.push("URL");
      return _headers;
    },
  );

  const rows = await $$eval(
    table,
    "tbody > tr:not(:first-child)",
    (rows) => {
      let _rows = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = Array.from(
          row.querySelectorAll("td:not(:first-child)"),
        );
        const url = cells[0].querySelector("a")?.href;
        let texts = [];
        for (let j = 0; j < cells.length; j++) {
          const cell = cells[j];
          texts.push(cell.innerText);
        }

        if (url) texts.push(url);
        _rows.push(texts);
      }
      return _rows;
    },
  );

  for (const row of rows) {
    if (!row) continue;
    const url = row[row.length - 1];
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

async function callableHome(page, browser) {
  await page.setDefaultNavigationTimeout(0);

  const entries = await $$eval(
    page,
    "#innermenu > ul > li > div > ul",
    (lists) => {
      let _lists = [];
      for (let i = 0; i < lists.length; i++) {
        const list = lists[i];
        const items = Array.from(list.querySelectorAll("li"));
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          const a = item.querySelector('a[href*="gameList.php"]');
          if (a) {
            _lists.push({
              name: a.innerText,
              url: a.href,
            });
            continue;
          }
          _lists.push({
            name: item.innerText,
            url: null,
          });
        }
      }
      return _lists;
    },
  );

  const sections = {};
  let current_section = "Uncategorized";
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
