import path from 'path';
import { scrape_NIJZ_powerBI, writeCSV } from './src/index.js';

const dir = process.cwd();
const now = Date.now();
const today = new Date().toISOString().slice(0, 10);

const DevPath = {
  vaccination: path.resolve(dir, `csv/backup/vaccination ${today}-${now}.csv`),
  administered: path.resolve(
    dir,
    `csv/backup/vaccination-administered ${today}-${now}.csv`
  ),
  delivered: path.resolve(
    dir,
    `csv/backup/vaccination-delivered ${today}-${now}.csv`
  ),
};

const isDev = process.env.NODE_ENV === 'development';
isDev && console.log(`running in ${process.env.NODE_ENV} mode!`);

const start = async () => {
  try {
    const data = await scrape_NIJZ_powerBI();
    const { timestamp, created, vaccination, delivered } = data;

    console.log(`NIJZ date: ${new Date(timestamp.timestamp)}`);
    console.log(`Scrape date: ${new Date(created)}`);

    if (!vaccination) {
      throw Error('No data! Something went wrong!');
    }

    if (isDev) {
      writeCSV(vaccination, 'vaccination', DevPath.vaccination);
      writeCSV(vaccination, 'administered', DevPath.administered);
      writeCSV(delivered, 'delivered', DevPath.delivered);
      return;
    }

    writeCSV(vaccination, 'vaccination');
    writeCSV(vaccination, 'administered');
    writeCSV(delivered, 'delivered');
  } catch (error) {
    console.log(error);
  }
};

start();
