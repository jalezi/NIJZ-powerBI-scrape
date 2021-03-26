import puppeteer from 'puppeteer';

const getTimestamp = titles => {
  const date = titles
    .filter(node => {
      const date = node.length === 1 && node[0].split(' ');
      return date && date.length === 4;
    })[0][0]
    .split(' ')
    .map(item => item.replace('.', ''));

  let [day, month, year, time] = date;
  time = time.split(':');
  const dateForUTC = [year, month - 1, day, ...time];
  const timestamp = Date.UTC(...dateForUTC);
  const dateString = new Date(timestamp).toISOString().slice(0, 10);

  return { timestamp, date: dateString };
};

const getVacs = titles => {
  const data = titles
    .filter(node => node.length === 2 && node[1].endsWith('odmerek'))
    .reduce((acc, [value, key]) => {
      key.includes('1') &&
        (acc['vaccination.administered.todate'] = value.replace('.', ''));
      key.includes('2') &&
        (acc['vaccination.administered2nd.todate'] = value.replace('.', ''));
      return acc;
    }, {});
  data['vaccination.used.todate'] =
    +data['vaccination.administered.todate'] +
    +data['vaccination.administered2nd.todate'];
  return data;
};

const scrap_NIJZ_powerBI = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    'https://app.powerbi.com/view?r=eyJrIjoiZTg2ODI4MGYtMTMyMi00YmUyLWExOWEtZTlmYzIxMTI2MDlmIiwidCI6ImFkMjQ1ZGFlLTQ0YTAtNGQ5NC04OTY3LTVjNjk5MGFmYTQ2MyIsImMiOjl9&pageName=ReportSectionf7478503942700dada61',
    { waitUntil: 'networkidle0' }
  );
  const allSVG = await page.$$('svg');
  const text = allSVG.map(
    async svg =>
      await svg.$$eval('title', nodes => nodes.map(node => node.innerHTML))
  );
  const titlesResolved = await Promise.all(text);
  const timestamp = getTimestamp(titlesResolved);
  const vacs = getVacs(titlesResolved);

  // const allVisualModern = await page.$$('visual-modern');
  // console.log(allVisualModern.length);

  await browser.close();
  return {
    timestamp,
    created: Date.now(),
    vaccination: { date: timestamp.date, ...vacs },
  };
};

export default scrap_NIJZ_powerBI;
