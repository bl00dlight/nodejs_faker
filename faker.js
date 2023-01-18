import mysql from "mysql2/promise";
import serp from "serp";
import dateHelper from "./helpers/dataHelper.js";

async function app() {

  const dbConnection = {
    //connectionLimit: 50,
    host: "",
    user: "",
    database: "",
    password: "",
    waitForConnections: true,
  };

  let connection = mysql.createPool(dbConnection);

  const getQueryData = async (sql) => {
    try {
      const [data] = await connection.query(sql);
      return data;
    } catch (error) {
      console.log(error);
      await connection.end();
      return;
    }
  };

  const proxy = await getQueryData(
    "SELECT `proxy_host`, `proxy_auth` FROM `stat`.`seo_proxy` ORDER BY RAND() LIMIT 1;"
  );

  const siteId = await getQueryData(
    "SELECT `site_id`,`site_active` FROM `stat`.`seo_site` WHERE `daily_check_date` != '" +
      dateHelper.currentDay +
      "' AND `site_active` = 1 LIMIT 1;"
  );

  if (siteId.length === 0) {
    const noReywordQueqe = async () => {
      console.log("Больше нечего снимать.");
      await setTimeout(() => {}, 1000000);
    };
    noReywordQueqe();
    await connection.end();
    return;
  }

  const siteName = await getQueryData(
    "SELECT `site_name` FROM `stat`.`seo_site` WHERE `site_id` = " +
      siteId[0].site_id +
      ";"
  );
  const keyWordId = await getQueryData(
    "SELECT `site_keyword_id`, `site_keyword_keyword` FROM `stat`.`seo_site_keyword` WHERE  `site_id`= " +
      siteId[0].site_id +
      " AND `is_strict_page_parsing` = 0 ORDER BY RAND() LIMIT 1;"
  );

  if (keyWordId && keyWordId.length === 0) {
    const keyWordId = await getQueryData(
      "UPDATE `stat`.`seo_site` SET `daily_check_date`='" +
        dateHelper.currentDay +
        "' WHERE `site_id` = " +
        siteId[0].site_id +
        ";"
    );
    console.log(
      "Сайт",
      siteName[0].site_name,
      "снят. Дата",
      dateHelper.currentDay
    );
    await connection.end();
    return;
  }

  const keyWord2SearchId = await getQueryData(
    "SELECT `site_keyword2search_engine_id`,`search_engine_id` FROM `stat`.`seo_site_keyword2search_engine` WHERE `site_keyword_id` = " +
      keyWordId[0].site_keyword_id +
      ";"
  );

  const searchEngine = await getQueryData(
    "SELECT `search_engine_url`, `search_engine_params` FROM `stat`.`seo_search_engine` WHERE `search_engine_id` = " +
      keyWord2SearchId[0].search_engine_id +
      ";"
  );

  const prevPosition = await getQueryData(
    "SELECT `search_log_position`, `search_log_status`,`search_log_date`,`k2se_id` FROM `stat`.`seo_search_log` WHERE `k2se_id` = " +
      keyWord2SearchId[0].site_keyword2search_engine_id +
      " AND `search_log_date` = '" +
      dateHelper.prevDay +
      "';"
  );
  const prevprevPosition = await getQueryData(
    "SELECT `search_log_position`, `search_log_status`,`search_log_date`,`k2se_id` FROM `stat`.`seo_search_log` WHERE `k2se_id` = " +
      keyWord2SearchId[0].site_keyword2search_engine_id +
      " AND `search_log_date` = '" +
      dateHelper.prevprevDay +
      "';"
  );

  const serpParserData = {
    proxyHost: proxy[0].proxy_host.split(":"),
    proxyAuth: proxy[0].proxy_auth.split(":"),
    siteId: siteId[0].site_id,
    siteActive: siteId[0].site_active,
    siteName: siteName[0].site_name,
    siteKeyWordId: keyWordId[0].site_keyword_id,
    siteKeyWord: keyWordId[0].site_keyword_keyword,
    siteKeyWord2SearchEngine: keyWord2SearchId[0].site_keyword2search_engine_id,
    siteSearchEngineId: keyWord2SearchId[0].search_engine_id,
    siteSearchEngine: searchEngine[0].search_engine_url,
    siteSearchEngineParams: JSON.parse(searchEngine[0].search_engine_params),
    data: dateHelper.currentDay,
  };

  function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  if (prevPosition.length < 1) {
    console.log("Проблема с данными");
    await connection.end();
    return;
  }

  let position = 0;
  let sqlResultText = "not_found";
  let prevResultPosition = [];
  let prevPrevResultPosition = [];

  prevResultPosition = prevPosition.pop().search_log_position;

  if (prevprevPosition.length === 0) {
    prevPrevResultPosition = prevResultPosition;
  } else {
    prevPrevResultPosition = prevprevPosition.pop().search_log_position;
  }

  let relationNumber = prevResultPosition % prevPrevResultPosition;
  if (prevPrevResultPosition === 0 && prevResultPosition === 0) {
    relationNumber = 0;
  }

  if (prevResultPosition != 0 && prevPrevResultPosition != 0) {
    if (prevPrevResultPosition === 0) {
      //prevPrevResultPosition = 100;
    }
    if (prevResultPosition === 0) {
      //prevResultPosition = 100;
    }
    position = randomNumber(prevResultPosition, prevPrevResultPosition);
    sqlResultText = "success";
  }

  await getQueryData(
    "DELETE FROM `stat`.`seo_search_log` WHERE `k2se_id` = '" +
      serpParserData.siteKeyWord2SearchEngine +
      "' AND `search_log_date` = '" +
      dateHelper.currentDay +
      "';"
  );

  await getQueryData(
    "INSERT INTO `stat`.`seo_search_log` (`search_log_depth`, `search_log_position`, `search_log_status`, `search_log_date`, `k2se_id`) VALUES ('100', '" +
      position +
      "', '" +
      sqlResultText +
      "', '" +
      dateHelper.currentDay +
      "', '" +
      serpParserData.siteKeyWord2SearchEngine +
      "');"
  );
  const setIsStrictPasring = await getQueryData(
    "UPDATE `stat`.`seo_site_keyword` SET `is_strict_page_parsing` = 1 WHERE  `site_keyword_id`= " +
      keyWordId[0].site_keyword_id +
      ";"
  );

  await connection.end();

  if (!keyWordId[0].site_keyword_id) {
    console.log("no keyword id", keyWordId);
  }

  console.log(
    "Сайт",
    serpParserData.siteName,
    "по ключу [",
    serpParserData.siteKeyWord,
    "] занимает фейковую",
    position,
    "позицию.",
    "Ост. от делен.",
    relationNumber,
    ". Пред. результаты [",
    prevResultPosition,
    "|",
    prevPrevResultPosition,
    "]."
  );
  return;

  let hlLocale = "uk";
  let browserLocale = "uk-UA";

  switch (serpParserData.siteSearchEngineParams.hl) {
    case "ru":
      hlLocale = "uk-UA";
      browserLocale = "ru";
    case "pl":
      hlLocale = "pl";
      browserLocale = "pl-PL";
    case "uk":
      hlLocale = "uk";
    case "ua":
      hlLocale = "uk";
      browserLocale = "uk-UA";
  }

  const options = {
    host: serpParserData.siteSearchEngine,
    qs: {
      q: serpParserData.siteKeyWord,
      filter: 0,
      pws: 0,
      cr: "country" + serpParserData.siteSearchEngineParams.gl.toUpperCase(),
      hl: hlLocale,
      //gl: hlLocale,
      num: 100,
    },
    proxy: {
      server: serpParserData.proxyHost.join(":"),
      username: serpParserData.proxyAuth[0],
      password: serpParserData.proxyAuth[1],
    },
    //num: 100,
    delay: 2000,
    retry: 1,
    geolocation: {
      latitude: 48.383023,
      longitude: 31.1828698,
      accuracy: 1,
    },
    locale: browserLocale,
    // scrapeApiUrl:
    //   "http://api.scraperapi.com/?api_key=6a6bbff7e2cf5cd1e86b39c37800ea37",
  };

  const serpLinks = async () => {
    const links = await serp.search(options);
    return links;
  };

  let sitePosition = 0;

  try {
    serpLinks().then((serpResult) => {
      if (serpResult.length > 0) {
        //console.log("Result", serpResult);
        const uniqarray = [];
        // serpResult.forEach((item, i) => {
        //   const host = new URL(item.url);
        //   if (!uniqarray.includes(host.hostname)) {
        //     uniqarray.push(host.hostname.replace("www.", ""));
        //   }
        // });
        //sitePosition = uniqarray.indexOf(serpParserData.siteName) + 1;

        let siteTempPosition = [];
        let sqlResultText = "";

        let counter = 0;

        serpResult.forEach((data, index) => {
          const domain = new URL(data.url);
          const preetyDomain = domain.host.replace("www.", "");
          //console.log(preetyDomain, serpParserData.siteName);
          if (preetyDomain === serpParserData.siteName) {
            siteTempPosition[counter] = index + 1;
            counter++;
          }
        });

        if (siteTempPosition[0]) {
          sitePosition = siteTempPosition[0];
          sqlResultText = "success";
        } else {
          sitePosition = 0;
          sqlResultText = "not_found";
        }

        connection = mysql.createPool(dbConnection);
        //console.log(sitePosition);
        try {
          const writeSitePosition = async () => {
            await getQueryData(
              "DELETE FROM `stat`.`seo_search_log` WHERE `k2se_id` = '" +
                serpParserData.siteKeyWord2SearchEngine +
                "' AND `search_log_date` = '" +
                formatedData +
                "';"
            );

            await getQueryData(
              "INSERT INTO `stat`.`seo_search_log` (`search_log_depth`, `search_log_position`, `search_log_status`, `search_log_date`, `k2se_id`) VALUES ('100', '" +
                sitePosition +
                "', '" +
                sqlResultText +
                "', '" +
                formatedData +
                "', '" +
                serpParserData.siteKeyWord2SearchEngine +
                "');"
            );
            const setIsStrictPasring = await getQueryData(
              "UPDATE `stat`.`seo_site_keyword` SET `is_strict_page_parsing` = 1 WHERE  `site_keyword_id`= " +
                keyWordId[0].site_keyword_id +
                ";"
            );

            console.log(
              "Сайт",
              serpParserData.siteName,
              "по ключу [",
              serpParserData.siteKeyWord,
              "] занимает",
              sitePosition,
              "позицию."
            );
          };

          writeSitePosition().then(() => {
            connection.end();
          });
        } catch (error) {
          console.log("Запись позиции не удалась.", error);
        }
      } else {
        // В выдаче не найдены результаты, записываем 0 в позицию
        // connection = mysql.createPool(dbConnection);

        // const writeNotfoundResult = async () => {
        //   await getQueryData(
        //     "DELETE FROM `stat`.`seo_search_log` WHERE `k2se_id` = '" +
        //       serpParserData.siteKeyWord2SearchEngine +
        //       "' AND `search_log_date` = '" +
        //       formatedData +
        //       "';"
        //   );
        //   await getQueryData(
        //     "INSERT INTO `stat`.`seo_search_log` (`search_log_depth`, `search_log_position`, `search_log_status`, `search_log_date`, `k2se_id`) VALUES ('100', '0', 'not_found', '" +
        //       formatedData +
        //       "', '" +
        //       serpParserData.siteKeyWord2SearchEngine +
        //       "');"
        //   );
        //   await getQueryData(
        //     "UPDATE `stat`.`seo_site_keyword` SET `is_strict_page_parsing` = 1 WHERE  `site_keyword_id`= " +
        //       keyWordId[0].site_keyword_id +
        //       ";"
        //   );
        //   console.log(
        //     "Сайт",
        //     serpParserData.siteName,
        //     "по ключу [",
        //     serpParserData.siteKeyWord,
        //     "] в выдаче не нашли."
        //   );
        // };
        // writeNotfoundResult();
        return;
      }
    });
  } catch (error) {
    console.log("Чтение позиций не удалась", error);
  }
}

//app();

setInterval(app, 1000);
