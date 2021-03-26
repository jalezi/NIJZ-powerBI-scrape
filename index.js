import path from 'path';
import { scrap_NIJZ_powerBI } from './src/index.js';
import readCSV from './src/readCSV.js';
import writeCSV from './src/writeCSV.js';

const dir = process.cwd();
const now = Date.now();
const filePath = path.resolve(
  dir,
  `csv/vaccination-administered-backup-${now}.csv`
);

const start = async () => {
  const data = await scrap_NIJZ_powerBI();
  const { vaccination } = data;
  const oldData = await readCSV();
  const lastOld = oldData.slice(-1).pop();

  const { date: lastDate } = lastOld;
  const { date: newDate } = vaccination;
  const dayDiff = new Date(newDate) - new Date(lastDate);

  if (dayDiff > 0) {
    const newObj = {
      ...vaccination,
      ['vaccination.administered']:
        vaccination['vaccination.administered.todate'] -
        lastOld['vaccination.administered.todate'],
      ['vaccination.administered2nd']:
        vaccination['vaccination.administered2nd.todate'] -
        lastOld['vaccination.administered2nd.todate'],
    };
    const newData = [...oldData, newObj];
    writeCSV(newData);
    return writeCSV(newData, filePath);
  }
  console.log('No change!', { lastOld, vaccination });
};

start();
