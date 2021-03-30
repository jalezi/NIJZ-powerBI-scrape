import puppeteer from 'puppeteer';
import path from 'path';
import getDelivered from './getDelivered/index.js';
import getAdministered, { getTimestamp } from './getAdministered/index.js';
import readCSV from './readCSV.js';

const dir = process.cwd();
const now = Date.now();
const yesterday = new Date(now - 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const vaccinationPath = path.resolve(dir, `csv/vaccination.csv`);
const devVaccinationPath = path.resolve(
  dir,
  `csv/vaccination ${yesterday}.csv`
);

const isDev = process.env.NODE_ENV === 'development';
const parsedVaccination = isDev
  ? readCSV(devVaccinationPath)
  : readCSV(vaccinationPath);

const scrap_NIJZ_powerBI = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(
    'https://app.powerbi.com/view?r=eyJrIjoiZTg2ODI4MGYtMTMyMi00YmUyLWExOWEtZTlmYzIxMTI2MDlmIiwidCI6ImFkMjQ1ZGFlLTQ0YTAtNGQ5NC04OTY3LTVjNjk5MGFmYTQ2MyIsImMiOjl9&pageName=ReportSectionf7478503942700dada61',
    { waitUntil: 'networkidle0' }
  );

  const administered = await getAdministered(page);
  const timestamp = await getTimestamp(page);

  const nextPage = await page.$(
    '#embedWrapperID > div.logoBarWrapper > logo-bar > div > div > div > logo-bar-navigation > span > a:nth-child(3) > i'
  );

  await nextPage.click();
  await page.waitForSelector('.bodyCells');

  const delivered = await getDelivered(page);

  const getVaccination = async (administered, delivered) => {
    const oldVaccination = await parsedVaccination();

    const onlyMissingAdministered = administered
      .map(item => {
        const recordExists = !!oldVaccination.find(
          oldItem => oldItem.date === item.date
        );
        if (!recordExists) {
          return item;
        }
        return null;
      })
      .filter(item => item !== null)
      .map(item => {
        // ? what if 2 records with same date
        const deliveredOnDate = delivered.find(
          itemDelivered => itemDelivered.date === item.date
        );
        return {
          ...item,
          ['vaccination.delivered.todate']: null,
          ['vaccination.pfizer.delivered']: null,
          ['vaccination.pfizer.delivered.todate']: null,
          ['vaccination.moderna.delivered']: null,
          ['vaccination.moderna.delivered.todate']: null,
          ['vaccination.az.delivered']: null,
          ['vaccination.az.delivered.todate']: null,
          ...(deliveredOnDate ? deliveredOnDate : {}),
        };
      });

    const combinedVacs = [...oldVaccination, ...onlyMissingAdministered].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const lastComplete = combinedVacs[oldVaccination.length - 1];
    const onlyNew = combinedVacs.slice(
      oldVaccination.length,
      combinedVacs.length
    );

    const populateNewVaccination = (lastComplete, onlyNew, result = []) => {
      const firstNew = onlyNew[0];
      const {
        ['vaccination.delivered.todate']: allToDate,
        ['vaccination.pfizer.delivered.todate']: pfizerToDate,
        ['vaccination.moderna.delivered.todate']: modernaToDate,
        ['vaccination.az.delivered.todate']: azToDate,
      } = lastComplete;

      const {
        ['vaccination.pfizer.delivered']: pfizerDelivered,
        ['vaccination.moderna.delivered']: modernaDelivered,
        ['vaccination.az.delivered']: azDelivered,
      } = firstNew;

      const pfizerDlv = pfizerDelivered ? +pfizerDelivered : '';
      const modernaDlv = modernaDelivered ? +modernaDelivered : '';
      const azDlv = azDelivered ? +azDelivered : '';

      const newPfizerToDate = +pfizerToDate + +pfizerDlv;
      const newModernaToDate = +modernaToDate + +modernaDlv;
      const newAzToDate = +azToDate + +azDlv;

      const sum = newPfizerToDate + newModernaToDate + newAzToDate;

      firstNew['vaccination.pfizer.delivered.todate'] = newPfizerToDate;
      firstNew['vaccination.moderna.delivered.todate'] = newModernaToDate;
      firstNew['vaccination.az.delivered.todate'] = newAzToDate;

      firstNew['vaccination.delivered.todate'] = sum;

      firstNew['vaccination.pfizer.delivered'] = pfizerDlv;
      firstNew['vaccination.moderna.delivered'] = modernaDlv;
      firstNew['vaccination.az.delivered'] = azDlv;

      result.push({ ...firstNew });
      if (onlyNew.length === 1) {
        return result;
      }

      const onlyNewWithoutFirst = onlyNew.slice(1, onlyNew.length);
      return populateNewVaccination(
        { ...firstNew },
        [...onlyNewWithoutFirst],
        [...result]
      );
    };

    const newVaccination = populateNewVaccination(lastComplete, onlyNew);
    return [...oldVaccination, ...newVaccination];
  };

  const vaccination =
    administered && delivered
      ? await getVaccination(administered, delivered)
      : null;

  await browser.close();
  return {
    timestamp,
    created: Date.now(),
    administered,
    delivered,
    vaccination,
  };
};

export default scrap_NIJZ_powerBI;
