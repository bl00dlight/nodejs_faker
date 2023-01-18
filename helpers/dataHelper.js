const currentDate = () => {
  const date = new Date();

  const currentDate = `${date.getFullYear()}-${(
    "0" +
    (date.getMonth() + 1)
  ).slice(-2)}-${("0" + date.getDate()).slice(-2)}`;

  return currentDate;
};

function dataPrettier(data) {
  const formatedData = `${data.getFullYear()}-${(
    "0" +
    (data.getMonth() + 1)
  ).slice(-2)}-${("0" + data.getDate()).slice(-2)}`;
  return formatedData;
}
function getPreviousDay(minusDay = 1, date = new Date()) {
  const previous = new Date(date.getTime());
  previous.setDate(date.getDate() - minusDay);
  const exportDate = dataPrettier(previous);
  return exportDate;
}

const dataHelper = () => {
  const prevprevDay = getPreviousDay(2); // За какой день берем результаты
  const previousDay = getPreviousDay(1);
  const currentDay = currentDate();
  const exportDate = {
    prevprevDay: prevprevDay,
    prevDay: previousDay,
    currentDay: currentDay,
  };
  return exportDate;
};

export default dataHelper();
