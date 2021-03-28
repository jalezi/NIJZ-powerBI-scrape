import path from 'path';
import puppeteer from 'puppeteer';
import readCSV from './readCSV.js';

const dir = process.cwd();
const now = Date.now();
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(now - 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const devAdministeredPath = path.resolve(
  dir,
  `csv/vaccination-administered ${yesterday}.csv`
);

const devDeliveredPath = path.resolve(dir, `csv/vaccination-delivered-old.csv`);

const isDev = process.env.NODE_ENV === 'development';
const parseAdministered = isDev ? readCSV(devAdministeredPath) : readCSV();
const parsedDelivered = isDev
  ? readCSV(devDeliveredPath)
  : readCSV(path.resolve(dir, `csv/vaccination-delivered.csv`));

const extractTimestamp = titles => {
  const date = titles
    .filter(node => {
      const date = node.length === 1 && node[0].split(' ');
      return date && date.length === 4;
    })[0][0]
    .split(' ')
    .map(item => item.replace('.', ''));

  let [day, month, year, time] = date;
  time = time.split(':');
  const dateForUTC = [year, month - 1, day, ...time];
  const timestamp = Date.UTC(...dateForUTC);
  const dateString = new Date(timestamp).toISOString().slice(0, 10);

  return { timestamp, date: dateString };
};

const extractAdministered = titles => {
  const data = titles
    .filter(node => node.length === 2 && node[1].endsWith('odmerek'))
    .reduce((acc, [value, key]) => {
      key.includes('1') &&
        (acc['vaccination.administered.todate'] = value.replace('.', ''));
      key.includes('2') &&
        (acc['vaccination.administered2nd.todate'] = value.replace('.', ''));
      return acc;
    }, {});
  data['vaccination.used.todate'] =
    +data['vaccination.administered.todate'] +
    +data['vaccination.administered2nd.todate'];
  return data;
};

const getTitles = async page => {
  const allSVG = await page.$$('svg');
  const text = allSVG.map(
    async svg =>
      await svg.$$eval('title', nodes => nodes.map(node => node.innerHTML))
  );
  const titlesResolved = await Promise.all(text);
  return titlesResolved;
};

const getAdministered = async page => {
  const titlesResolved = await getTitles(page);
  const timestamp = extractTimestamp(titlesResolved);
  const administered = extractAdministered(titlesResolved);

  const oldData = await parseAdministered();
  const lastOld = oldData.slice(-1).pop();
  const { date: lastDate } = lastOld;
  const { date: newDate } = timestamp;
  const dayDiff = new Date(newDate) - new Date(lastDate);

  if (dayDiff > 0) {
    const newObj = {
      date: timestamp.date,
      ...administered,
      ['vaccination.administered']:
        administered['vaccination.administered.todate'] -
        lastOld['vaccination.administered.todate'],
      ['vaccination.administered2nd']:
        administered['vaccination.administered2nd.todate'] -
        lastOld['vaccination.administered2nd.todate'],
    };
    return [...oldData, newObj];
  }

  return null;
};

const getTimestamp = async page => {
  const titlesResolved = await getTitles(page);
  const timestamp = extractTimestamp(titlesResolved);
  return timestamp;
};

const getDelivered = async page => {
  const oldData = await parsedDelivered();

  const scrollDown = await page.$(
    'div.tableEx > div:nth-child(4) > div:nth-child(2)'
  );

  let lastDiv = null;
  let length = 20; // max number of cells in column
  // ! fix: if all columns have max number of cells -> infinite loop
  while (length >= 20) {
    // scroll down until last cell is visible
    lastDiv = await page.$('div.bodyCells > div > div:last-child');
    const columnDiv = await lastDiv.$('div');
    const cellsDiv = await columnDiv.$$('div');
    length = cellsDiv.length;

    await scrollDown.click();
  }

  const columnsDiv = await page.$$('div.bodyCells > div > div');
  const data = await Promise.all(
    columnsDiv.map(async item => {
      const columns = await item.$x('./div');
      const [dateColumn, companyColumn, numColumn] = columns;

      const dateCells = await dateColumn.$$('div');
      const companyCells = await companyColumn.$$('div');
      const numberCells = await numColumn.$$('div');

      const datesPromises = dateCells.map(
        async cell => await (await cell.getProperty('innerText')).jsonValue()
      );
      const companyPromises = companyCells.map(
        async cell => await (await cell.getProperty('innerText')).jsonValue()
      );
      const numberPromises = numberCells.map(
        async cell => await (await cell.getProperty('innerText')).jsonValue()
      );

      const datesResolved = await Promise.all(datesPromises);
      const companiesResolved = await Promise.all(companyPromises);
      const numbersResolved = await Promise.all(numberPromises);
      return {
        dates: datesResolved,
        companies: companiesResolved,
        numbers: numbersResolved,
      };
    })
  );

  const reducedData = data.reduce(
    (acc, { dates, companies, numbers }) => {
      acc.dates = [...acc.dates, ...dates];
      acc.companies = [...acc.companies, ...companies];
      acc.numbers = [...acc.numbers, ...numbers];
      return acc;
    },
    { dates: [], companies: [], numbers: [] }
  );

  const pfizer = 'vaccination.pfizer.delivered';
  const moderna = 'vaccination.moderna.delivered';
  const az = 'vaccination.az.delivered';

  const dict = {
    ['Pfizer-BioNTech']: pfizer,
    ['Moderna']: moderna,
    ['Astra Zeneca']: az,
  };

  const scrapedData = reducedData.dates.map((item, index) => {
    const [day, month, year] = item.split('.');
    const date = new Date(Date.UTC(year, month - 1, day))
      .toISOString()
      .slice(0, 10);
    const company = reducedData.companies[index];
    const number = reducedData.numbers[index];
    const obj = { [dict[company]]: number };
    return { date, [pfizer]: '', [moderna]: '', [az]: '', ...obj };
  });

  if (scrapedData.length > oldData.length) {
    return scrapedData;
  }

  return null;
};

const scrap_NIJZ_powerBI = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(
    'https://app.powerbi.com/view?r=eyJrIjoiZTg2ODI4MGYtMTMyMi00YmUyLWExOWEtZTlmYzIxMTI2MDlmIiwidCI6ImFkMjQ1ZGFlLTQ0YTAtNGQ5NC04OTY3LTVjNjk5MGFmYTQ2MyIsImMiOjl9&pageName=ReportSectionf7478503942700dada61',
    { waitUntil: 'networkidle0' }
  );

  const administered = await getAdministered(page);
  const timestamp = await getTimestamp(page);

  const nextPage = await page.$(
    '#embedWrapperID > div.logoBarWrapper > logo-bar > div > div > div > logo-bar-navigation > span > a:nth-child(3) > i'
  );

  await nextPage.click();
  await page.waitForSelector('.bodyCells');
  const delivered = await getDelivered(page);

  await browser.close();
  return {
    timestamp,
    created: Date.now(),
    administered,
    delivered,
  };
};

export default scrap_NIJZ_powerBI;
