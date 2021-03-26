import csv from 'csv-parser';
import path from 'path';
import { createReadStream } from 'fs';

const dir = process.cwd();
const filePath = path.resolve(dir, 'csv/vaccination-administered.csv');
export default (filename = filePath) => {
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
    })();
};
