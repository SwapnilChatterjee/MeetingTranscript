const fs = require('fs')
const path = require("path");

function createIndividualFileToSend(roomFilePath, user_data, socketId) {
    const tempFileName = `${socketId}.txt`
    try {
        // entire file contents as a string
        console.log(roomFilePath);
        const allFileContents = fs.readFileSync(roomFilePath, 'utf-8');
        // entire file contents line by line with one line in one index of array
        const lineByLineData = allFileContents.split(/\r?\n/);
        // string to be searched
        const toBeChecked = "[" + user_data.joiningtime + "] " + user_data.user_name + " joined."
        // first index of matched value
        // const firstIndex = lineByLineData.indexOf(toBeChecked);
        let firstIndex = -1;
        for (let i = 0; i < lineByLineData.length; i++) {
            if (toBeChecked === lineByLineData[i]) {
                firstIndex = i;
                break;
            }
        }
        // final trimmed data
        const newDataToBeSent = lineByLineData.slice(firstIndex).join('\n');
        // writing the final trimmed data
        const _path = path.join(__dirname, "..", tempFileName);
        fs.writeFileSync(_path, newDataToBeSent, (err) => {
            if (err) throw err;
        });
        return tempFileName;
    } catch (e) {
        console.log('sendTranscript(error)/fileCreation(error): ' + e);
        return "";
    }
}

module.exports = createIndividualFileToSend;