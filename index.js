import path from 'path';
import { scrap_NIJZ_powerBI, readCSV, writeCSV, GetDose } from './src/index.js';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const dir = process.cwd();
const now = Date.now();
const today = new Date().toISOString().slice(0, 10);
const backupPath = path.resolve(
  dir,
  `csv/backup/vaccination-administered ${today}-${now}.csv`
);

const testPath = path.resolve(
  dir,
  'csv/vaccination-administered 2021-03-25.csv'
);

const parseCSV =
  process.env.NODE_ENV === 'development' ? readCSV(testPath) : readCSV();

const start = async () => {
  const dose1 = await GetDose.dose1();
  const dose2 = await GetDose.dose2();

  // todo fetch date from power BI
  console.log(dose1, dose2);

  // const data = await scrap_NIJZ_powerBI();
  // const { vaccination } = data;
  // const oldData = await parseCSV();
  // const lastOld = oldData.slice(-1).pop();

  // const { date: lastDate } = lastOld;
  // const { date: newDate } = vaccination;
  // const dayDiff = new Date(newDate) - new Date(lastDate);

  // if (dayDiff > 0) {
  //   const newObj = {
  //     ...vaccination,
  //     ['vaccination.administered']:
  //       vaccination['vaccination.administered.todate'] -
  //       lastOld['vaccination.administered.todate'],
  //     ['vaccination.administered2nd']:
  //       vaccination['vaccination.administered2nd.todate'] -
  //       lastOld['vaccination.administered2nd.todate'],
  //   };

  //   const newData = [...oldData, newObj];
  //   writeCSV(newData);
  //   writeCSV(newData, backupPath);
  // } else {
  //   console.log('No change!\n', { lastOld, vaccination });
  // }
};

start();
