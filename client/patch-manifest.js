import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

console.log('Checking for AndroidManifest.xml at:', manifestPath);

if (fs.existsSync(manifestPath)) {
  let content = fs.readFileSync(manifestPath, 'utf8');
  
  const permissions = [
    '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />',
    '<uses-permission android:name="android.permission.WAKE_LOCK" />',
    '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />',
    '<uses-permission android:name="android.permission.USE_EXACT_ALARM" />'
  ];
  
  // Find the closing manifest tag to insert the permissions before it
  const insertIndex = content.lastIndexOf('</manifest>');
  if (insertIndex !== -1) {
    const patch = '\n    <!-- Added for exact alarms & background notifications -->\n    ' + permissions.join('\n    ') + '\n';
    content = content.slice(0, insertIndex) + patch + content.slice(insertIndex);
    fs.writeFileSync(manifestPath, content, 'utf8');
    console.log('✅ Successfully patched AndroidManifest.xml with permissions!');
  } else {
    console.error('❌ Could not find </manifest> tag in AndroidManifest.xml');
    process.exit(1);
  }
} else {
  console.error('❌ AndroidManifest.xml not found!');
  process.exit(1);
}
