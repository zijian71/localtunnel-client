const http = require('http');
const express = require('express');
const app = express();
const path = require('path');
const { isText, isBinary, getEncoding } = require('istextorbinary')

const EventEmitter = require('events');

const eventEmitter = new EventEmitter();

app.use(express.static('Inspector/public'));

app.get('/', (req, res) => {
  return res.sendFile(path.join(__dirname, 'view/index.html'));
})

let sendEvent;

app.get('/event-stream', async (req, res) => {

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(`event: ping\ndata: 1\n\n`);

  sendEvent = (event, data) => {
    res.write(`data: ${data}\n\n`);
  };
  // for (;;) {

  //   res.write(`event: ping\ndata: 1\n\n`);
  //   // res.write(`data: 1\n\n`);

  //   await new Promise(resolve => {
  //     setTimeout(resolve, 2000);
  //   })
  // }
  // res.write('end');
  // res.end();
})

eventEmitter.on('inspector:data', (data) => {
  if(sendEvent) {
    sendEvent('inspector:data', JSON.stringify({
      connId: data.connId,
      isBinary: isBinary(null, data.buffer),
      type: data.type,
      raw: data.buffer?.toString(),
      timestamp: +new Date(),
    }));
  }
});

const server = http.createServer(app);

server.listen();

server.on('error', onError);
server.on('listening', onListening);
server.on('close', function () {
  console.log('We going to closed!');
  process.exit();
});

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
      throw error;
  }

  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
      case 'EACCES':
          console.error(bind + ' requires elevated privileges');
          process.exit(1);
          break;
      case 'EADDRINUSE':
          console.error(bind + ' is already in use');
          process.exit(1);
          break;
      default:
          throw error;
  }
}

/**
* Event listener for HTTP server "listening" event.
*/

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  console.log('Web Interface Listening on ' + bind);
}

module.exports = {
  eventEmitter,
}
