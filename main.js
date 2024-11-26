const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { YtdlCore, toPipeableStream } = require('@ybd-project/ytdl-core');
const ytSearch = require('yt-search');
const SpotifyWebApi = require('spotify-web-api-node');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path.replace('app.asar', 'app.asar.unpacked');
const ffmpeg = require('fluent-ffmpeg');
const sleep = require('sleep-promise');
const os = require('os');

ffmpeg.setFfmpegPath(ffmpegPath);

const ytdl = new YtdlCore({});

//creates directory to store the songs if it doesn't exist
function checkDir(downloadDir) {
    console.log('download Directory');
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir);
    }
}

//Initializing spotify API client
const spotifyApi = new SpotifyWebApi({
    clientId: '7a7146592fd04d468d8251af35145820',
    clientSecret: '39f7e6c8174b413aaba9a98da8cde526'
});

//get access token from spotify API
async function getAccessToken() {
    console.log('accessing token');
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
    } catch (err) {
        console.error('Error retrieving access token', err);
    }
}

//get youtube Url from the first video found by name
async function getYoutubeUrl(videoName) {
    const result = await ytSearch(videoName);
    if (result && result.videos.length > 0) {
        console.log('it got to result youtube url');
        console.log(result.videos[0].url);
        return result.videos[0].url
    }
    return null;
}

async function convertAudio(videoname, artistname, downloadDir) {
    console.log('ffmpeg got called');
    const inputFile = path.join(downloadDir, `./${artistname} - ${videoname}`);
    const outputFile = path.join(downloadDir, `./${artistname} - ${videoname}.mp3`);

    ffmpeg(inputFile).toFormat('mp3').on('end', () => {
        console.log('conversion completed!');
        fs.unlinkSync(inputFile);
    }).save(outputFile);
}

//downloads the audio from the video's url got by getYoutubeUrl
async function downloadVideo(videoname, artistname, downloadDir) {
    try {
        const url = await getYoutubeUrl(`${artistname} - ${videoname}`);

        const safeVideoName = await safeName(videoname);

        await ytdl.download(url, { filter: 'audioonly' }).then((stream) => {
            toPipeableStream(stream).pipe(fs.createWriteStream(path.join(downloadDir, `./${artistname} - ${safeVideoName}`)))
        });

        await sleep(1500);

        await convertAudio(safeVideoName, artistname, downloadDir);

    } catch (err) {
        console.error(`Error downloading ${videoname}`);
    }
}

// Function to search for the playlist by name in Spotify
async function getPlaylistTrack(playlistName) {
    try {
        console.log(`Searching for playlist: "${playlistName}"`);

        const data = await spotifyApi.searchPlaylists(playlistName);

        const playlist = data.body.playlists.items[0];

        const tracks = await spotifyApi.getPlaylistTracks(playlist.id);

        return tracks.body.items.map(item => {
            const trackName = item.track.name;
            const artistName = item.track.artists.map(artist => artist.name);
            return {trackName, artistName};
        });

    } catch (err) {
        console.error('Error fetching playlist tracks:', err);
        throw new Error(`Error fetching playlist: ${err.message}`);
    }
}

//if you already have the id through a link use this
async function getPlayTrackwithId(playId) {
    const tracks = await spotifyApi.getPlaylistTracks(playId);

    return tracks.body.items.map(item => {
        const trackName = item.track.name;
        const artistName = item.track.artists.map(artist => artist.name);
        return { trackName, artistName };
    });
}

//gets the actual name of the playlist that was found
async function getPlaylistName(playName){
    const data = await spotifyApi.searchPlaylists(playName);
    const playlist = data.body.playlists.items[0];
    return playlist.name;
}

async function safeName(fileName){
    console.log('filename: ', fileName);
    return fileName.replace(/[\/\\?%*:|"<>]/g, '_');
}

//the heart of everything, the main which calls everything else
ipcMain.handle('download-playlist', async (event, playName) => {
    console.log(`Received request to download playlist: ${playName}`);

    const regex = /playlist\/([a-zA-Z0-9]+)/;
    await getAccessToken();

    const playMatch = playName.match(regex);
    if (playMatch) {
        const playId = playMatch[1];
        console.log('playId: ', playId);

        const playData = await spotifyApi.getPlaylist(playId);
        const playlistName = playData.body.name;

        const safePlayName = await safeName(playlistName);

        const downloadDir = path.join(os.homedir(), 'Downloads', `./${safePlayName}`);
        checkDir(downloadDir);

        const tracks = await getPlayTrackwithId(playId);
        for (const { trackName, artistName } of tracks) {
            await downloadVideo(trackName, artistName, downloadDir);
        }

    } else {
        const playlistName = await getPlaylistName(playName);
        const safePlayName = await safeName(playlistName);

        const downloadDir = path.join(os.homedir(), 'Downloads', `./${safePlayName}`);
        checkDir(downloadDir);

        const tracks = await getPlaylistTrack(playName);
        for (const { trackName, artistName } of tracks) {
            await downloadVideo(trackName, artistName, downloadDir);
        }
    }
});

function createMainWindow(){
    const mainWindow = new BrowserWindow({
        title: 'Image renderer',
        width: 800,
        height: 850,
        webPreferences: {
            nodeIntegration: true, // Allow Node.js integration
            contextIsolation: false // Disable context isolation (less secure)
        }
    });

    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.plataform !== 'darwin') {
        app.quit();
    }
});
