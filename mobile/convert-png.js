const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const assetsDir = 'C:\\VireonApp\\mobile\\assets';
const files = ['icon.png', 'adaptive-icon.png', 'splash-icon.png', 'notification-icon.png', 'favicon.png'];

files.forEach((f) => {
  const filePath = path.join(assetsDir, f);
  if (fs.existsSync(filePath)) {
    const psScript = `
      Add-Type -AssemblyName System.Drawing
      $file = '${filePath}'
      $img = [System.Drawing.Image]::FromFile($file)
      $bmp = New-Object System.Drawing.Bitmap($img)
      $img.Dispose()
      Remove-Item $file -Force
      $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
      $bmp.Dispose()
    `;
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    execSync(`powershell -EncodedCommand ${encoded}`);
    console.log(`✅ Converted ${f} to genuine PNG format.`);
  }
});
