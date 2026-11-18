import { copyFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const source = './dist/404.html';
const target = './dist/404/index.html';

try {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
  console.log(`Copied ${source} to ${target} for the /404 route.`);
} catch (error) {
  throw new Error(`Failed to copy 404 page: ${error.message}`);
}
