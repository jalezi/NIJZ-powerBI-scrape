import { scrap_NIJZ_powerBI } from './src/index.js';

const start = async () => {
  const data = await scrap_NIJZ_powerBI();
  console.log(data);
};

start();
