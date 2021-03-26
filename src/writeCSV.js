import path from 'path';
import csv_writer from 'csv-writer';

const { createObjectCsvWriter: createCsvWriter } = csv_writer;

const dir = process.cwd();
const filePath = path.resolve(dir, 'csv/vaccination-administered.csv');

export default (records, filename = filePath) => {
  const csvWriter = createCsvWriter({
    path: filename,
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
  });

  csvWriter
    .writeRecords(records) // returns a promise
    .then(() => {
      console.log('...Done');
    });
};
