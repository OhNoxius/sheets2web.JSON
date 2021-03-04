//use cashing to fetch files?
let cashing = false;
//DON'T TOUCH
let linkMap = new Map();
let fixedtable, dfixedtable, jqfixedtable;

let jason;
let SHEETS, MAINSHEET, LINKSHEET;
let MAINSHEET_keys = [], LINKSHEET_keys = [];
//let fixedheader_row, fixedfooter_row, fixedheaderfilters_row;

document.addEventListener('DOMContentLoaded', function () {
    mockjax(datafile);
    fixedtable = document.getElementById("fixedtable");
    jqfixedtable = $(fixedtable);
    $.ajax({
        dataType: "json",
        url: "/json/data",
        success: function (data) {
            console.log("asynchronous HTTP (mockjax) request DONE");
            jason = data;

            //PROCESS JSON
            //1. identify important nodes
            SHEETS = Object.keys(jason);
            MAINSHEET = SHEETS[0];
            LINKSHEET = SHEETS.find(e => e.startsWith("+"));
            MAINSHEET_keys = Object.keys(jason[MAINSHEET][0]);
            LINKSHEET_keys = Object.keys(jason[LINKSHEET][0]);

            //3. main webpage layout
            //HEADING
            let heading = document.createElement("h1");
            if (headerTitle) heading.innerText = headerTitle;
            else heading.innerText = datafile;
            document.getElementById("heading").append(heading);
            //NAV
            navfooter = createNavFooter(SHEETS);
            document.getElementById("fixedtfooter").append(navfooter);

            dfixedtable = makeDataTable(fixedtable, jason[MAINSHEET], MAINSHEET);
        }
    });
});

function makeDataTable(table, jsondata, sheet) {

    const jasonKeys = Object.keys(jsondata[0]);
    const maintable = sheet;

    let jqtable, dTable;

    let DTCol;
    let chilrowVis = [];
    let columns = [], childRowsIndexes = [], childRowsHeaders = [];
    let linktable;

    //detect mode

    if (sheet == LINKSHEET) linktable = MAINSHEET;
    else if (sheet == MAINSHEET) linktable = LINKSHEET;
    else if (MAINSHEET_keys.includes(sheet)) linktable = MAINSHEET;
    else if (LINKSHEET_keys.includes(sheet)) linktable = LINKSHEET;

    //LOG    
    console.log("!!!!NEW DT!!!!");
    //console.log(table);
    console.log("maintable: '" + maintable + "'");
    console.log("linktable: '" + linktable + "'");

    //prepare HTML
    const header_row = document.createElement("tr");
    table.getElementsByTagName("thead")[0].append(header_row);
    const headerfilters_row = document.createElement("tr");
    headerfilters_row.setAttribute("class", "columnfilters");
    table.getElementsByTagName("thead")[0].append(headerfilters_row);
    const footer_row = document.createElement("tr");
    table.getElementsByTagName("tfoot")[0].append(footer_row);

    //FORMAT JSON DATA for use in DataTables					
    jasonKeys.forEach(function (key, index, arr) {

        //1. datatables column element
        //console.log( el.replace(/\./g, '\\\\.'));
        let keyname = key;
        if (Array.isArray(jsondata[0][key])) keyname += "[; ]";
        DTCol = {
            //"title": el,
            "data": keyname.replace(/\./g, '\\\\.'), // still doesn't work, should work...
            "visible": false
        };

        //First element: id	(NOT ALWAYS?)					
        if (Object.is(0, index)) {
            DTCol.class = "id";
            chilrowVis.push(0);
        }
        //merger columns
        else if (key.startsWith(".") || key.startsWith("-")) {
            DTCol.class = "merger";
            chilrowVis.push(0);
        }
        //child rows
        else if (key.startsWith("CE_")) {
            DTCol.class = "childrow";
            childRowsIndexes.push(index);
            childRowsHeaders.push(key.substring(3));
            chilrowVis.push(1);
        }
        //normal column
        else {
            DTCol.visible = true;
            chilrowVis.push(0);
        }
        columns.push(DTCol);

        //2. HTML
        const th = document.createElement("th");
        header_row.append(th);
        headerfilters_row.append(th.cloneNode(false));
        th.append(document.createTextNode(key));
    });

    // (?) dropdown childrow column
    if (childRowsIndexes.length > 0) {
        DTCol = {
            "className": 'DTdetails',
            "orderable": false,
            "data": null,
            "defaultContent": ''
        };
        const th = document.createElement("th");
        header_row.prepend(th);
        headerfilters_row.prepend(th.cloneNode(false));
        columns.unshift(DTCol);
        //chilrowVis.unshift(1);
        childRowsIndexes.forEach(x => x + 1);
    }

    //Table Footer
    let th = document.createElement("th");
    let thtext = document.createTextNode("filter");
    th.setAttribute('colspan', columns.length);
    th.append(thtext);
    footer_row.append(th);
    //columns.shift(); //removes first item

    //set some DT options
    let fixedHeader;
    if (table.getAttribute("id") == "fixedtable") {
        fixedHeader = {
            header: true,
            footer: true
        };
    }
    else {
        fixedHeader = false;
    }
    //DATATABLE
    let childrowsVIS = 0, linkedrowsVIS = 0;
    dTable = $(table).DataTable({
        "data": jsondata,
        "fixedHeader": fixedHeader,
        "paging": false,
        //"autoWidth": false,
        "order": [[2, 'asc']],
        //"orderCellsTop": true,
        //"order-column": true,
        //"orderClasses": false,
        "deferRender": true,
        "columns": columns,
        "createdRow": function (row, data, dataIndex) {
            //colummmn size...
            //$('td:not(:eq(0))', row).css('min-width', '15ex');

            let linkedItems = [];
            const rowid = maintable.replace(/\s+/g, '') + ":" + dataIndex;
            if (maintable == LINKSHEET) {
                row.setAttribute("summary", data[MAINSHEET] + LINKSHEET);
                if (data[MAINSHEET]) linkedItems = jason[MAINSHEET].filter(x => data[MAINSHEET].split("/n").includes(x[MAINSHEET_keys[0]]));
            }
            else {
                row.setAttribute("summary", data[jasonKeys[0]]);
                linkedItems = jason[linktable].filter(x => (x[maintable] == data[jasonKeys[0]]));
            }
            row.setAttribute("id", rowid);
            row.setAttribute("sheet", maintable);
            row.setAttribute("linked", linktable);

            //COUNT CHILD ROWS
            childrowsVIS = jasonKeys.map((x, i) => !!data[x] && chilrowVis[i]).reduce((acc, value, index, array) => acc + value);
            linkedrowsVIS = linkedItems.length;

            if (childrowsVIS + linkedrowsVIS > 0) $(row).children("td.DTdetails").addClass('details-control');
            if (linkedrowsVIS > 0) {
                $(row).children("td.DTdetails").text(linkedrowsVIS);
                $(row).children("td.DTdetails").on('click', function () {
                    console.log("!!!!CLICK DROPDOWN!!!!");
                    let jqtr = $(this).closest('tr');
                    let dRow = dTable.row(jqtr);
                    let thisid = jqtr.attr("id");
                    let thismaintable = jqtr.attr("sheet");
                    let thislinktable = jqtr.attr("linked");

                    let linkedtableID = rowid + "." + thislinktable;

                    let idx, cells, details, childrowTable;
                    let linkTableDOM, childrowsDOM

                    if (dRow.child.isShown()) {
                        // This row is already open - close it
                        dRow.child.hide();
                        jqtr.removeClass('shown');
                    }
                    else {
                        //A.select data (columns) that are hidden
                        idx = childRowsIndexes.map(x => x + 1);
                        cells = dTable.cells(dRow, idx);
                        details = "", childrowTable = "";
                        for (let i = 0; i < cells.data().length; i++) {
                            if (cells.data()[i]) details += formatChildRows(childRowsHeaders[i], cells.data()[i]);
                        }
                        if (details != "") childrowTable = '<table class="childrowtable">' + details + '</table>';

                        childrowsDOM = document.createElement('div');
                        childrowsDOM.innerHTML = childrowTable;

                        console.log("maintable: '" + thismaintable + "' / linktable: '" + thislinktable + "' / id: '" + thisid + "'");

                        linkTableDOM = document.createElement('div');
                        linkTableDOM.innerHTML = '<table id="' + linkedtableID + '" class="linktable">' +
                            '<thead></thead>' +
                            '<tbody></tbody>' +
                            '<tfoot></tfoot>' +
                            '</table>';

                        // Open this row
                        dRow.child(linkTableDOM, "child").show();
                        console.log(jqtr);
                        console.log(jqtr.next('tr').find('table.linktable')[0]);
                        makeDataTable(jqtr.next('tr').find('table.linktable')[0], linkedItems, thislinktable);
                        jqtr.addClass('shown');
                    }
                });
            }
        },
        "initComplete": function () {
            //create tooltips
            //createTooltips(table);

            //COLUMN FILTERS
            this.api().columns(':visible').every(function () {
                let column = this;
                let jqth = column.header();

                let jqthisfilter = $(table).find('thead > tr.columnfilters > th').eq(column.index('visible'));
                if (jqth.classList.contains("DTdetails")) {
                    //$("table.mainsheet thead tr:eq(1) th").eq(column.index()).empty();
                }
                else if (jqth.classList.contains("linkedinfo")) {
                    linkedsheetTypes.forEach(function (value, index, array) {
                        $('<div class="nowrap"><input type="checkbox" id="' + jqth.innerText + value + '" name="' + jqth.innerText + '" value="' + value + '" class="headercheckbox" />' +
                            '<label for="' + jqth.innerText + value + '">' + value + '</label></div>')
                            .appendTo(jqthisfilter);
                    });
                    $('input:checkbox').on('change', function (e) {
                        //build a regex filter string with an or(|) condition
                        let checkboxes = $('input:checkbox:checked').map(function () {
                            return this.value;
                        }).get().join('|');
                        //filter in column 1, with an regex, no smart filtering, not case sensitive
                        column.search(checkboxes, true, false, false).draw(false);
                    });
                    dropdowns.set(column.index(), linkedsheetTypes);
                }
                else {
                    let input = $('<input type="search" size="10" autocomplete="off" list="' + jqth.innerText + '-list" id="' + jqth.innerText + '-input" name="' + jqth.innerText + '" class="headersearch" />'
                    ).appendTo(jqthisfilter)
                        .on('change search', function () {
                            if (column.search() !== this.value) {
                                column
                                    .search(this.value)
                                    .draw('page');
                            }
                        });

                    let ARR = column.data().unique().toArray();
                    const delims = /([:+\r\n]+)|((?<!\s)\()/g
                    let temp = ARR.join(delimiter).replace(delims, ";");
                    ARR = temp.split(delimiter);
                    ARR.forEach((o, i, a) => a[i] = a[i].trim());
                    let SET = new Set(ARR);
                    ARR = [...SET].sort();

                    //OPTION 1: HTML5 datalists
                    //column.data().unique().sort().each(function (d, j) {
                    let datalist = $('<datalist id="' + jqth.innerText + '-list"></datalist>').insertAfter($(input));
                    ARR.forEach(function (val) {
                        datalist.append('<option value="' + val + '" />')
                    });
                    //OPTION 2: jQuery UI autocomplete (see xml code)
                }
            });
        }
    });

    return dTable;
}

function formatChildRows(h, d) {
    // `d` is the original data object for the row
    return '<tr class="detailsRow">' +
        '<td class="detailsHeader">' + h + ':</td>' +
        '<td>' + d + '</td>' +
        '</tr>'
}

function mockjax(datafile) {
    $.mockjax({
        url: "/json/data",
        dataType: "json",
        contentType: "application/json",
        proxy: "/" + datafile,
        onAfterSuccess: function (data) { console.log("mock success"); },
        onAfterError: function (error) { console.log("mock error"); }
    })
}

function createNavFooter(sheets) {
    //NAV
    const navfooter = document.createElement("div");
    navfooter.setAttribute("id", "navfooter");
    const tabs_ul = document.createElement("ul");
    sheets.forEach(function (sheet) {
        const tab_li = document.createElement("li");
        tabs_ul.append(tab_li);
        const tab_a = document.createElement("a");
        tab_a.setAttribute("id", "btn-" + sheet);
        tab_a.setAttribute("class", "menu tab");
        tab_a.setAttribute("href", "#" + sheet);
        tab_a.setAttribute("sheet", sheet);
        tab_a.addEventListener('click', function () {
            console.log(sheet);
            $(this).addClass('active');
            $(this).siblings().removeClass('active');

            dfixedtable.destroy();
            document.getElementById("fixedtheader").innerHTML = "";
            document.getElementById("fixedtbody").innerHTML = "";
            document.getElementById("fixedtfooter").querySelectorAll("tr").forEach(tr => tr.remove());
            makeDataTable(fixedtable, jason[sheet], sheet);
        }, false);
        tab_a.innerText = sheet;
        tab_li.append(tab_a);
    });
    navfooter.append(tabs_ul);
    return navfooter;
}