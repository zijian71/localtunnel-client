function timeSince(timestamp) {

    var seconds = Math.floor((+new Date() - timestamp) / 1000);

    var interval = seconds / 31536000;

    if (interval > 1) {
        return Math.floor(interval) + " years";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " months";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " days";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " hours";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " minutes";
    }
    return Math.floor(seconds) + " seconds";
}


const convert = {
    binary: {
        toArrayBuffer(binary) {
            return Uint8Array.from(binary, s => s.charCodeAt(0)).buffer;
        },
        toBlob(binary, mimeType) {
            return new Blob([binary], { type: mimeType });
        },
        toBase64: binary => btoa(binary)
    },
    arrayBuffer: {
        toBinary(ab) {
            return String.fromCharCode(...new Uint8Array(ab));
        },
        toBlob(ab, mimeType) {
            return new Blob([ab], { type: mimeType });
        },
        toBase64(ab) {
            return btoa(this.toBinary(ab));
        },
    },
    blob: {
        _readAsync(blob, mode) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(reader.result);
                reader.onerror = reject;
                reader[mode](blob);
            });
        },
        toBinaryAsync(blob) {
            return this._readAsync(blob, 'readAsBinaryString');
        },
        toArrayBufferAsync(blob) {
            return this._readAsync(blob, 'readAsArrayBuffer');
        },
        toBase64Async(blob) {
            return this._readAsync(blob, 'readAsDataURL').then(dataUri =>
                dataUri.replace(/data:[^;]+;base64,/, '')
            );
        }
    },
    base64: {
        toBinary: b64 => atob(b64),
        toArrayBuffer: b64 => convert.binary.toArrayBuffer(atob(b64)),
        toBlob: (b64, mimeType) => convert.binary.toBlob(atob(b64), mimeType)
    }
};

function parseRequest (requestString) {
    var headerLines, line, lines, parsedRequestLine, request;
    request = {};
    lines = requestString.split(/\r?\n/);
    parsedRequestLine = parseRequestLine(lines.shift());
    request['method'] = parsedRequestLine['method'];
    request['uri'] = parsedRequestLine['uri'];
    headerLines = [];
    while (lines.length > 0) {
        line = lines.shift();
        if (line === "") {
            break;
        }
        headerLines.push(line);
    }
    request['headers'] = parseHeaders(headerLines);
    request['body'] = lines.join('\r\n');
    return request;
};

function parseResponse (responseString) {
    var headerLines, line, lines, parsedStatusLine, response;
    response = {};
    lines = responseString.split(/\r?\n/);
    parsedStatusLine = parseStatusLine(lines.shift());
    response['protocolVersion'] = parsedStatusLine['protocol'];
    response['statusCode'] = parsedStatusLine['statusCode'];
    response['statusMessage'] = parsedStatusLine['statusMessage'];
    headerLines = [];
    while (lines.length > 0) {
        line = lines.shift();
        if (line === "") {
            break;
        }
        headerLines.push(line);
    }
    response['headers'] = parseHeaders(headerLines);
    response['body'] = lines.join('\r\n');
    return response;
};

function parseHeaders (headerLines) {
    var headers, i, key, len, line, parts;
    headers = {};
    for (i = 0, len = headerLines.length; i < len; i++) {
        line = headerLines[i];
        parts = line.split(":");
        key = parts.shift();
        headers[key] = parts.join(":").trim();
    }
    return headers;
};

function parseStatusLine (statusLine) {
    var parsed, parts;
    parts = statusLine.match(/^(.+) ([0-9]{3}) (.*)$/);
    parsed = {};
    if (parts !== null) {
        parsed['protocol'] = parts[1];
        parsed['statusCode'] = parts[2];
        parsed['statusMessage'] = parts[3];
    }
    return parsed;
};

function parseRequestLine (requestLineString) {
    var parsed, parts;
    parts = requestLineString.split(' ');
    parsed = {};
    parsed['method'] = parts[0];
    parsed['uri'] = parts[1];
    parsed['protocol'] = parts[2];
    return parsed;
};
