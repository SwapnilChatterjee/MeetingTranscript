const nodemailer = require('nodemailer')
const fs = require("fs");
const path = require("path")
require('dotenv').config()
const mailer = (receiverEmail, userName, tempFileName, users, room) =>{
    var transporter = nodemailer.createTransport({
        service : "hotmail",
        auth : {
            user : process.env.EMAILID,
            pass : process.env.PASSWORD
        }
    });
    //setting up mailoptions
    let mailoptions = {
        from: `${process.env.EMAILID}`,
        to: `${receiverEmail}`,
        subject: 'TRANSCRIPT OF THE MEETING ',
        attachments: [
            {
                filename: 'transcript.txt',
                path: path.join(__dirname,"..",tempFileName)
            },
            {
                filename: 'transcript.xlsx',
                path: path.join(__dirname,"..","transcript.xlsx")
            }
        ],
        text: `Hello ${userName}, here is your auto-generated minutes of the meeting attached below.`
    }
    // console.log('4')

    //sending email
    transporter.sendMail(mailoptions, function (err, data) {
        if (err) {
            console.log('ERROR OCCURED', err);
            delete mailoptions['attachments'];
            transporter.sendMail(mailoptions, function (err, data) {
                if (err) {
                    console.log('ERROR OCCURED', err);
                } else {
                    console.log('Sent empty data');
                }
            });
        }
        else {
            console.log(`SUCCESSFULL, email sent to ${userName} at ${receiverEmail}`);

            // after-work: remove file contents
            // now delete the file of that respective user who left the chat
            try {

                // console.log('5')
                fs.unlink(path.join(__dirname,"..",tempFileName), (err) => {
                    if (err) throw err;
                    console.log(`${tempFileName} was deleted`);
                });
                fs.unlink(path.join(__dirname,"..","transcript.xlsx"), (err) => {
                    if (err) throw err;
                    console.log(`transcript.xlsx was deleted`);
                })
                // console.log('6')
            } catch (e) {
                console.log(`Error deleting file ${tempFileName} or transcript.xlsx`);
            }


            if (Object.keys(users).length === 0) {
                // all users left room, remove the content from global file
                try {

                    fs.unlink(path.join(__dirname,"..",`${room}.txt`), (err) => {
                        if (err) throw err;
                        console.log(`${room}.txt was deleted`);
                    });
                } catch (e) {
                    console.log(`Error deleting file ${room}.txt`);
                }
            }
        }
    });


}

module.exports = mailer;


