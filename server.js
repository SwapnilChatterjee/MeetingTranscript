


const fs = require('fs');

require("dotenv").config();
const cors = require('cors')
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { Deepgram } = require("@deepgram/sdk");
const path = require("path")

const createIndividualFileToSend = require('./utils/textHandler');
const createGlobalExcel = require("./utils/excelHandler");
const mailer = require('./utils/mailer')
const DG_KEY = process.env.DG_KEY;

if (DG_KEY === undefined) {
    throw "You must define DG_KEY in your .env file";
}

const app = express();
let server = http.createServer(app);

/*
 * Basic configuration:
 * - we expose the `/public` folder as a "static" folder, so the
 *   browser can directly request the js and css files that it contains.
 * - we send the `/public/index.html` file when the browser requests
 *   any route.
 */
app.use(cors())
app.use(express.static(__dirname + "/public"));
app.get("*", function (req, res) {
    res.sendFile(`${__dirname}/public/index.html`);
});

const SocketIoServer = require("socket.io").Server;
const Socket = require("socket.io").Socket;
const io = new SocketIoServer(server);
io.sockets.on("connection", handle_connection);

// container of users
// user_name
// user_email
// joining_timestamp
let users = {};

let globalJSON = {};
// let globalARR = [];

// const MAX_CLIENTS = 2;
/**
 * This function will be called every time a client
 * opens a socket with the server. This is where we will define
 * what to do in reaction to messages sent by clients.
 * @param {Socket} socket */
function handle_connection(socket) {
    socket.on("join", (room, user_data) => {
        try {
            socket.join(room);
            // appending the joining time to the user_data
            user_data['joiningtime'] = (new Date()).toLocaleTimeString(undefined, { timeZone: 'Asia/Kolkata' });

            users[socket.id] = user_data;
            socket.broadcast.to(room).emit("user-joined", socket.id);

            // CHANGES
            const joinInfo = "[" + user_data.joiningtime + "] " + user_data.user_name + " joined.\n"

            // write to the file that the user joined the chat
            fs.appendFile('mytranscript.txt', joinInfo, (err) => {
                if (err) throw err;
            })

            setupWebRTCSignaling(socket);
            setupRealtimeTranscription(socket, room);

            socket.on("disconnect", () => {
                // when user disconnects, we send the prepared transcript
                sendTranscript(users[socket.id], socket.id);

                socket.broadcast.to(room).emit("bye", socket.id);
                // console.log('before: ' + Object.keys(users).length)
                delete users[socket.id];
                // console.log('after: ' + Object.keys(users).length)
            });
        } catch (e) {
            console.log('Inside handle_connection(error): ' + e);
        }
    });
}

/**
 * @param {Socket} socket
 * @param {string} room
 */
function setupRealtimeTranscription(socket, room) {
    /** The sampleRate must match what the client uses. */
    // const sampleRate = 16000;

    const deepgram = new Deepgram(DG_KEY);

    const dgSocket = deepgram.transcription.live({
        punctuate: true,
        interim_results: false,
        language: 'en-IN'
    });

    dgSocket.addListener("open", () => socket.emit("can-open-mic"));

    /**
     * We forward the audio stream from the client's microphone to Deepgram's server.
     */
    socket.on("microphone-stream", (stream) => {
        if (dgSocket.getReadyState() === WebSocket.OPEN) {
            dgSocket.send(stream);
        }
    });

    /** On Deepgram's server message, we forward the response back to all the
     * clients in the room.
     */
    //CHANGES
    dgSocket.addListener("transcriptReceived", async (transcription) => {
        let speech_to_text = JSON.parse(transcription)['channel']['alternatives'][0]['transcript'];
        console.log(speech_to_text);
        const user_name = users[socket.id]['user_name'];
        const tDate = (new Date()).toLocaleTimeString(undefined, { timeZone: 'Asia/Kolkata' });
        const final_transcript = `[${tDate}] ${user_name}: ${speech_to_text}\n`;

        // forming the json type object to convert it into a spreadsheet(EXCEL HANDLING)
        let dict = {};
        dict[user_name] = speech_to_text;
        let old_json = globalJSON[tDate];
        globalJSON[tDate] = Object.assign({}, old_json, dict);

        // forming the arr of objects



        try {
            if (speech_to_text.length > 0) {
                fs.appendFile('mytranscript.txt', final_transcript, (err) => {
                    if (err) throw err;
                })
            }
        } catch (e) {
            console.log('Error Writing to file');
        }
    });

    /** We close the dsSocket when the client disconnects. */
    socket.on("disconnect", () => {
        if (dgSocket.getReadyState() === WebSocket.OPEN) {
            dgSocket.finish();
        }
    });
}

/**
 * Handle the WebRTC "signaling". This means we forward all the needed data from
 * Alice to Bob to establish a peer-to-peer connection. Once the peer-to-peer
 * connection is established, the video stream won't go through the server.
 *
 * @param {Socket} socket
 */
function setupWebRTCSignaling(socket) {
    socket.on("ice-candidate", (id, message) => {
        socket.to(id).emit("ice-candidate", socket.id, message);
    });
}

server.listen(process.env.PORT, () =>

    console.log(`Server is running on port ${process.env.PORT}`)

);



//setting up nodemailer
function sendTranscript(user_data, socketid) {

    const _path = path.join(__dirname, "mytranscript.txt");
    console.log(_path);
    const tempFileName = createIndividualFileToSend(_path, user_data, socketid);

    createGlobalExcel(globalJSON);

    mailer(user_data['user_email'],user_data['user_name'], tempFileName, users);

}