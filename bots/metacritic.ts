import Scraper from "../index.ts";
import { $$eval, $eval } from "../helper.ts";

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
} as any;

const args = Deno.args.reduce((
  acc: { [key: string]: string | number | boolean | undefined },
  arg: string,
) => {
  const [key, value] = arg.split("=");
  acc[key.substring(2) as string] = value as string;
  return acc;
}, {
  bot_name: "metacritic",
}) as any;

const scraper = new Scraper(args) as any;

await scraper.chooseExecutable();

for (const [company, urls] of Object.entries(URLS_CATEGORIES)) {
  for (const [platform, url] of Object.entries(urls as any)) {
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
  page: any,
  browser: any,
  params = {} as any,
) {
  let company: string = "";
  if (params.company) {
    company = params.company;
  }
  const games = await $$eval(
    page,
    ".clamp-list tbody tr:not(.spacer)",
    (elements: any, params = {} as any) => {
      let company: string = "";
      if (params.company) {
        company = params.company;
      }
      let games = [] as Game[];
      for (let i = 0 as number; i < elements.length; i++) {
        const element = elements[i] as any;
        const title = element.querySelector("a.title h3").innerText as string;
        const cover = element.querySelector("td.clamp-image-wrap img")
          .src as string;
        const metascore = element.querySelector("div.metascore_w")
          .innerText as string;
        const userscore = element.querySelector("div.metascore_w.user")
          .innerText as string;
        const release_date = element.querySelector(
          ".clamp-details .platform + span",
        ).innerText as string;
        const description = element.querySelector(".summary")
          .innerText as string;
        const url = element.querySelector("a.title").href as string;
        const platform = element.querySelector(".platform .data")
          .innerText as string;

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
        } as Game;

        games.push(game);
      }

      return games;
    },
    { company },
  ) as Game[];

  for (let i = 0 as number; i < games.length; i++) {
    const game = games[i] as Game;
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

interface Game {
  title: string;
  description: string;
  cover: string;
  metascore: string;
  userscore: string;
  release_date: string;
  url: string;
  platform: string;
  company: string;
  publisher: string;
  summary: string;
  others_platforms: string;
  videos: string;
  mustplay: boolean;
  user_score: string;
  critic_score: string;
  genres: string;
  developer: string;
  players: string;
  rating_esrb: string;
  cheats: string;
  more: string;
}

async function callableGame(
  page: any,
  browser: any,
) {
  const game_details = await $eval(page, ".left", (element: any) => {
    const game_details = {} as Game;
    const title = element.querySelector("h1").innerText as string;
    const publisher = element.querySelector(".summary_detail.publisher .data")
      ?.innerText.trim() as string;
    const summary = element.querySelector(".summary_detail.product_summary")
      ?.innerText.trim() as string;
    const release_date = element.querySelector(
      ".summary_detail.release_data .data",
    )?.innerText.trim() as string;
    const others_platforms = element.querySelector(
      ".summary_detail.product_platforms .data",
    )?.innerText.trim() as string;
    const videos = element.querySelector("video")?.src as string;
    const cover = element.querySelector(".product_image img")?.src as string;
    const mustplay = element.querySelector(".must_play")
      ? true
      : false as boolean;
    const metascore = element.querySelector(".metascore_w")
      ?.innerText as string;
    const user_score = element.querySelector(".metascore_w user")
      ?.innerText as string;
    const developer = element.querySelector(".summary_detail.developer .data")
      ?.innerText.trim() as string;
    const genre = element.querySelector(".summary_detail.product_genre .data")
      ?.innerText.trim() as string;
    const players = element.querySelector(
      ".summary_detail.product_players .data",
    )?.innerText.trim() as string;
    const rating_esrb = element.querySelector(
      ".summary_detail.product_rating .data",
    )?.innerText.trim() as string;
    const cheats = element.querySelector(".summary_detail.product_cheats a")
      ?.href.trim() as string;
    const more = element.querySelector(".summary_detail.product_more a")?.href
      .trim() as string;

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
  }) as any;
  await browser.closePage(page);
  return game_details;
}
