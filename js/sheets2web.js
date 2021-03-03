//use cashing to fetch files?
let cashing = false;
//DON'T TOUCH
let linkMap = new Map();
let fixedtable;
let table, dTable, jqtable;

let jason;
let SHEETS, MAINSHEET, LINKSHEET;
let MAINSHEET_keys = [], LINKSHEET_keys = [];
let mainColumns = [], mainChildRowsIndexes = [], mainChildRowsHeaders = [];
let header_row, footer_row, headerfilters_row;
let DTCol;
let chilrowVis = [];
let DOMel;

document.addEventListener('DOMContentLoaded', function () {
    mockjax(datafile);
    fixedtable = document.getElementById("fixedtable");
    jqtable = $(table);
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

            //2. create Map() of mainsheet<->linksheet
            // //first create index from mainsheet					
            // jason[MAINSHEET].forEach(function (el, key, arr) {
            //     linkMap.set(el[MAINSHEET_keys[0]], {});
            // });
            // //then loop through linkedsheet ONCE, and add info into above Map
            // let linkItem;
            // jason[LINKSHEET].forEach(function (el, key, arr) {
            //     if (el[MAINSHEET]) {
            //         el[MAINSHEET].split("\n").forEach(function (linkid) {
            //             linkid = linkid.trim(); //POEH! Google Sheet can have hidden &#xD;
            //             //!!! MAYBE ALSO MAKE UPPERCASE? f.e. Return to Forever vs. Return To Forever ...
            //             if (linkMap.has(linkid)) {
            //                 linkItem = linkMap.get(linkid);
            //                 linkItem[key] = el["type"];
            //             }
            //             else {
            //                 linkMap.set(linkid, {});
            //                 console.log("unknown id " + linkid);
            //             }
            //         });
            //     }
            // });

            //3. main webpage layout
            //HEADING
            let heading = document.createElement("h1");
            if (headerTitle) heading.innerText = headerTitle;
            else heading.innerText = datafile;
            document.getElementById("heading").append(heading);
            //NAV
            //document.getElementsByTagName("nav")[0].append(tabs_ul);
            //document.getElementById("navfooter").append(tabs_ul);
            navfooter = createNavFooter(SHEETS);
            document.getElementById("fixedtfooter").append(navfooter);

            makeDataTable(fixedtable, jason[MAINSHEET], MAINSHEET);
        }
    });
});

function makeDataTable(table, jsondata, sheet) {

    //detect mode
    const maintable = sheet;
    let linktable;
    if (sheet == LINKSHEET) linktable = MAINSHEET;
    else if (sheet == MAINSHEET) linktable = LINKSHEET;
    else if (MAINSHEET_keys.includes(sheet)) {
        linktable = MAINSHEET;
    }
    else if (LINKSHEET_keys.includes(sheet)) {
        linktable = LINKSHEET;
    }

    //LOG    
    console.log("!!!!NEW DT!!!!");
    console.log(table);
    console.log("maintable: '" + maintable + "'");
    console.log("linktable: '" + linktable + "'");

    //prepare HTML
    header_row = document.createElement("tr");
    table.getElementsByTagName("thead")[0].append(header_row);
    headerfilters_row = document.createElement("tr");
    headerfilters_row.setAttribute("class", "columnfilters");
    table.getElementsByTagName("thead")[0].append(headerfilters_row);
    footer_row = document.createElement("tr");
    table.getElementsByTagName("tfoot")[0].append(footer_row);

    //FORMAT JSON DATA for use in DataTables					
    let jasonKeys = Object.keys(jsondata[0]);
    let columns = [], childRowsIndexes = [], childRowsHeaders = [];
    jasonKeys.forEach(function (el, key, arr) {
        //1. datatables column element
        //console.log( el.replace(/\./g, '\\\\.'));
        let keyname = el;
        if (Array.isArray(jsondata[0][el])) keyname += "[; ]";
        DTCol = {
            //"title": el,
            "data": keyname.replace(/\./g, '\\\\.'), // still doesn't work, should work...
            "visible": false
        };
        //2. HTML
        const th = document.createElement("th");
        header_row.append(th);
        headerfilters_row.append(th.cloneNode(true));
        th.append(document.createTextNode(el));

        //First element: id						
        if (Object.is(0, key)) {
            DTCol.class = "id";
            chilrowVis.push(0);
        }
        //merger columns
        else if (el.startsWith(".") || el.startsWith("-")) {
            DTCol.class = "merger";
            chilrowVis.push(0);
        }
        //child rows
        else if (el.startsWith("CE_")) {
            DTCol.class = "childrow";
            childRowsIndexes.push(key);
            childRowsHeaders.push(el.substring(3));
            chilrowVis.push(1);
        }
        //normal column
        else {
            DTCol.visible = true;
            chilrowVis.push(0);
        }
        columns.push(DTCol);
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
        headerfilters_row.prepend(th.cloneNode(true));
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
        //"autoWidth": false,
        "order": [[1, 'asc']],
        "orderCellsTop": true,
        //"order-column": true,
        "orderClasses": false,
        "deferRender": true,
        "columns": columns,
        "paging": false,
        "createdRow": function (row, data, dataIndex) {
            //colummmn size...
            //$('td:not(:eq(0))', row).css('min-width', '15ex');

            let linkedItems = jason[linktable].filter(x => (x[maintable] == data[jasonKeys[0]]));

            /////////////
            //set row ID
            $(row).attr("id", data[jasonKeys[0]]);
            $(row).attr("sheet", maintable);
            $(row).attr("linked", linktable);

            childrowsVIS = jasonKeys.map((x, i) => !!data[x] && chilrowVis[i]).reduce((acc, value, index, array) => acc + value);
            //if (sheet == mainsheet) linkedrows = Object.keys(linkMap.get(data[jasonKeys[0]])).length;
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


                    if (dRow.child.isShown()) {
                        // This row is already open - close it
                        dRow.child.hide();
                        jqtr.removeClass('shown');
                    }
                    else {
                        //A.select data (columns) that are hidden
                        let idx = childRowsIndexes.map(x => x + 1);
                        let cells = dTable.cells(dRow, idx);
                        let details = "", childrowTable = "";
                        for (let i = 0; i < cells.data().length; i++) {
                            if (cells.data()[i]) details += formatChildRows(childRowsHeaders[i], cells.data()[i]);
                        }
                        if (details != "") childrowTable = '<table class="childrowtable">' + details + '</table>';

                        let childrowsDOM = document.createElement('div');
                        childrowsDOM.innerHTML = childrowTable;

                        console.log("maintable: '" + thismaintable + "'");
                        console.log("linktable: '" + thislinktable + "'");
                        console.log("id: '" + thisid + "'");
                        //linkedItems = jason[linktable].filter(x => (x[maintable] == thisid));

                        let linkTableDOM = document.createElement('div');
                        linkTableDOM.innerHTML = '<table id="' + thisid + "|" + thislinktable + '" class="linktable">' +
                            '<thead></thead>' +
                            '<tbody></tbody>' +
                            '<tfoot></tfoot>' +
                            '</table>';

                        // Open this row
                        dRow.child([linkTableDOM, childrowsDOM], "child").show();
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
    let navfooter = document.createElement("div");
    navfooter.setAttribute("id", "navfooter");
    let tabs_ul = document.createElement("ul");
    sheets.forEach(function (sheet) {
        let tab_li = document.createElement("li");
        tabs_ul.append(tab_li);
        let tab_a = document.createElement("a");
        tab_a.setAttribute("id", "btn-" + sheet);
        tab_a.setAttribute("class", "menu tab");
        tab_a.setAttribute("href", "#" + sheet);
        tab_a.setAttribute("sheet", sheet);
        tab_a.addEventListener('click', function () {
            ;
            console.log(sheet);
            $(this).addClass('active');
            $(this).siblings().removeClass('active');

            dTable.destroy();
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