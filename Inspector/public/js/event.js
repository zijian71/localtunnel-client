import { v4 as uuidv4 } from 'https://jspm.dev/uuid';

export function initEvent () {
    const evtSource = new EventSource('/event-stream');
    
    evtSource.addEventListener('ping', (event) => {
        console.log('ping', event);
    });

    evtSource.onmessage = function (event) {
        processEvent(event.data);
    };

    evtSource.onopen = function (event) {
        console.log('connected');
    };

    evtSource.onerror = function (event) {
        console.log('disconnected');
    };
}

const randomId = {};
const allEvent = {};

function processEvent(data) {
    try {
        data = JSON.parse(data);
        if(data.type === 'request') {
            let request = parseRequest(data.raw);
            if(data.isBinary) {
                request.body = 'Binary Data';
            }
            if(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTION'].includes(request.method)) {
                const uuid = uuidv4();
                randomId[data.connId] = uuid;
                let urlDetail = new URL(`http://example.com${request.uri}`);
                const table = document.getElementById("all-request").getElementsByTagName('tbody')[0];
                const rowRef = table.insertRow(0);
                rowRef.id = `req-${uuid}`;
                rowRef.onclick = function () {
                    document.getElementById('selected-row').innerHTML = 
                    `
                    #${rowRef.id} {
                        background-color: #000 !important;
                        color: #fff !important;
                    }
                    `;
                    drawReqResDetail(uuid);
                };
                rowRef.innerHTML = 
                `
                <tr>
                    <td class="wrapped">
                        <div>${request.method} ${urlDetail.pathname}</div>
                    </td>
                    <td class="text-end"></td>
                    <td class="text-end"></td>
                </tr>
                `;
                allEvent[uuid] = {
                    isPendingResponse: true,
                    urlDetail: urlDetail,
                    isBinary: data.isBinary,
                    request: {
                        ...request,
                        raw: data.raw,
                    },
                    requestAt: data.timestamp,
                    rowRef,
                }
            }
            else {
                if(randomId[data.connId] && allEvent[randomId[data.connId]]) {
                    let temp = allEvent[randomId[data.connId]];
                    if(!temp.request) {
                        temp.request = {
                            raw: data.raw,
                        };
                    }
                    else {
                        temp.request.raw += data.raw;
                    }
                    temp.request = {
                        ...parseRequest(temp.request.raw),
                        raw: temp.request.raw,
                    }
                    if(temp.isBinary) {
                        temp.request.body = 'Binary Data';
                    }
                }
            }
        }
        else if(data.type === 'response') {
            if(randomId[data.connId] && allEvent[randomId[data.connId]]) {
                let temp = allEvent[randomId[data.connId]];
                temp.responseAt = data.timestamp;
                if(!temp.response) {
                    temp.response = {
                        raw: data.raw,
                    };
                }
                else {
                    temp.response.raw += data.raw;
                }
                temp.response = {
                    ...parseResponse(temp.response.raw),
                    raw: temp.response.raw,
                }
                if(data.isBinary) {
                    temp.response.body = 'Binary Data';
                }
                temp.rowRef.querySelector('td:nth-child(2)').innerHTML = `${temp.response.statusCode} ${temp.response.statusMessage}`;
                temp.rowRef.querySelector('td:nth-child(3)').innerHTML = `${temp.responseAt - temp.requestAt}ms`;
            }
        }
        else if(data.type === 'response-end') {
            delete randomId[data.connId];
        }
    }
    catch (err) {
        console.log(err)
    }
}

function drawReqResDetail(uuid) {
    let e = allEvent[uuid];
    if(e) {
        let requestSummary = [];
        if(e.urlDetail.searchParams.toString().length > 0) {
            let temp = [];
            e.urlDetail.searchParams.forEach((value, key) => {
                temp.push(`${key}:${value}`);
            })
            requestSummary.push(`<h6>Query Params</h6><pre><code>${temp.join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
        }
        requestSummary.push(`<h6>${e.request.headers['content-type'] || 'Request Body'}</h6><pre><code>${e.request.body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`)
        document.getElementById('request-title').innerHTML = `${e.request.method} ${e.urlDetail.pathname}`;
        document.getElementById('request-title-2').innerHTML = 
        `
        <span title="${new Date(e.requestAt).toISOString()}" class="muted">${timeSince(e.requestAt)} ago</span>
        <span class="muted" style="margin-left: 30px;" >Duration</span>
        <span class="muted" style="margin-left: 8px;" >${e.responseAt - e.requestAt}ms</span>
        `;
        document.getElementById("request-detail").innerHTML = 
        `
        <nav>
            <div class="nav nav-tabs" id="nav-tab" role="tablist">
            <button class="nav-link active" id="req-summary-tab" data-bs-toggle="tab" data-bs-target="#req-summary" type="button" role="tab" aria-controls="req-summary" aria-selected="true">Summary</button>
            <button class="nav-link" id="req-header-tab" data-bs-toggle="tab" data-bs-target="#req-header" type="button" role="tab" aria-controls="req-header" aria-selected="false">Headers</button>
            <button class="nav-link" id="req-raw-tab" data-bs-toggle="tab" data-bs-target="#req-raw" type="button" role="tab" aria-controls="req-raw" aria-selected="false">Raw</button>
            </div>
        </nav>
        <div class="tab-content" id="req-tabContent">
            <div class="tab-pane fade show active" id="req-summary" role="tabpanel" aria-labelledby="req-summary-tab">
                ${requestSummary.join('')}
            </div>
            <div class="tab-pane fade" id="req-header" role="tabpanel" aria-labelledby="req-header-tab">
                <pre><code>${Object.keys(e.request.headers).map(o => `${o}:${e.request.headers[o]}`).join('\n\n').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            </div>
            <div class="tab-pane fade" id="req-raw" role="tabpanel" aria-labelledby="req-raw-tab">
                <pre><code>${e.request.raw.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            </div>
        </div>
        `;
    
        let responseBody = e.response.body;
        if(e.response?.headers?.['Content-Type']?.indexOf('application/json') >= 0) responseBody = JSON.stringify(JSON.parse(e.response.body), null, 2);
        document.getElementById('response-title').innerHTML = `${e.response.statusCode} ${e.response.statusMessage}`;
        document.getElementById("response-detail").innerHTML = 
        `
        <nav>
            <div class="nav nav-tabs" id="nav-tab" role="tablist">
            <button class="nav-link active" id="res-summary-tab" data-bs-toggle="tab" data-bs-target="#res-summary" type="button" role="tab" aria-controls="res-summary" aria-selected="true">Summary</button>
            <button class="nav-link" id="res-header-tab" data-bs-toggle="tab" data-bs-target="#res-header" type="button" role="tab" aria-controls="res-header" aria-selected="false">Headers</button>
            <button class="nav-link" id="res-raw-tab" data-bs-toggle="tab" data-bs-target="#res-raw" type="button" role="tab" aria-controls="res-raw" aria-selected="false">Raw</button>
            </div>
        </nav>
        <div class="tab-content" id="res-tabContent">
            <div class="tab-pane fade show active" id="res-summary" role="tabpanel" aria-labelledby="res-summary-tab">
                <h6>${e.response.headers['Content-Type'] || 'Response Body'}</h6>
                <pre><code>${responseBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            </div>
            <div class="tab-pane fade" id="res-header" role="tabpanel" aria-labelledby="res-header-tab">
                <pre><code>${Object.keys(e.response.headers).map(o => `${o}:${e.response.headers[o]}`).join('\n\n').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            </div>
            <div class="tab-pane fade" id="res-raw" role="tabpanel" aria-labelledby="res-raw-tab">
                <pre><code>${e.response.raw.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            </div>
        </div>
        `;
    }
}
