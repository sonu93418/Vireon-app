const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const googleServicesPath = path.resolve(__dirname, 'google-services.json');

  // Auto-create google-services.json if missing to ensure native Firebase SDK initialization
  if (!fs.existsSync(googleServicesPath)) {
    const validConfig = {
      project_info: {
        project_number: '52937404971',
        project_id: 'vireon-app-504612',
        storage_bucket: 'vireon-app-504612.firebasestorage.app'
      },
      client: [
        {
          client_info: {
            mobilesdk_app_id: '1:52937404971:android:4a3d45d31b739ddca89c91',
            android_client_info: { package_name: 'com.vireon.safety' }
          },
          oauth_client: [
            {
              client_id: '52937404971-e0vqiesg2fqjktgtaoba5n06fs5utdor.apps.googleusercontent.com',
              client_type: 3
            },
            {
              client_id: '52937404971-0pqohi2arkbtpdmrakt99jrtjgevpjl4.apps.googleusercontent.com',
              client_type: 1,
              android_info: {
                package_name: 'com.vireon.safety',
                certificate_hash: 'a8c3919c3ff06ddf0c00101982bdcf4a4a221a05'
              }
            }
          ],
          api_key: [{ current_key: 'AIzaSyClupJxlxUmZJ7xEmr4o954o_1ZFVhvEFY' }],
          services: {}
        }
      ],
      configuration_version: '1'
    };
    try {
      fs.writeFileSync(googleServicesPath, JSON.stringify(validConfig, null, 2));
    } catch {}
  }

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile: './google-services.json',
    },
  };
};
