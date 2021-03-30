import path from 'path';
import readCSV from '../readCSV.js';

const COLUMNS_NUM = 3;
const MAX_CELLS_NUM = 20;

const isDev = process.env.NODE_ENV === 'development';

const dir = process.cwd();
const deliveredPath = path.resolve(dir, `csv/vaccination-delivered.csv`);
const devDeliveredPath = path.resolve(dir, `csv/vaccination-delivered-old.csv`);

const parsedDelivered = isDev
  ? readCSV(devDeliveredPath)
  : readCSV(deliveredPath);

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

const separateCellsByColumns = ({
  cells,
  newDataLength,
  columnsNum,
  maxCellsNum,
}) => {
  let dates = [];
  let companies = [];
  let numbers = [];
  const dataLengthRatio = Math.floor(newDataLength / maxCellsNum);
  let index = 0;
  let range = dataLengthRatio >= 1 ? maxCellsNum : newDataLength;
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
    index += columnsNum * range;
    range =
      cells.length - index >= 60
        ? maxCellsNum
        : (cells.length - index) / columnsNum;
  }
  return { dates, companies, numbers };
};

const toNumber = string => {
  const newString = string.replace('.', ''); // string.reaplaceAll -> node v15.0
  const index = newString.indexOf('.');
  if (index === -1) {
    return +newString;
  }
  return toNumber(newString);
};

// you have to be on the second page of NIJZ PowerBI
const scrapeDelivered = async (page, oldDataLength, columnsNum) => {
  const scrollDown = await page.$(
    'div.tableEx > div:nth-child(4) > div:nth-child(2)'
  );

  let cells = [];
  let newDataLength = cells.length / columnsNum;
  let cont = true;
  let totalVacs = 0;

  const calculateSum = numbers =>
    numbers.map(item => toNumber(item)).reduce((acc, num) => acc + num, 0);

  while (cont) {
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
    totalVacs = toNumber(allCells.slice(-1).pop());
    console.log(typeof totalVacs, totalVacs);
    cells = allCells.slice(4, allCells.length - 3);
    newDataLength = cells.length / columnsNum;
    const { numbers } = separateCellsByColumns({
      cells,
      newDataLength,
      columnsNum: COLUMNS_NUM,
      maxCellsNum: MAX_CELLS_NUM,
    });
    const sum = calculateSum(numbers);
    cont = sum !== totalVacs;
    await scrollDown.click();
  }

  if (newDataLength === oldDataLength) {
    return { noNewData: true };
  }
  return { cells, newDataLength, totalVacs };
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
    const number = toNumber(numbers[index]);
    const obj = { [dict[company]]: number };
    return { date, [pfizer]: '', [moderna]: '', [az]: '', ...obj };
  });
};

export default async page => {
  const { oldDataLength, totalVacOld } = await getOldDelivered();
  const { cells, newDataLength, totalVacs, noNewData } = await scrapeDelivered(
    page,
    oldDataLength,
    COLUMNS_NUM
  );

  if (noNewData) {
    return null;
  }

  const { dates, companies, numbers } = separateCellsByColumns({
    cells,
    newDataLength,
    columnsNum: COLUMNS_NUM,
    maxCellsNum: MAX_CELLS_NUM,
  });

  const total = numbers.reduce((acc, item) => {
    const num = toNumber(item);
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
