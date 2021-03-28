import path from 'path';
import { scrape_NIJZ_powerBI, readCSV, writeCSV } from './src/index.js';

const dir = process.cwd();
const now = Date.now();
const today = new Date().toISOString().slice(0, 10);

const administeredBckPath = path.resolve(
  dir,
  `csv/backup/vaccination-administered ${today}-${now}.csv`
);

const isDev = process.env.NODE_ENV === 'development';
isDev && console.log(`running in ${process.env.NODE_ENV} mode!`);

const start = async () => {
  const data = await scrape_NIJZ_powerBI();
  const { administered, delivered } = data;

  if (administered !== null) {
    isDev
      ? writeCSV(administered, 'administered', administeredBckPath)
      : writeCSV(administered, 'administered');
  }

  writeCSV(delivered, 'delivered');
};

start();
