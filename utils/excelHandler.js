const XLSX = require("xlsx");
const path = require("path")

function createGlobalExcel(globalJSON) {
    try {
        let transARR = []
        for (let key in globalJSON) {
            transARR.push(globalJSON[key]);
        }

        const workSheet = XLSX.utils.json_to_sheet(transARR);
        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, "transcript");
        XLSX.write(workBook, { bookType: "xlsx", type: "buffer" });
        XLSX.write(workBook, { bookType: "xlsx", type: "binary" });
        const _path = path.join(__dirname, "..", "transcript.xlsx");
        XLSX.writeFile(workBook, _path);
    } catch(e) {
        console.log("Error while creating Excel file");
    }
}

module.exports = createGlobalExcel;