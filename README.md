Gets the tracks inside a spotify playlist, searches them on youtube, gets the audio from youtube and converts it to mp3.

Must have installed Node.js, npm and rpm.

On linux:

git clone https://github.com/vangelor/DownSpot.git

cd DownSpot

npm install

npm install --save-dev @electron-forge/cli
npm exec --package=@electron-forge/cli -c "electron-forge import"

You might need to install fakerootS

npm run package

npm run make

cd out/downspot-linux-x64/  (if your linux has x64 architecture)

In this folder there will be a executable called downspot

You can use it inside this folder or change it's place

On mac:

git clone https://github.com/vangelor/DownSpot.git

cd DownSpot

npm install

npm start

(There's still problems with the executable on mac so you can only run it on the termial)

Windows:

Not tested yet
