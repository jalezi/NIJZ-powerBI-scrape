import path from 'path';
import { scrape_NIJZ_powerBI, writeCSV } from './src/index.js';

const dir = process.cwd();
const now = Date.now();
const today = new Date().toISOString().slice(0, 10);

const vaccinationDevPath = path.resolve(
  dir,
  `csv/backup/vaccination ${today}-${now}.csv`
);
const administeredDevPath = path.resolve(
  dir,
  `csv/backup/vaccination-administered ${today}-${now}.csv`
);
const deliveredDevPath = path.resolve(
  dir,
  `csv/backup/vaccination-delivered ${today}-${now}.csv`
);

const isDev = process.env.NODE_ENV === 'development';
isDev && console.log(`running in ${process.env.NODE_ENV} mode!`);

const start = async () => {
  try {
    const data = await scrape_NIJZ_powerBI();
    const { timestamp, created, vaccination } = data;

    console.log(`NIJZ date: ${new Date(timestamp.timestamp)}`);
    console.log(`Scrape date: ${new Date(created)}`);

    if (!vaccination) {
      throw Error('No data! Something went wrong!');
    }

    if (isDev) {
      writeCSV(vaccination, 'vaccination', vaccinationDevPath);
      writeCSV(vaccination, 'administered', administeredDevPath);
      writeCSV(vaccination, 'delivered', deliveredDevPath);
      return;
    }

    writeCSV(vaccination, 'vaccination');
    writeCSV(vaccination, 'administered');
    writeCSV(vaccination, 'delivered');
  } catch (error) {
    console.log(error);
  }
};

start();
