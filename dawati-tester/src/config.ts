import dotenv from 'dotenv';
import { validateConfig } from './config-validation';

dotenv.config();

export * from './config-validation';

export const config = validateConfig();
export default config;
