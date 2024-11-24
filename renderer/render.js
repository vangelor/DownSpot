console.log("Renderer process is working");

const { ipcRenderer } = require('electron');

const input = document.getElementById('playlistInput');
const button = document.getElementById('downloadButton');

button.addEventListener('click', async () => {
    const playName = input.value.trim();
    console.log(`Attempting to download playlist: ${playName}`);
    console.log(typeof(playName));

    if(playName) {
        console.log('if playName');
        const result = await ipcRenderer.invoke('download-playlist', playName);
        console.log(result);
    }
});