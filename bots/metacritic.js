import Scraper from "../index.js";
import { $$eval, $eval } from "../helper.js";

const URLS_CATEGORIES = {
  nintendo: {
    gba:
      "https://www.metacritic.com/browse/games/score/metascore/all/gba/filtered",
    n64:
      "https://www.metacritic.com/browse/games/score/metascore/all/n64/filtered",
    gamecube:
      "https://www.metacritic.com/browse/games/score/metascore/all/gamecube/filtered",
    wii:
      "https://www.metacritic.com/browse/games/score/metascore/all/wii/filtered",
    wiiu:
      "https://www.metacritic.com/browse/games/score/metascore/all/wiiu/filtered",
    ds:
      "https://www.metacritic.com/browse/games/score/metascore/all/ds/filtered",
    "3ds":
      "https://www.metacritic.com/browse/games/score/metascore/all/3ds/filtered",
    switch:
      "https://www.metacritic.com/browse/games/score/metascore/all/switch/filtered",
  },
  sony: {
    ps1:
      "https://www.metacritic.com/browse/games/score/metascore/all/ps/filtered",
    ps2:
      "https://www.metacritic.com/browse/games/score/metascore/all/ps2/filtered",
    ps3:
      "https://www.metacritic.com/browse/games/score/metascore/all/ps3/filtered",
    ps4:
      "https://www.metacritic.com/browse/games/score/metascore/all/ps4/filtered",
    ps5:
      "https://www.metacritic.com/browse/games/score/metascore/all/ps5/filtered",
    psvita:
      "https://www.metacritic.com/browse/games/score/metascore/all/vita/filtered",
    psp:
      "https://www.metacritic.com/browse/games/score/metascore/all/psp/filtered",
  },
  microsoft: {
    xbox:
      "https://www.metacritic.com/browse/games/score/metascore/all/xbox/filtered",
    xbox360:
      "https://www.metacritic.com/browse/games/score/metascore/all/xbox360/filtered",
    xboxone:
      "https://www.metacritic.com/browse/games/score/metascore/all/xboxone/filtered",
  },
  sega: {
    dreamcast:
      "https://www.metacritic.com/browse/games/score/metascore/all/dreamcast/filtered",
  },
  other: {
    pc:
      "https://www.metacritic.com/browse/games/score/metascore/all/pc/filtered",
  },
};

const args = Object.assign(
  {
    bot_name: "metacritic",
  },
  process.argv.reduce((acc, arg) => {
    const [key, value] = arg.split("=");
    acc[key.substring(2)] = value;
    return acc;
  }, {}),
);
    

const scraper = new Scraper(args);

await scraper.chooseExecutable();

for (const [company, urls] of Object.entries(URLS_CATEGORIES)) {
  for (const [platform, url] of Object.entries(urls)) {
    scraper.addTask({
      file: `${encodeURIComponent(company)}/${encodeURIComponent(platform)}`,
      save_file: false,
      url,
      callable: callableCategories,
      params: { company },
    });
  }
}

await scraper.run({
  mode: "sequential",
  wait: 3000,
});

async function callableCategories(
  page,
  browser,
  params = {},
) {
  let company = "";
  if (params.company) {
    company = params.company;
  }
  const games = await $$eval(
    page,
    ".clamp-list tbody tr:not(.spacer)",
    (elements, params = {}) => {
      let company = "";
      if (params.company) {
        company = params.company;
      }
      let games = [];
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const title = element.querySelector("a.title h3").innerText;
        const cover = element.querySelector("td.clamp-image-wrap img")
          .src;
        const metascore = element.querySelector("div.metascore_w")
          .innerText;
        const userscore = element.querySelector("div.metascore_w.user")
          .innerText;
        const release_date = element.querySelector(
          ".clamp-details .platform + span",
        ).innerText;
        const description = element.querySelector(".summary")
          .innerText;
        const url = element.querySelector("a.title").href;
        const platform = element.querySelector(".platform .data")
          .innerText;

        const game = {
          title,
          description,
          cover,
          url,
          platform,
          release_date,
          metascore,
          userscore,
          company,
        };

        games.push(game);
      }

      return games;
    },
    { company },
  );

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const { title, url, platform, company } = game;
    scraper.addTask({
      file: `${encodeURIComponent(company)}/${encodeURIComponent(platform)}/${
        encodeURIComponent(title)
      }`,
      url,
      callable: callableGame,
    });
  }

  await browser.closePage(page);

  await scraper.run({
    mode: "sequential",
    wait: 1500,
  });

  return games;
}

async function callableGame(
  page,
  browser,
) {
  const game_details = await $eval(page, ".left", (element) => {
    const game_details = {};
    const title = element.querySelector("h1").innerText;
    const publisher = element.querySelector(".summary_detail.publisher .data")
      ?.innerText.trim();
    const summary = element.querySelector(".summary_detail.product_summary")
      ?.innerText.trim();
    const release_date = element.querySelector(
      ".summary_detail.release_data .data",
    )?.innerText.trim();
    const others_platforms = element.querySelector(
      ".summary_detail.product_platforms .data",
    )?.innerText.trim();
    const videos = element.querySelector("video")?.src;
    const cover = element.querySelector(".product_image img")?.src;
    const mustplay = element.querySelector(".must_play")
      ? true
      : false;
    const metascore = element.querySelector(".metascore_w")
      ?.innerText;
    const user_score = element.querySelector(".metascore_w user")
      ?.innerText;
    const developer = element.querySelector(".summary_detail.developer .data")
      ?.innerText.trim();
    const genre = element.querySelector(".summary_detail.product_genre .data")
      ?.innerText.trim();
    const players = element.querySelector(
      ".summary_detail.product_players .data",
    )?.innerText.trim();
    const rating_esrb = element.querySelector(
      ".summary_detail.product_rating .data",
    )?.innerText.trim();
    const cheats = element.querySelector(".summary_detail.product_cheats a")
      ?.href.trim();
    const more = element.querySelector(".summary_detail.product_more a")?.href
      .trim();

    game_details.title = title;
    game_details.publisher = publisher;
    game_details.summary = summary;
    game_details.release_date = release_date;
    game_details.others_platforms = others_platforms;
    game_details.videos = videos;
    game_details.cover = cover;
    game_details.mustplay = mustplay;
    game_details.metascore = metascore;
    game_details.user_score = user_score;
    game_details.developer = developer;
    game_details.genres = genre;
    game_details.players = players;
    game_details.rating_esrb = rating_esrb;
    game_details.cheats = cheats;
    game_details.more = more;

    return game_details;
  });
  await browser.closePage(page);
  return game_details;
}
