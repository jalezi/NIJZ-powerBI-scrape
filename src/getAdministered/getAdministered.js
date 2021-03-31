import path from 'path';
import readCSV from '../readCSV.js';
import getTimestamp from '../getTimestamp/index.js';

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

export default async page => {
  const titlesResolved = await getTitles(page);
  const administered = extractAdministered(titlesResolved);

  const oldData = await parseAdministered();
  const lastOld = oldData.slice(-1).pop();
  const { date: lastDate } = lastOld;
  const { date: newDate } = await getTimestamp(page);
  const dayDiff = new Date(newDate) - new Date(lastDate);

  if (dayDiff > 0) {
    const newObj = {
      date: newDate,
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
