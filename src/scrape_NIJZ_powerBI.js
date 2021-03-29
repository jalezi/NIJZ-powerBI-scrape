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

const getOldDelivered = async () => {
  const oldData = await parsedDelivered();
  const totalVacOld = oldData.reduce((acc, item) => {
    const {
      ['vaccination.pfizer.delivered']: pfizer,
      'vaccination.moderna.delivered': moderna,
      'vaccination.az.delivered': az,
    } = item;
    const num = pfizer || moderna || az;
    acc = acc + +num;
    return acc;
  }, 0);
  const oldDataLength = oldData.length;
  return { oldDataLength, totalVacOld };
};

const scrapeDelivered = async (page, oldDataLength, COMPANIES_NUM) => {
  const scrollDown = await page.$(
    'div.tableEx > div:nth-child(4) > div:nth-child(2)'
  );

  let cells = [];
  let newDataLength = cells.length / COMPANIES_NUM;
  let cont = true;
  let totalVacs = 0;

  while (newDataLength <= oldDataLength && cont) {
    const vcBodies = await page.$$('.vcBody');
    const textResolved = await Promise.all(
      vcBodies.map(async item => {
        const text = await item.$eval('div', item => item.innerText);
        return text.startsWith('Datum\n') && text;
      })
    );
    const allCells = textResolved
      .filter(item => !!item)
      .pop()
      .split('\n');
    totalVacs = +allCells.slice(-1).pop().replace('.', '');
    cells = allCells.slice(4, allCells.length - 3);
    newDataLength = cells.length / COMPANIES_NUM;
    cont = newDataLength !== oldDataLength;
    await scrollDown.click();
  }

  if (newDataLength === oldDataLength) {
    return { noNewData: true };
  }
  return { cells, newDataLength, totalVacs };
};

const separateCellsByColumns = ({
  cells,
  newDataLength,
  COMPANIES_NUM,
  MAX_CELLS_NUM,
}) => {
  let dates = [];
  let companies = [];
  let numbers = [];

  const dataLengthRatio = Math.floor(newDataLength / MAX_CELLS_NUM);
  let index = 0;
  let range = dataLengthRatio >= 1 ? MAX_CELLS_NUM : newDataLength;
  while (dates.length < newDataLength) {
    dates = [...dates, ...cells.slice(index, index + range)];
    companies = [
      ...companies,
      ...cells.slice(index + range, index + range + range),
    ];
    numbers = [
      ...numbers,
      ...cells.slice(index + 2 * range, index + 2 * range + range),
    ];
    index += COMPANIES_NUM * range;
    range =
      cells.length - index >= 60
        ? MAX_CELLS_NUM
        : (cells.length - index) / COMPANIES_NUM;
  }
  return { dates, companies, numbers };
};

const prepareDelivered = ({ dates, companies, numbers }) => {
  const pfizer = 'vaccination.pfizer.delivered';
  const moderna = 'vaccination.moderna.delivered';
  const az = 'vaccination.az.delivered';

  const dict = {
    ['Pfizer-BioNTech']: pfizer,
    ['Moderna']: moderna,
    ['Astra Zeneca']: az,
  };

  return dates.map((item, index) => {
    const [day, month, year] = item.split('.');
    const date = new Date(Date.UTC(year, month - 1, day))
      .toISOString()
      .slice(0, 10);
    const company = companies[index];
    const number = numbers[index].replace('.', '');
    const obj = { [dict[company]]: number };
    return { date, [pfizer]: '', [moderna]: '', [az]: '', ...obj };
  });
};

const getDelivered = async page => {
  const COMPANIES_NUM = 3;
  const MAX_CELLS_NUM = 20;
  const { oldDataLength, totalVacOld } = await getOldDelivered();
  const { cells, newDataLength, totalVacs, noNewData } = await scrapeDelivered(
    page,
    oldDataLength,
    COMPANIES_NUM
  );

  if (noNewData) {
    return null;
  }

  const { dates, companies, numbers } = separateCellsByColumns({
    cells,
    newDataLength,
    COMPANIES_NUM,
    MAX_CELLS_NUM,
  });

  const total = numbers.reduce((acc, item) => {
    const num = item.replace('.', '');
    acc = acc + +num;
    return acc;
  }, 0);

  const totalIsValid = total > totalVacOld && total === totalVacs;
  totalIsValid && console.log(`Delivered total is valid, received: ${total}.`);

  !totalVacOld &&
    console.log(
      `Delivered total is NOT valid, received: ${total}, expect: ${totalVacs}, greater than: ${totalVacOld}.`
    );

  const data = prepareDelivered({ dates, companies, numbers });
  return data;
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
