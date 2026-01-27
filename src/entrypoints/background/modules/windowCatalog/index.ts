import getCurrentWindows from './libs/getCurrentWindows';
import setupEventListeners from './libs/setupEventListeners';

export default async () => {
  await getCurrentWindows();
  setupEventListeners();
};