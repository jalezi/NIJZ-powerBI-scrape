import getTimestamp from './../getTimestamp/index.js';
import nijzDashFetch from '../nijz-dash-fetch.js';

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

  const days = (new Date(refreshed.date) - START.TS) / (24 * 60 * 60 * 1000);

  return { today, refreshed, START, days };
};

export default async page => {
  const timestamps = await getTimestamps(page);
  const { dose1, dose2 } = await nijzDashFetch();
  console.log({ timestamps, fetchedDoses: { dose1, dose2 } });

  const div = await page.$('div[title="Skupno število cepljenih oseb"]');
  await div.click({ button: 'right' });
  await page.waitForSelector('drop-down-list-item');
  const menuItem = await page.$('drop-down-list-item');
  await menuItem.click();
  await page.waitForSelector('.rowHeaders');
  await page.waitForSelector('.bodyCells');

  let cells = [];
  let bodyCells = null;
  let cellsResolved = null;
  let condition = true;
  let counter = 1;

  while (counter < 40) {
    bodyCells = await page.$$('.bodyCells > div > div > div');
    cellsResolved = await Promise.all(
      bodyCells.map(
        async item =>
          await item.$$eval('.pivotTableCellWrap', items =>
            items.map(el => el.innerText)
          )
      )
    );
    cells.push(cellsResolved.map(item => item.map(text => toNumber(text))));
    await page.$eval('.bodyCells', el => {
      el.scrollBy(0, 20);
    });

    const last = cells.slice(-1).pop();
    const lastAdministered = last[0].slice(-1).pop();
    const lastAdministered2nd = last[1].slice(-1).pop();

    console.log({
      cells,
      length: cells.length,
      lastAdministered,
      lastAdministered2nd,
      counter,
      condition,
    });
    await page.waitForTimeout(1000);
    counter++;
  }
  const [administered, administered2nd] = cells.reduce(
    (acc, [first, second]) => {
      acc[0] = [...acc[0], ...first];
      acc[1] = [...acc[1], ...second];
      return acc;
    },
    [[], []]
  );

  return {
    administered,
    administered2nd,
  };
};
