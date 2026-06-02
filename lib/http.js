async function request({ url, method = 'GET', headers = {}, auth, data } = {}) {
    const finalHeaders = { ...headers };

    if (auth && auth.username != null) {
        const token = Buffer.from(`${auth.username}:${auth.password ?? ''}`).toString('base64');
        finalHeaders['Authorization'] = `Basic ${token}`;
    }

    const init = { method, headers: finalHeaders };

    if (data != null && method !== 'GET' && method !== 'HEAD') {
        finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
        init.body = typeof data === 'string' ? data : JSON.stringify(data);
    }

    const res = await fetch(url, init);

    let body = null;
    const text = await res.text();
    if (text) {
        try {
            body = JSON.parse(text);
        } catch {
            body = text;
        }
    }

    if (!res.ok) {
        const err = new Error(`Request to ${url} failed with status ${res.status}`);
        err.status = res.status;
        err.data = body;
        throw err;
    }

    return { status: res.status, headers: res.headers, data: body };
}

function get(url, config = {}) {
    return request({ ...config, url, method: 'GET' });
}

function post(url, data, config = {}) {
    return request({ ...config, url, method: 'POST', data });
}

export default { request, get, post };
