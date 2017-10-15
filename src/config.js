const isDev = process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);
const server = !isDev ? 'https://server.synecto.io' : 'http://localhost:4000';
const spa = !isDev ? 'https://app.synecto.io' : 'http://localhost:5000';
module.exports = {
    updateServerUrl:server,
    apiUrl: server,
    frontUrl: spa,
    oauth: {
        dropBox: {
            clientID: '8fvewpw5l3mxxye',
            clientSecret: 'g5ul2poo33ad86x'
        },
        googleDrive: {
            clientID: '32127497436-keders7gf6lpaipsq889rnp9k6fs4ihh.apps.googleusercontent.com',
            clientSecret: '2krfO5-TBJ_If7Sk6SThgISw'
        },
        yandexDisk: {
            clientID: 'af705fbc0c2d4431a1881b8207baf4dd',
            clientSecret: '5b11d42d3b1a433ba551ab35af648d1e'
        }
    },
}