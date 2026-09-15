// -------------------------------------------------
// app.js – UI helpers for the Bluetooth Chat app
// -------------------------------------------------

/**
 * Called from the Java side (JSBridge) to update the
 * list of discovered devices.
 *
 * @param {string} devicesJson   JSON string: [{name, address}, …]
 */
function updateDeviceList(devicesJson) {
    const devices = JSON.parse(devicesJson);
    const ul = document.getElementById('device-list');
    ul.innerHTML = '';                     // clear old entries

    devices.forEach(dev => {
        const li = document.createElement('li');
        li.textContent = `${dev.name} (${dev.address})`;
        li.dataset.address = dev.address;
        li.onclick = () => {
            // Forward the click to Java (JSBridge injected by JavaFX)
            if (window.javaBridge && typeof window.javaBridge.onDeviceSelected === 'function') {
                window.javaBridge.onDeviceSelected(dev.address);
            }
        };
        ul.appendChild(li);
    });
}

/**
 * Called by Java when a remote message arrives.
 *
 * @param {string} text  The received chat line.
 */
function receiveMessage(text) {
    const log = document.getElementById('chat-log');
    const div = document.createElement('div');
    div.className = 'message incoming';
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;   // keep newest at bottom
}

/**
 * UI → Java: send a typed message.
 */
document.getElementById('send-btn').addEventListener('click', () => {
    const input = document.getElementById('message-input');
    const txt = input.value.trim();
    if (!txt) return;

    // show locally as an outgoing bubble
    const log = document.getElementById('chat-log');
    const div = document.createElement('div');
    div.className = 'message outgoing';
    div.textContent = txt;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;

    // forward to Java for Bluetooth transmission
    if (window.javaBridge && typeof window.javaBridge.onSendMessage === 'function') {
        window.javaBridge.onSendMessage(txt);
    }

    input.value = '';
});

/**
 * Refresh button – ask Java to start a new discovery cycle.
 */
document.getElementById('refresh-btn').addEventListener('click', () => {
    if (window.javaBridge && typeof window.javaBridge.refresh
