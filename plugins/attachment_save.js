var fs = require('fs');
var tmp = require('tmp');

exports.hook_data = function (next, connection) {
    connection.loginfo("<<<<<<<<<<<<<<<<<<<<<hook data");
    connection.transaction.parse_body = 1;
    connection.transaction.notes.attachment_tmpfiles = [];
    connection.transaction.notes.attachment_filesnames = [];
    connection.transaction.notes.attachment_filesct = [];
    
    connection.transaction.notes.attachment_queue_length = 0;

    connection.transaction.attachment_hooks( function (ct, fn, body, stream) {
            connection.loginfo("------ attachment cb");
            connection.loginfo(ct);
            connection.loginfo("------ attachment fn");
            connection.loginfo(fn);
            // connection.loginfo("------ attachment body");
            // connection.loginfo(body);

            connection.transaction.notes.attachment_queue_length++;

            stream.connection = connection; // Allow backpressure
            stream.pause();

            tmp.file(function (err, path, fd) {
                connection.loginfo("Got tempfile: " + path + " (" + fd + ")");
                connection.transaction.notes.attachment_tmpfiles.push(path);
                connection.transaction.notes.attachment_filesnames.push(fn);
                connection.transaction.notes.attachment_filesct.push(ct);
                start_att(connection, ct, fn, body, stream, path, fd)
            });
    });
    next();
}

exports.hook_data_post = function (next, connection) {
    if (connection.transaction.notes.attachment_queue_length > 0) {
        connection.transaction.notes.currently_writing_cb = next;
    }
    else {
        next();
    }
}

function start_att (connection, ct, fn, body, stream, path, fd) {
    connection.loginfo("<<<<<<<<<<<<<<<<<<<<<Getting attachment");
    connection.loginfo("Got attachment: " + ct + ", " + fn + " for user id: " + "user");

    var ws = fs.createWriteStream(path);
    stream.pipe(ws);
    stream.resume();
    connection.loginfo("after create write stream for " + fn);
    ws.on('close', function ( ) {
        connection.loginfo("End of stream reached for " + fn);
        fs.fstat(fd, function (err, stats) {
            connection.loginfo("Got data of length: " + stats.size);
            connection.transaction.notes.attachment_queue_length--;
            if (connection.transaction.notes.currently_writing_cb) {
                connection.transaction.notes.currently_writing_cb();
            }
        });
    });
}

