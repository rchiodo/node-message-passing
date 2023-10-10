import * as net from 'net';
import * as os from 'os';
import * as path from 'path';

var server = net.createServer(function (stream) {
    stream.on('data', function (c) {
        console.log('data:', c.toString());
    });
    stream.on('end', function () {
        server.close();
    });
});

let sock: string;
if (os.platform() === 'win32') {
    sock = '\\\\.\\pipe\\test.sock';
} else {
    sock = path.join(os.tmpdir(), 'test.sock');
}

server.listen(sock);

const stream = net.connect(sock);
stream.write('hello');
stream.end();
