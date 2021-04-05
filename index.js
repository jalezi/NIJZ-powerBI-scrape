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
    if (data instanceof Error) {
      throw data;
    }
    const { timestamp, created, vaccination, administered, delivered } = data;

    console.log(`NIJZ date: ${new Date(timestamp.timestamp)}`);
    console.log(`Scrape date: ${new Date(created)}`);

    if (!vaccination) {
      throw Error('No data! Something went wrong!');
    }

    // if (isDev) {
    //   writeCSV(vaccination, 'vaccination', DevPath.vaccination);
    //   writeCSV(administered, 'administered', DevPath.administered);
    //   writeCSV(delivered, 'delivered', DevPath.delivered);
    //   return;
    // }
    if (!isDev) {
      writeCSV(vaccination, 'vaccination');
      writeCSV(administered, 'administered');
      writeCSV(delivered, 'delivered');
      return;
    }
  } catch (error) {
    console.log(error);
  }
};

start();
