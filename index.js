import path from 'path';
import { scrape_NIJZ_powerBI, writeCSV } from './src/index.js';

const dir = process.cwd();
const now = Date.now();
const today = new Date().toISOString().slice(0, 10);

const administeredBckPath = path.resolve(
  dir,
  `csv/backup/vaccination-administered ${today}-${now}.csv`
);

const vaccinationBckPath = path.resolve(
  dir,
  `csv/backup/vaccination ${today}-${now}.csv`
);

const isDev = process.env.NODE_ENV === 'development';
isDev && console.log(`running in ${process.env.NODE_ENV} mode!`);

const start = async () => {
  const data = await scrape_NIJZ_powerBI();
  const { timestamp, created, administered, delivered, vaccination } = data;

  console.log(`NIJZ date: ${new Date(timestamp.timestamp)}`);
  console.log(`Scrape date: ${new Date(created)}`);

  administered !== null && isDev
    ? writeCSV(administered, 'administered', administeredBckPath)
    : administered !== null && writeCSV(administered, 'administered');
  administered ?? console.log(`No new administered data for ${today}!`);

  delivered !== null && writeCSV(delivered, 'delivered');
  delivered ?? console.log(`No new delivered data for ${today}!`);

  vaccination !== null && isDev
    ? writeCSV(vaccination, 'vaccination', vaccinationBckPath)
    : writeCSV(vaccination, 'vaccination');
  vaccination ?? console.log(`No new vaccination data for ${today}!`);
};

start();
