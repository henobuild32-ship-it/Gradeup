const sharp = require('sharp');
const fs = require('fs');

async function generate() {
  const input = 'public/logo-gradeup.png';
  if (!fs.existsSync(input)) {
    console.error('No logo found at', input);
    return;
  }
  await sharp(input).resize(192, 192).toFile('public/icon-192x192.png');
  await sharp(input).resize(512, 512).toFile('public/icon-512x512.png');
  console.log('Icons generated successfully.');
}
generate();
