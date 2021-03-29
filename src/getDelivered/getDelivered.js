import path from 'path';
import readCSV from '../readCSV.js';
const isDev = process.env.NODE_ENV === 'development';

const dir = process.cwd();
const devDeliveredPath = path.resolve(dir, `csv/vaccination-delivered-old.csv`);

const parsedDelivered = isDev
  ? readCSV(devDeliveredPath)
  : readCSV(path.resolve(dir, `csv/vaccination-delivered.csv`));

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

export default async page => {
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
