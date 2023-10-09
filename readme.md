# Tests for passing messages between threads and alternatives that might be faster

This is an attempt to see if there's a way to pass messages between threads that can
be faster than just using worker.onmessage/postmessage

CPU analysis shows that for this simple example copying the data between workers takes about 1ms
Copying between two workers doubles that.

Based on the size of the notebook, running this test shows:

Main thread started
Worker thread one started
Worker thread two started
Main thread finished
Single time: 1210ms
Multithread time: 2075ms <-- This should all be extra copies of the data.

Thoughts on what to do:

## Idea 1: Use MessageChannel and respond directly to the main thread

Doesn't work in VS code because main thread isn't controlled by us. It's actually in a separate process.

## Idea 2: Pass shared array buffers instead of json object.

Not sure if this is faster. To put into a SharedArrayBuffer, we need to serialize to a byte array. Don't have
to pass messages with the data though, just with the SharedArrayBuffer.

Other side can Atomic.waitAsync on the sharedArrayBuffer.

So far - 5% faster. All the time spent is in the serialization of something that can be passed as a byte array.

## Idea 3: Transfer ownership of the write stream to the second worker.

Makes it impossible to respond in the first worker then. Pylance needs to send sync messages over that stream.

## Idea 4: Don't have a second thread, just make everything async and make sure only one request is handled at a time.

This would be done with a 'dispatcher' in front of the server. It would queue up requests and send them to the now
async server. Async reads would then be fine (well assuming files haven't changed on disk in the middle of reading)

## Idea 5: Use streams between the two threads.

Might be faster than posting a message. Can transfer streams between threads to give them to out to the worker thread?
Maybe the stream can just be a shared file

## Idea 6: Use net server between the two threads.

This has to be slower as it's opening a port.
