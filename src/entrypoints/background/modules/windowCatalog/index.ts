import setupEventListeners from './libs/setupEventListeners';
import setupMessageListeners from './libs/setupMessageListeners';

export default () => {
  setupEventListeners();
  setupMessageListeners();
};