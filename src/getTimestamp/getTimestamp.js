const extractTimestamp = titles => {
  try {
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
  } catch (error) {
    console.log(error);
    return error;
  }
};

const getTitles = async page => {
  const allSVG = await page.$$('svg');
  const text = allSVG.map(
    async svg =>
      await svg.$$eval('title', nodes => nodes.map(node => node.innerHTML))
  );
  const titlesResolved = await Promise.all(text);
  return titlesResolved;
};

export default async page => {
  const titlesResolved = await getTitles(page);
  const timestamp = extractTimestamp(titlesResolved);
  return timestamp;
};
