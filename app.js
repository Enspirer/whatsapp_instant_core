const { Client, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');

const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const request = require('request');

const port = process.env.PORT || 3100;

const app = express();


const server = http.createServer(app);
const io = socketIO(server);
const widget_id = null;
const project_id = 1;

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(fileUpload({
  debug: true
}));

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionCfg = require(SESSION_FILE_PATH);
}

const client = new Client({
  restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ],
  },
  session: sessionCfg
});

client.on('message', msg => {

  // default_server_auth_status
  console.log('request_success');
  if(project_id){
    var options = {
      'method': 'POST',
      'url': 'https://tallentor.com/api/ims_chat_insert',
      'headers': {
      },
      formData: {
        'phone_number': msg.from,
        'name': 'Sanjaya Senevirathne',
        'type': 'WhatsApp',
        'email': 'null',
        'status': 'Pending',
        'project_id': project_id,
        'widget_id': 'unasign',
        'facebook_user_name': 'null',
        'message':msg.body
      }
    };
  }else{
    var options = {
      'method': 'POST',
      'url': 'https://tallentor.com/api/ims_chat_insert',
      'headers': {
      },
      formData: {
        'phone_number': msg.from,
        'name': 'Sanjaya Senevirathne',
        'type': 'WhatsApp',
        'email': 'null',
        'status': 'Pending',
        'project_id': 'unasign',
        'widget_id': 'unasign',
        'facebook_user_name': 'null',
        'message':msg.body
      }
    };
  }
 
  request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
  });

  console.log('option_suucess');
  console.log(msg);
  

  if (msg.body == '!ping') {
    msg.reply('pong');
  } else if (msg.body == 'test') {
    msg.reply('Whatsapp api is work');




  

  } else if (msg.body == '!groups') {
    client.getChats().then(chats => {
      const groups = chats.filter(chat => chat.isGroup);

      if (groups.length == 0) {
        msg.reply('You have no group yet.');
      } else {
        let replyMsg = '*YOUR GROUPS*\n\n';
        groups.forEach((group, i) => {
          replyMsg += `ID: ${group.id._serialized}\nName: ${group.name}\n\n`;
        });
        replyMsg += '_You can use the group id to send a message to the group._'
        msg.reply(replyMsg);
      }
    });
  }
});


  client.initialize();


// Socket IO
io.on('connection', function(socket) {
  socket.emit('message', 'Connecting...');

  client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'QR Code received, scan please!');
    });
  });

  client.on('ready', () => {
    socket.emit('ready', 'Whatsapp is ready!');
    socket.emit('message', 'Whatsapp is ready!');
  });

  client.on('authenticated', (session) => {
    socket.emit('authenticated', 'Whatsapp is authenticated!');
    socket.emit('message', 'Whatsapp is authenticated!');
    console.log('AUTHENTICATED', session);
    //Post Status to Tallentor

    if(project_id){
      var options = {
        'method': 'POST',
        'url': 'https://tallentor.com/api/project_server_auth_status',
        'headers': {
        },
        formData: {
          'status': 'Authenticated',
          'project_id' : project_id
        }
      };
    }else{
      var options = {
        'method': 'POST',
        'url': 'https://tallentor.com/api/default_server_auth_status',
        'headers': {
        },
        formData: {
          'status': 'Authenticated'
        }
      };
    }

    request(options, function (error, response) {
      if (error) throw new Error(error);
      console.log(response.body);
    });

    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err) {
      if (err) {
        console.error(err);
      }
    });
  });

  client.on('auth_failure', function(session) {

    if(project_id){
      var options = {
        'method': 'POST',
        'url': 'https://tallentor.com/api/project_server_auth_status',
        'headers': {
        },
        formData: {
          'status': 'Auth failure',
          'project_id' : project_id
        }
      };
    }else{
      var options = {
        'method': 'POST',
        'url': 'https://tallentor.com/api/default_server_auth_status',
        'headers': {
        },
        formData: {
          'status': 'Auth failure'
        }
      };
    
    }

    request(options, function (error, response) {
      if (error) throw new Error(error);
      console.log(response.body);
    });

    socket.emit('message', 'Auth failure, restarting...');
  });

  client.on('disconnected', (reason) => {

    if(project_id){
      var options = {
        'method': 'POST',
        'url': 'https://tallentor.com/api/project_server_auth_status',
        'headers': {
        },
        formData: {
          'status': 'Disconnected',
          'project_id' : project_id
        }
      };
    }else{
      var options = {
        'method': 'POST',
        'url': 'https://tallentor.com/api/default_server_auth_status',
        'headers': {
        },
        formData: {
          'status': 'Disconnected'
        }
      };
    
    }


   
    request(options, function (error, response) {
      if (error) throw new Error(error);
      console.log(response.body);
    });

    socket.emit('message', 'Whatsapp is disconnected!');
    fs.unlinkSync(SESSION_FILE_PATH, function(err) {
        if(err) return console.log(err);
        console.log('Session file deleted!');
    });
    client.destroy();
    client.initialize();
  });
});


const checkRegisteredNumber = async function(number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
}

// index html
app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

// Send message
app.post('/send-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = phoneNumberFormatter(req.body.number);
  const message = req.body.message;

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered'
    });
  }

  client.sendMessage(number, message).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// Send media
app.post('/send-media', (req, res) => {

  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  const file = req.files.file;
  const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);

  client.sendMessage(number, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// sending media from url
app.post('/send-media-url', async (req, res) => {

  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  const fileUrl = req.body.file_url;
  let mimetype;
  const attachment = await axios.get(fileUrl, {responseType: "arraybuffer"})
      .then(response => {
          mimetype = response.headers['content-type'];
          return response.data.toString('base64');
      });

  const media = new MessageMedia(mimetype, attachment, "Media");

  client.sendMessage(number, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});



server.listen(port, function() {
  console.log('App running on *: ' + port);
});
