import { utils, writeFile } from "../xlsx.mjs"
import { ahoraEC, dateTimeToKeyDatetimeString } from "./fecha-util.js"

const d = document

export default function exportTableToExcel(vsTable, vsFilename) {
  const $table = d.getElementById(vsTable),
    wb = utils.table_to_book($table, { sheet: "sheet1", raw: true })
  return writeFile(wb, (vsFilename || vsTable) + "_" + dateTimeToKeyDatetimeString(ahoraEC()) + ".xlsx")
  // https://codepedia.info/javascript-export-html-table-data-to-excel
}