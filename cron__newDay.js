// Суточное обнуление

import mysql from "mysql2/promise";

const dbConnection = {
  connectionLimit: 10,
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
    return;
  }
};

const resetDailyLogs = await getQueryData(
  "UPDATE `stat`.`seo_site_keyword` SET `is_strict_page_parsing`='0';"
);

const resetSites = await getQueryData(
  "UPDATE `stat`.`seo_site` SET `daily_check_date`='';"
);

console.log("Начинаем сделующий день.");
