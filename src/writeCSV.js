import path from 'path';
import csv_writer from 'csv-writer';

const { createObjectCsvWriter: createCsvWriter } = csv_writer;

const dir = process.cwd();

const csvDict = {
  administered: {
    path: path.resolve(dir, 'csv/vaccination-administered.csv'),
    header: [
      { id: 'date', title: 'date' },
      { id: 'vaccination.administered', title: 'vaccination.administered' },
      {
        id: 'vaccination.administered.todate',
        title: 'vaccination.administered.todate',
      },
      {
        id: 'vaccination.administered2nd',
        title: 'vaccination.administered2nd',
      },
      {
        id: 'vaccination.administered2nd.todate',
        title: 'vaccination.administered2nd.todate',
      },
      { id: 'vaccination.used.todate', title: 'vaccination.used.todate' },
    ],
  },
  delivered: {
    path: path.resolve(dir, 'csv/vaccination-delivered.csv'),
    header: [
      {
        id: 'date',
        title: 'date',
      },
      {
        id: 'vaccination.pfizer.delivered',
        title: 'vaccination.pfizer.delivered',
      },
      {
        id: 'vaccination.moderna.delivered',
        title: 'vaccination.moderna.delivered',
      },
      { id: 'vaccination.az.delivered', title: 'vaccination.az.delivered' },
    ],
  },
};

export default (records, type, path) => {
  const csvWriter = createCsvWriter({
    path: path || csvDict[type].path,
    header: csvDict[type].header,
  });

  try {
    csvWriter
      .writeRecords(records) // returns a promise
      .then(() => {
        console.log(`Success: ${type}: path: ${path || csvDict[type].path}`);
      });
  } catch (error) {
    console.log(`Error: ${type}: path: ${path || csvDict[type].path}`);
    console.log(error);
  }
};
