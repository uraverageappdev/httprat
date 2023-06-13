const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const readline = require('readline');

const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

const port = 80;

var platformCommand = "";

if (isMac)
  platformCommand = "open";

if (isWindows)
  platformCommand = "start";

var firstTime = "true";
function generatePassword() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let sessionId = '';
  for (let i = 0; i < 10; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    sessionId += characters.charAt(randomIndex);
  }
  return sessionId;
}

let password = generatePassword();
let advancedpassword = generatePassword();
let lockWindow = null; // Variable to store the lock window instance
let canProcess = true; // Variable to control request processing

console.log('\n\nDefault password is ' + password + '\n\nSome important operations, such as banning IPs, need an advanced password (DO NOT SHARE IT!). The advanced password is: ' + advancedpassword);

const sapp = express();

var authenticatedIP = [];
var bannedIP = [];

startApp();


function startApp() {
  sapp.get('/canAutomatic',(req,res) => {
    if (req.ip.split(':')[2] == "1")
    {
      res.send('yes');
    }
    else
    {
      res.send('no');
    }
  });
  sapp.get('/backend/login', (req, res) => {
    var ip = req.ip;
    var parsedip = req.ip.split(':')[2];

    if (!bannedIP.includes(parsedip))
    {
      if (authenticatedIP.includes(parsedip))
      {
        res.status(100).json({ authenticated: true, reason: "Already authenticated"})
      }
      else
      {
        if (parsedip == "1")
        {
          res.status(200).json({ authenticated: true, reason: "The IP corresponding to this request must always be authenticated" });
          authenticatedIP.push("1");
        }
        else
        {
          const { upassword } = req.query;
          if (upassword == password)
          {
            authenticatedIP.push(parsedip);
            res.status(200).json({ authenticated: true, reason: "Password is correct: access granted" });
          }
          else
          {
            res.status(401).json({ authenticated: false, reason: "The password is not correct." });
          }
        }
      }
    }
    else
    {
      res.status(418).json({ authenticated: false, reason: "This IP has been banned from accessing this RAT portal "});
    }
    
  });
  sapp.get('/ban', (req, res) => {
    if (req.query.pass == advancedpassword)
    {
      bannedIP.push(req.query.ip);
      authenticatedIP = authenticatedIP.filter(e => e !== req.query.ip); 
      res.status(200).send('ok');
    }
    else
    {
      res.status(401).send('The password is not correct.');
    }
  });
  sapp.get('/', (req, res) => {
    if (!canProcess) {
      return res.sendStatus(410); // Return status 410 when canProcess is false
    }

    if (!authenticatedIP.includes(req.ip.split(':')[2])) {
      res.status(401).send('<script>window.location.replace("./login")</script>');
      return;
    }

    const filePath = path.join(__dirname, 'index.html');

    fs.readFile(filePath, 'utf8', (err, fileContent) => {
      if (err) {
        console.error(`Error reading file: ${err}`);
        return res.status(500).send('Internal Server Error');
      }

      res.setHeader('Cache-Control', 'no-store'); // Disable caching
      res.send(fileContent);
    });
  });

  sapp.get('/screenStream', (req, res) => {
    if (!canProcess) {
      return res.sendStatus(410); // Return status 410 when canProcess is false
    }

    if (!authenticatedIP.includes(req.ip.split(':')[2])) {
      return res.sendStatus(401);
    }

    const filePath = path.join(__dirname, 'stream.html');

    fs.readFile(filePath, 'utf8', (err, fileContent) => {
      if (err) {
        console.error(`Error reading file: ${err}`);
        return res.status(500).send('Internal Server Error');
      }

      res.setHeader('Cache-Control', 'no-store'); // Disable caching
      res.send(fileContent);
    });
  });

  sapp.get('/login', (req, res) => {
    if (!canProcess) {
      return res.sendStatus(410); // Return status 410 when canProcess is false
    }

  

    // Login page: should be able to access

    const filePath = path.join(__dirname, 'login.html');

    fs.readFile(filePath, 'utf8', (err, fileContent) => {
      if (err) {
        console.error(`Error reading file: ${err}`);
        return res.status(500).send('Internal Server Error');
      }

      res.setHeader('Cache-Control', 'no-store'); // Disable caching
      res.send(fileContent.replace('REPLACE', firstTime));
      firstTime = "false";
    });
  });

  sapp.get('/sendMessage', (req, res) => {
    if (!canProcess) {
      return res.sendStatus(410); // Return status 410 when canProcess is false
    }

    if (!authenticatedIP.includes(req.ip.split(':')[2])) {
      return res.sendStatus(401);
    }

    const { content } = req.query;

    var id = registerMessage(content);

    exec(platformCommand + ' http://localhost/messages/' + id, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error opening file: ${error}`);
        res.setHeader('Cache-Control', 'no-store'); // Disable caching
        res.send('Internal Error: ' + error);
      }
    });

    res.send('ok');
  });

  sapp.get('/getScreenshot', (req, res) => {
    if (!canProcess) {
      return res.sendStatus(410); // Return status 410 when canProcess is false
    }

    if (!authenticatedIP.includes(req.ip.split(':')[2])) {
      return res.sendStatus(401);
    }

    screenshot().then((image) => {
      res.set('Content-Type', 'image/png');
      res.send(image);
    }).catch((error) => {
      console.error(`Error capturing screenshot: ${error}`);
      res.status(500).send('Internal Server Error');
    });
  });

  sapp.get('/internal/iframeplaceholder', (req, res) => {
    if (!canProcess) {
      return res.sendStatus(410); // Return status 410 when canProcess is false
    }

    if (!authenticatedIP.includes(req.ip.split(':')[2])) {
      return res.sendStatus(401);
    }

    res.status(201).send('<h1>Your content will appear here</h1>');
  });

  sapp.get('/run', (req, res) => {
    if (!canProcess) {
      return res.sendStatus(410); // Return status 410 when canProcess is false
    }

    if (!authenticatedIP.includes(req.ip.split(':')[2])) {
      return res.sendStatus(401);
    }

    const { command } = req.query;
    exec(command, (error, stdout, stderr) => {
      res.status(201).json({ output: stdout, error: stderr });
    });
  });

  sapp.get('/proxy', (req, res) => {
    if (!canProcess) {
      return res.sendStatus(410); // Return status 410 when canProcess is false
    }

    if (!authenticatedIP.includes(req.ip.split(':')[2])) {
      return res.sendStatus(401);
    }

    const { url } = req.query;
  
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is missing' });
    }
  
    axios.get(url)
      .then(response => {
        res.send('\n<h1 style="color: red;">RAT Proxy</h1>' + response.data);
      })
      .catch(error => {
        res.status(500).json({ error: 'Failed to fetch URL content' });
      });
  });

  // Disable route to set canProcess variable to false
  sapp.get('/disable', (req, res) => {
    canProcess = false;

    if (!authenticatedIP.includes(req.ip.split(':')[2])) {
      return res.sendStatus(401);
    }

    res.send('ok');
  });

  sapp.listen(port, () => {
    const ip = require('ip').address();
    const filePath = path.join(__dirname, 'ip.txt');
    const fileContent = 'On a browser, from the same WiFi of the PC, go to http://' + ip + '/ to access the RAT portal\n\nThanks for using HTTPRAT!';

    fs.writeFile(filePath, fileContent, (err) => {
      if (err) throw err;
      console.log('HTTPRAT');

      // Open the ip.txt file
      exec(platformCommand + ' ' + filePath, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error opening file: ${error}`);
          return;
        }
      });
    });
  });

  function registerMessage(messageContent) {
    const characters = '0123456789';
    let messageID = '';
    for (let i = 0; i < 70; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      messageID += characters.charAt(randomIndex);
    }

    sapp.get('/messages/' + messageID, (req, res) => {
      res.send('<title>Message</title> <p>' + messageContent + '</p>');
    });

    return messageID;
  }

  
}
