import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
  console.log('\n--- Cognitive Agent Terminal (C.A.T) Setup ---\n');

  // 1. Ask for Port
  const port = await question('Hvilken port skal C.A.T køre på? (Standard: 3939): ') || '3939';
  
  // 2. Create/Update .env
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
    if (envContent.includes('PORT=')) {
      envContent = envContent.replace(/PORT=\d+/, `PORT=${port}`);
    } else {
      envContent += `\nPORT=${port}`;
    }
  } else {
    envContent = `PORT=${port}\n`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log(`\u2705 .env opdateret med PORT=${port}`);

  // 3. Update cat.service
  const servicePath = path.join(process.cwd(), 'cat.service');
  const workingDir = process.cwd();
  const user = process.env.USER || 'pi';
  
  const serviceTemplate = `[Unit]
Description=Cognitive Agent Terminal (C.A.T)
After=network.target ollama.service

[Service]
Type=simple
User=${user}
WorkingDirectory=${workingDir}
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production PORT=${port}

[Install]
WantedBy=multi-user.target
`;

  fs.writeFileSync(servicePath, serviceTemplate);
  console.log(`\u2705 cat.service opdateret med WorkingDirectory=${workingDir} og PORT=${port}`);

  // 4. Install Service (requires sudo)
  console.log('\nForsøger at installere systemd service...');
  try {
    execSync(`sudo cp ${servicePath} /etc/systemd/system/`);
    execSync('sudo systemctl daemon-reload');
    execSync('sudo systemctl enable cat.service');
    execSync('sudo systemctl restart cat.service');
    console.log('\u2705 Systemd service installeret og startet!');
  } catch (error) {
    console.log('\u26A0\uFE0F Kunne ikke installere service automatisk (mangler måske sudo).');
    console.log('Du kan gøre det manuelt med:');
    console.log(`  sudo cp ${servicePath} /etc/systemd/system/`);
    console.log('  sudo systemctl daemon-reload');
    console.log('  sudo systemctl enable cat.service');
    console.log('  sudo systemctl start cat.service');
  }

  console.log('\n--- Setup Færdig! ---');
  console.log(`Du kan nu tilgå C.A.T på: http://rasp.local:${port} (eller din Pis IP)`);
  rl.close();
}

setup();
