const fs = require('fs');
const path = require('path');

console.log('--- Setting up google-services.json for EAS Build ---');
if (process.env.GOOGLE_SERVICES_JSON) {
  try {
    const rawVal = process.env.GOOGLE_SERVICES_JSON.trim();
    let jsonContent = rawVal;
    if (rawVal.startsWith('{')) {
      jsonContent = rawVal;
    } else {
      jsonContent = Buffer.from(rawVal, 'base64').toString('utf8');
    }
    
    // Verify valid JSON
    JSON.parse(jsonContent);

    const rootPath = path.resolve(__dirname, 'google-services.json');
    fs.writeFileSync(rootPath, jsonContent);
    console.log('✅ google-services.json written to mobile root');

    const androidAppPath = path.resolve(__dirname, 'android', 'app', 'google-services.json');
    if (fs.existsSync(path.dirname(androidAppPath))) {
      fs.writeFileSync(androidAppPath, jsonContent);
      console.log('✅ google-services.json written to mobile/android/app/');
    }
  } catch (err) {
    console.error('⚠️ Warning: Failed to parse/write GOOGLE_SERVICES_JSON:', err.message);
  }
} else {
  console.log('ℹ️ No GOOGLE_SERVICES_JSON environment variable present.');
}
