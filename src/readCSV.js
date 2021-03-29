import csv from 'csv-parser';
import { createReadStream } from 'fs';

const readCSV = filename => {
  const results = [];

  return () =>
    new Promise((resolve, reject) => {
      try {
        createReadStream(filename)
          .pipe(csv())
          .on('data', data => results.push(data))
          .on('end', () => {
            resolve(results);
          });
      } catch (error) {
        reject(error);
      }
    });
};
export default readCSV;
