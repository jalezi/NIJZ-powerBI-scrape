import path from 'path';
import readCSV from '../readCSV.js';

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

export default async (administered, delivered) => {
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
    .map(itemAdministered => {
      const deliveredOnDate = delivered
        .filter(itemDelivered => itemDelivered.date === itemAdministered.date)
        .reduce(
          (acc, itemDelivered) => {
            const {
              date,
              ['vaccination.pfizer.delivered']: pfizer,
              ['vaccination.moderna.delivered']: moderna,
              ['vaccination.az.delivered']: az,
            } = itemDelivered;
            acc = {
              date,
              ['vaccination.pfizer.delivered']:
                pfizer || acc['vaccination.pfizer.delivered'],
              ['vaccination.moderna.delivered']:
                moderna || acc['vaccination.moderna.delivered'],
              ['vaccination.az.delivered']:
                az || acc['vaccination.az.delivered'],
            };
            return acc;
          },
          {
            date: '',
            ['vaccination.pfizer.delivered']: '',
            ['vaccination.moderna.delivered']: '',
            ['vaccination.az.delivered']: '',
          }
        );
      return {
        ['vaccination.delivered.todate']: null,
        ['vaccination.pfizer.delivered']: null,
        ['vaccination.pfizer.delivered.todate']: null,
        ['vaccination.moderna.delivered']: null,
        ['vaccination.moderna.delivered.todate']: null,
        ['vaccination.az.delivered']: null,
        ['vaccination.az.delivered.todate']: null,
        ...(deliveredOnDate ? deliveredOnDate : {}),
        ...itemAdministered,
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

  const newVaccination =
    onlyNew.length > 0 ? populateNewVaccination(lastComplete, onlyNew) : [];
  return [...oldVaccination, ...newVaccination];
};
