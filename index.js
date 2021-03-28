import path from 'path';
import { scrap_NIJZ_powerBI, readCSV, writeCSV } from './src/index.js';

const dir = process.cwd();
const now = Date.now();
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(now - 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const administeredBckPath = path.resolve(
  dir,
  `csv/backup/vaccination-administered ${today}-${now}.csv`
);

const devAdministeredPath = path.resolve(
  dir,
  `csv/vaccination-administered ${yesterday}.csv`
);

const isDev = process.env.NODE_ENV === 'development';
isDev && console.log(`running in ${process.env.NODE_ENV} mode!`);

const parseAdministered = isDev ? readCSV(devAdministeredPath) : readCSV();

const start = async () => {
  const data = await scrap_NIJZ_powerBI();
  const { administered, delivered } = data;

  // administered
  const oldData = await parseAdministered();
  const lastOld = oldData.slice(-1).pop();

  const { date: lastDate } = lastOld;
  const { date: newDate } = administered;
  const dayDiff = new Date(newDate) - new Date(lastDate);

  if (dayDiff > 0) {
    const newObj = {
      ...administered,
      ['vaccination.administered']:
        administered['vaccination.administered.todate'] -
        lastOld['vaccination.administered.todate'],
      ['vaccination.administered2nd']:
        administered['vaccination.administered2nd.todate'] -
        lastOld['vaccination.administered2nd.todate'],
    };
    const newData = [...oldData, newObj];

    isDev
      ? writeCSV(newData, 'administered', administeredBckPath)
      : writeCSV(newData, 'administered');
  } else {
    console.log('No change for administered\n', {
      lastOld,
      vaccination: administered,
    });
  }

  //delivered
  writeCSV(delivered, 'delivered');
};

start();
