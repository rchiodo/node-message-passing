import { parentPort } from 'worker_threads';
import * as fs from 'fs';
import { HeaderUniqueKey } from './sharedFileConstants';
import { PackrStream } from 'msgpackr';

class WorkerSharedFile {
    private _sharedWriteStream: fs.WriteStream | undefined;
    run() {
        console.log('Worker shared file started');
        parentPort?.on('message', this._handleMessage.bind(this));
    }

    private _handleMessage(message: any) {
        switch (message.type) {
            case 'quit':
                parentPort?.postMessage({ type: 'quit' });
                parentPort?.close();
                break;
            case 'start_shared_file':
                this._sharedWriteStream = fs.createWriteStream(message.path, { flags: 'w+' });
                break;

            case 'read_notebook':
                const notebook = this._readNotebook(message.path);

                // Write the header first.
                this._sharedWriteStream?.write(Buffer.from(HeaderUniqueKey));

                // Then stream the notebook.
                const packrStream = new PackrStream();
                packrStream.pipe(this._sharedWriteStream!);
                packrStream.write(notebook);
                packrStream.end();
                break;
        }
    }

    private _readNotebook(path: string) {
        // Reread each time to mimic some actual processing
        const nb = JSON.parse(fs.readFileSync(path, 'utf-8'));
        return nb;
    }
}

const worker = new WorkerSharedFile();
worker.run();
