var clientId = '920ff2e1-1451-47e2-9308-2e23791b195b';

var redirUri = 'https://flux-map-sketcher.herokuapp.com/';
// var redirUri = 'http://localhost:5000';

var sdk = new FluxSdk(clientId, {
  redirectUri: redirUri // your port
});

var credentials = getFluxCredentials();
if (!credentials) {
    // Clear local storage in case there are old state or nonce values
    if (!window.location.hash.match(/access_token/)) {
        window.location.replace(sdk.getAuthorizeUrl(getState(), getNonce()));
    } else {
        sdk.exchangeCredentials(getState(), getNonce())
        .then(function(credentials) {
            setFluxCredentials(credentials);
        })
        .then(function() {
            // redirect somewhere else
            window.location.replace(redirUri);
        });
    }
}

function getUser() {
    var credentials = getFluxCredentials();
    return sdk.getUser(credentials);
}

function getProjects() {
    return getUser().listProjects();
}

function getDataTable(project) {
    return new sdk.Project(getFluxCredentials(), project.id).getDataTable();
}

function getKeys(project) {
    return getDataTable(project).listCells();
}

function getCell(project, key) {
    return getDataTable(project).getCell(key.id);
}

function getValue(project, key) {
    return getCell(project, key).fetch();
}

function getFluxCredentials() {
    return JSON.parse(localStorage.getItem('fluxCredentials'));
}

function setFluxCredentials(credentials) {
    localStorage.setItem('fluxCredentials', JSON.stringify(credentials));
}

function generateRandomToken() {
    var tokenLength = 24;
    var randomArray = [];
    var characterSet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var i = 0; i < tokenLength; i++) {
        randomArray.push(Math.floor(Math.random() * tokenLength));
    }
    return btoa(randomArray.join('')).slice(0, 48);
}

function getState() {
    var state = localStorage.getItem('state') || generateRandomToken();
    localStorage.setItem('state', state);
    return state;
}

function getNonce() {
    var nonce = localStorage.getItem('nonce') || generateRandomToken();
    localStorage.setItem('nonce', nonce);
    return nonce;
}
