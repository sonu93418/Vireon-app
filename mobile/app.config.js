const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const googleServicesPath = path.resolve(__dirname, 'google-services.json');
  const googleServicesExamplePath = path.resolve(__dirname, 'google-services.json.example');

  let googleServicesFile = undefined;
  if (fs.existsSync(googleServicesPath)) {
    googleServicesFile = './google-services.json';
  } else if (fs.existsSync(googleServicesExamplePath)) {
    googleServicesFile = './google-services.json.example';
  }

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile,
    },
  };
};
