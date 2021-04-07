import getTimestamp from '../getTimestamp/index.js';

const START_TS = Date.UTC(2020, 11, 27);
const START_DATE = new Date(START_TS).toISOString().slice(0, 10);
const START = {
  TS: START_TS,
  DATE: START_DATE,
};

const toNumber = string => {
  const newString = string.replace('.', '').replace(',', ''); // string.reaplaceAll -> node v15.0
  const dot = newString.indexOf('.');
  const comma = newString.indexOf(',');
  if (dot === -1 && comma === -1) {
    return +newString;
  }
  return toNumber(newString);
};

const getTimestamps = async page => {
  const refreshed = await getTimestamp(page);
  const today_ts = Date.now();
  const today = {
    ts: Date.now(),
    date: new Date(today_ts).toISOString().slice(0, 10),
  };

  const days =
    (new Date(refreshed.date) - START.TS) / (24 * 60 * 60 * 1000) + 1;

  return { today, refreshed, START, days };
};

export default async page => {
  const timestamps = await getTimestamps(page);

  const div = await page.$('div[title="Skupno število cepljenih oseb"]');
  await div.click({ button: 'right' });
  await page.waitForSelector('drop-down-list-item');
  const menuItem = await page.$('drop-down-list-item');
  await menuItem.click();
  await page.waitForSelector('.rowHeaders');
  await page.waitForSelector('.bodyCells');

  let rowHeaders = await page.$$(
    '.rowHeaders > div > div > .pivotTableCellWrap'
  );
  await rowHeaders[0].click();
  let condition = true;
  let counter = 20;
  let toDate1 = [];
  let toDate2 = [];
  let dates = [];

  while (condition) {
    for (let i = 0; i < counter; i++) {
      await page.keyboard.press('ArrowDown');
      const headers = await page.$$eval(
        '.rowHeaders > div > div > .pivotTableCellWrap',
        elements => elements.map(el => el.textContent)
      );
      dates = [...new Set([...dates, ...headers])];
    }

    const bodyCells = await page.$$('.bodyCells > div > div > div', elements =>
      elements.map(el => el.textContent)
    );
    const cells = await Promise.all(
      bodyCells.map(
        async node =>
          await node.$$eval('.pivotTableCellWrap', elements =>
            elements.map(el => el.textContent)
          )
      )
    );

    if (counter === 20) {
      toDate1 = [...toDate1, ...cells[0]];
      toDate2 = [...toDate2, ...cells[1]];
    }

    if (counter < 20 && cells.length === 4) {
      toDate1 = [...toDate1, ...cells[2]];
      toDate2 = [...toDate2, ...cells[3]];
    }

    if (counter < 20 && cells.length === 2) {
      toDate1 = [...toDate1, ...cells[0]];
      toDate2 = [...toDate2, ...cells[1]];
    }

    const missingDatesNum = timestamps.days - toDate1.length;
    counter = timestamps.days - dates.length >= 20 ? 20 : missingDatesNum;
    condition = toDate1.length < timestamps.days;
  }

  toDate1 = toDate1.map(string => toNumber(string)).slice(0, dates.length);
  toDate2 = toDate2.map(string => toNumber(string)).slice(0, dates.length);

  return toDate1.map((item, i, arr) => {
    const diff1 = i === 0 ? item : item - arr[i - 1];
    const diff2 = i === 0 ? toDate2[i] : toDate2[i] - toDate2[i - 1];
    const [day, month, year] = dates[i].split('.');
    const date = new Date(Date.UTC(year, month - 1, day))
      .toISOString()
      .slice(0, 10);

    return {
      date,
      'vaccination.administered': diff1,
      'vaccination.administered.todate': item,
      'vaccination.administered2nd': diff2,
      'vaccination.administered2nd.todate': toDate2[i],
      'vaccination.used.todate': item + toDate2[i],
    };
  });
};
