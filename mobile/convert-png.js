const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.png'));

console.log(`🔍 Found ${files.length} PNG assets to re-encode for AAPT2 Android compatibility...`);

files.forEach((f) => {
  const filePath = path.join(assetsDir, f);
  if (fs.existsSync(filePath)) {
    try {
      const psScript = `
        Add-Type -AssemblyName System.Drawing
        $file = '${filePath.replace(/\\/g, '\\\\')}'
        $img = [System.Drawing.Image]::FromFile($file)
        $bmp = New-Object System.Drawing.Bitmap($img)
        $img.Dispose()
        Remove-Item $file -Force
        $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
      `;
      const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
      execSync(`powershell -EncodedCommand ${encoded}`);
      console.log(`  ✅ Re-encoded ${f} -> Genuine W3C PNG (AAPT2 Compliant)`);
    } catch (err) {
      console.error(`  ❌ Failed to convert ${f}:`, err.message);
    }
  }
});

console.log('🎉 All asset PNGs converted to genuine AAPT2-compliant PNG format!');
