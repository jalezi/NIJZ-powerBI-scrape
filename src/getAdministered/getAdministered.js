import path from 'path';
import readCSV from '../readCSV.js';

const dir = process.cwd();
const now = Date.now();
const yesterday = new Date(now - 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const administeredPath = path.resolve(dir, `csv/vaccination-administered.csv`);
const devAdministeredPath = path.resolve(
  dir,
  `csv/vaccination-administered ${yesterday}.csv`
);

const isDev = process.env.NODE_ENV === 'development';
const parseAdministered = isDev
  ? readCSV(devAdministeredPath)
  : readCSV(administeredPath);

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

export const getTimestamp = async page => {
  const titlesResolved = await getTitles(page);
  const timestamp = extractTimestamp(titlesResolved);
  return timestamp;
};

export default async page => {
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

  return [...oldData];
};
