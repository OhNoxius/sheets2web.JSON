//DON'T TOUCH
let linkMap = new Map();
let fixedtable, dfixedtable, jqfixedtable;
let fixedfooter_row;

let jason;
let SHEETS, MAINSHEET, LINKSHEET;
let MAINSHEET_keys = [], LINKSHEET_keys = [];

const delims = /([:+\r\n]+)|((?<!\s)\()/g

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
            const heading = document.createElement("h1");
            const heading_a = document.createElement("a");
            if (headerTitle) heading_a.innerText = headerTitle;
            else heading_a.innerText = datafile;
            heading_a.setAttribute("href", "");
            heading_a.setAttribute("class", "heading");
            heading.append(heading_a);
            document.getElementById("heading").append(heading);
            //NAV
            navfooter = createNavFooter(SHEETS);
            //document.getElementById("fixedtfooter").append(navfooter);
            //Table Footer
            fixedfooter_row = document.createElement("tr");
            fixedfooter_row.setAttribute('id', "fixedfooterrow");
            const th = document.createElement("th");
            th.setAttribute('id', "LOOKAHERE");
            //th.setAttribute('colspan', columns.length);
            //const thtext = document.createTextNode("filter");
            //th.append(thtext);
            th.append(navfooter);
            fixedfooter_row.append(th);
            document.getElementById("fixedtfooter").append(fixedfooter_row);

            const url = window.location.href.substr(window.location.href.indexOf("#") + 1);
            if (window.location.href.indexOf("#") > 0) {
                dfixedtable = makeDataTable(fixedtable, jason[url], url);
            }
            else {
                dfixedtable = makeDataTable(fixedtable, jason[MAINSHEET], MAINSHEET);
            }
        }
    });
});

function makeDataTable(table, jsondata, sheet) {

    const maintableKeys = Object.keys(jsondata[0]);
    const maintable = sheet;
    //const childRowsIndexMap = new Array(maintableKeys.length);
    //childRowsIndexMap.fill(0);

    let DTcolumn;
    let columns = [], childRowsHeaders = [], mergecolumns = [];
    let linktable;

    //detect mode
    if (sheet == LINKSHEET) linktable = MAINSHEET;
    else if (sheet == MAINSHEET) linktable = LINKSHEET;
    else if (MAINSHEET_keys.includes(sheet)) linktable = MAINSHEET;
    else if (LINKSHEET_keys.includes(sheet)) linktable = LINKSHEET;

    //LOG    
    console.log("create new DataTable from table#id = '" + table.getAttribute("id") + "'");

    //prepare HTML
    const header_row = document.createElement("tr");
    table.getElementsByTagName("thead")[0].append(header_row);
    const footer_row = document.createElement("tr");
    table.getElementsByTagName("tfoot")[0].prepend(footer_row);

    //FORMAT JSON DATA for use in DataTables
    let startIndex = 0;
    //EXTRA: linkcolumn
    if (linktable) {
        DTcolumn = {
            "title": linktable,
            "className": 'linkcolumn',
            "orderable": false,
            "DTcolumn.data": null,
            "defaultContent": ''
        };
        header_row.prepend(document.createElement("th"));
        columns.push(DTcolumn);//columns.unshift(DTcolumn);
        startIndex += 1;
    }
    maintableKeys.forEach(function (key, index, arr) {
        //1. datatables column element
        const keyname = key.replace(/\./g, '\\\\.');
        //BASIC TEMPLATE
        DTcolumn = {
            //"title": el,
            "data": key, // still doesn't work, should work...
            "visible": true,
            "createdCell": function (td, cellData, rowData, rowIndex, colIndex) {
                $(td).find('.linktip').tooltipster({
                    functionBefore: function (instance, helper) {
                        const el = helper.origin;
                        const $origin = $(helper.origin);
                        // we set a variable so the data is only loaded once via Ajax, not every time the tooltip opens
                        if ($origin.data('loaded') !== true) {
                            const query = jason[key]?.filter(x => x[Object.keys(jason[key][0])[0]] == el.textContent);
                            if (query) {
                                instance.content(formatTooltip(query[0]));
                            }
                            $origin.data('loaded', true); //maybe makes the tooltips not work after searching and ordering?
                        }
                    },
                    interactive: true
                });
            }
        };
        if (Array.isArray(jsondata[0][key])) {
            DTcolumn.render = function (data, type, row, meta) {
                if (data) {
                    let result = "";
                    let i = 0, len = data.length;
                    while (i < len) {
                        //SPLIT UP MORE? ":" and "\n" and brackets without space...
                        result += '<span class="linktip">' + data[i] + '</span>' + "; "; //title="' + jason[key]?.filter(x => x[Object.keys(jason[key][0])[0]] == data[i]) + '"
                        i++
                    }
                    return result;
                }
                else return "";
            }
        }
        else DTcolumn.render = function (data, type, row, meta) {
            if (data) return '<span class="linktip">' + data + '</span>'; //title="' + jason[key]?.filter(x => x[Object.keys(jason[key][0])[0]] == data) + '"
            else return "";
        };
        //1st element					
        if (Object.is(0, index)) { //remove linkcolumn
            if (maintable == LINKSHEET) {
                columns[columns.length - 1].title = "";
                columns[columns.length - 1].className = "IDcolumn";
                columns[columns.length - 1].data = null;
                columns[columns.length - 1].orderable = false;
            }
            else { //separate ID column
                DTcolumn.title = "";
                DTcolumn.className = "IDcolumn";
                DTcolumn.defaultContent = '';
                DTcolumn.render = function (data, type, row, meta) {
                    return null;
                };
                DTcolumn.createdCell = function (cell, cellData, rowData, rowIndex, colIndex) {
                    cell.setAttribute("title", cellData);
                    $(cell).tooltipster();
                };
                DTcolumn.cellIndex = startIndex + index;
            }
        }
        //merger columns
        else if (key.startsWith(".") || key.startsWith("-")) {
            DTcolumn.className = "merger";
            DTcolumn.visible = false;
            const maincolumn = columns[columns.length - 1];
            // columns[columns.length - 1].data = null;
            // columns[columns.length - 1].render = {
            //     "_": prevkey,
            //     "display": function (data, type, row) {
            //         return data[prevkey] + ' (' + data[keyname] + ')';
            //     },
            //     "filter": prevkey
            // };
            const merger = { "indexVis": maincolumn.cellIndex, "con": maincolumn.data, "cat": key };
            mergecolumns.push(merger);
        }
        //namespace column
        else if (arr.includes(key.substr(0, key.indexOf(":")))) {
            const maincolumn = columns.find(x => x.data == key.substr(0, key.indexOf(":")));
            DTcolumn.className = "namespace";
            DTcolumn.visible = false;
            const merger = { "indexVis": maincolumn.cellIndex, "con": maincolumn.data, "cat": key };
            mergecolumns.push(merger);
        }
        //child rows
        else if (key.startsWith("CE_")) {
            DTcolumn.className = "childrow";
            DTcolumn.visible = false;
            childRowsHeaders.push(key);
        }
        else DTcolumn.cellIndex = startIndex + index;
        columns.push(DTcolumn);

        //2. HTML
        const th = document.createElement("th");
        header_row.append(th);
        th.append(document.createTextNode(key));
    });

    let fixedHeader, dom, order;
    if (maintable == LINKSHEET) order = [[startIndex + LINKSHEET_keys.indexOf(MAINSHEET), 'asc']];
    else order = [[startIndex + 1, 'asc']];

    //set some DT options    
    if (table.getAttribute("id") == "fixedtable") {
        fixedHeader = {
            header: true,
            footer: true
        };
        dom = "lfrti";
        const headerfilters_row = header_row.cloneNode(true);
        headerfilters_row.setAttribute("class", "columnfilters");
        table.getElementsByTagName("thead")[0].append(headerfilters_row);
        document.getElementById("LOOKAHERE").setAttribute("colspan", columns.length);
    }
    else {
        fixedHeader = false;
        dom = "lft";
    }

    console.log(columns);

    //DATATABLE    
    const dTable = $(table).DataTable({
        "data": jsondata,
        "fixedHeader": fixedHeader,
        "processing": true,
        "paging": false,
        //"autoWidth": false,
        "order": order,
        "orderCellsTop": true,
        //"order-column": true,
        //"orderClasses": false,
        "deferRender": true,
        "columns": columns,
        "createdRow": function (row, data, dataIndex, cells) {
            let linkedItems = [];

            //CONCAT COLUMNS
            mergecolumns.forEach(function (mergecolumn, i) {
                if (data[mergecolumn.cat]) {
                    const mergeDOM = document.createElement("p");
                    mergeDOM.classList.add("subdetails");
                    mergeDOM.innerText = data[mergecolumn.cat];
                    cells[mergecolumn.indexVis].append(mergeDOM);
                }
            });

            //html attributes
            //ROW
            const rowid = maintable.replace(/\s+/g, '') + ":" + dataIndex;
            row.setAttribute("id", rowid);
            //FILL IN SOME LINK VALUES
            if (maintable == LINKSHEET) {
                row.setAttribute("summary", data[MAINSHEET] + LINKSHEET);
                linkedItems = jason[MAINSHEET].filter(x => data[MAINSHEET]?.split("\n").includes(x[MAINSHEET_keys[0]]));
            }
            else {
                row.setAttribute("summary", data[maintableKeys[0]]);
                linkedItems = jason[linktable].filter(x => x[maintable]?.includes(data[maintableKeys[0]]));
            }

            const childrowsVis = childRowsHeaders.reduce((acc, value, index, array) => acc + data[value]?.length, "");

            if (childrowsVis > 0 || linkedItems.length > 0) {
                $(row).children("td.IDcolumn").addClass('details-control');
                if (linkedItems.length > 0) $(row).children("td.linkcolumn").text(linkedItems.length);
                $(row).children("td.IDcolumn").on('click', function () {
                    const jqtr = $(this).closest('tr');
                    const dRow = dTable.row(jqtr);
                    console.log(" (+) --> CLICK DROPDOWN maintable: '" + maintable + "' / linktable: '" + linktable + "' / id: '" + jqtr.attr("id") + "'");

                    if (dRow.child.isShown()) {
                        // This row is already open - close it
                        dRow.child.hide();
                        jqtr.removeClass('shown');
                    }
                    else {
                        // Open this row
                        let linkTableDOM = "", childrowsDOM = "";
                        if (childrowsVis > 0) {
                            let details = "", childrowTable = "";
                            childRowsHeaders.forEach(x => details += formatChildRows(x, data[x]));
                            if (details != "") childrowTable = '<table class="childrowtable">' + details + '</table>';
                            childrowsDOM = document.createElement('div');
                            childrowsDOM.innerHTML = childrowTable;
                        }
                        if (linkedItems.length > 0) {
                            linkTableDOM = document.createElement('div');
                            linkTableDOM.innerHTML = '<table id="' + rowid + "." + linktable + '" class="linktable">' +
                                '<thead></thead>' +
                                '<tbody></tbody>' +
                                '<tfoot></tfoot>' +
                                '</table>';
                        }
                        dRow.child([linkTableDOM, childrowsDOM], "child").show();
                        makeDataTable(jqtr.next('tr').find('table.linktable')[0], linkedItems, linktable);
                        jqtr.addClass('shown');
                    }
                });
            }
        },
        "initComplete": function () {
            //FIXED TOOLTIPS on ID column            

            //create tooltips
            //createTooltips(table);

            if (table.getAttribute("id") == "fixedtable") {
                //COLUMN FILTERS
                this.api().columns(':visible').every(function () {
                    const column = this;
                    const jqth = column.header();
                    const jqthisfilter = $(table).find('thead > tr.columnfilters > th').eq(column.index('visible'));

                    jqthisfilter.empty();
                    if (jqth.classList.contains("IDcolumn")) {
                        //$("table.mainsheet thead tr:eq(1) th").eq(column.index()).empty();
                    }
                    else if (jqth.classList.contains("linkcolumn")) {
                        // linkedsheetTypes.forEach(function (value, index, array) {
                        //     $('<div class="nowrap"><input type="checkbox" id="' + jqth.innerText + value + '" name="' + jqth.innerText + '" value="' + value + '" class="headercheckbox" />' +
                        //         '<label for="' + jqth.innerText + value + '">' + value + '</label></div>')
                        //         .appendTo(jqthisfilter);
                        // });
                        // $('input:checkbox').on('change', function (e) {
                        //     //build a regex filter string with an or(|) condition
                        //     let checkboxes = $('input:checkbox:checked').map(function () {
                        //         return this.value;
                        //     }).get().join('|');
                        //     //filter in column 1, with an regex, no smart filtering, not case sensitive
                        //     column.search(checkboxes, true, false, false).draw(false);
                        // });
                        // dropdowns.set(column.index(), linkedsheetTypes);
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
        }
    });

    return dTable;
}

function formatChildRows(h, d) {
    // `d` is the original data object for the row
    if (d) {
        return '<tr class="detailsRow">' +
            '<td class="detailsHeader">' + h.substr(3) + ':</td>' +
            '<td>' + d + '</td>' +
            '</tr>'
    }
    else return ''
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
        if (sheet == LINKSHEET || MAINSHEET_keys.includes(sheet) || LINKSHEET_keys.includes(sheet)) {
            const tab_li = document.createElement("li");
            tab_li.setAttribute("class", "menu tab");
            tabs_ul.append(tab_li);
            const tab_a = document.createElement("a");
            tab_a.setAttribute("id", "btn-" + sheet);
            tab_a.setAttribute("class", "menu tab");
            tab_a.setAttribute("href", "#" + sheet);
            tab_a.setAttribute("sheet", sheet);
            tab_a.addEventListener('click', function () {
                $(this).addClass('active');
                $(this).siblings().removeClass('active');

                if ($.fn.dataTable.isDataTable(fixedtable)) {
                    dfixedtable.clear();
                    dfixedtable.destroy();
                }

                document.getElementById("fixedtheader").innerHTML = "";
                document.getElementById("fixedtbody").innerHTML = "";
                document.getElementById("fixedtfooter").querySelectorAll("tr:not(#fixedfooterrow)").forEach(tr => tr.remove());

                dfixedtable = makeDataTable(fixedtable, jason[sheet], sheet);
            }, false);
            if (sheet == MAINSHEET || sheet == LINKSHEET) tab_a.innerText = sheet;
            else if (MAINSHEET_keys.includes(sheet)) tab_a.innerText = MAINSHEET + ":" + sheet;
            else if (LINKSHEET_keys.includes(sheet)) tab_a.innerText = LINKSHEET + ":" + sheet;
        
            tab_li.append(tab_a);
        }
    });
    navfooter.append(tabs_ul);
    return navfooter;
}

function formatTooltip(object) {
    let result = [];
    // for (let entry of Object.entries(object)) {
    //     if (entry[1]) result.push($("<li style='list-style-type:none;'><span class='inlinedetails'>" + entry[0] + ": </span>" + createHyperlinks(entry[1]) + "</li>"));
    // }
    //option 1
    // Object.getOwnPropertyNames(object).forEach(key => {
    //     if (object[key]) result.push($("<li style='list-style-type:none;'><span class='inlinedetails'>" + key + ": </span>" + createHyperlinks(object[key]) + "</li>"));
    // });
    // return result.slice(1);
    //option 2
    const props = Object.getOwnPropertyNames(object);
    for (let i = 1; i < props.length; i++) {
        if (object[props[i]]) result.push($("<li style='list-style-type:none;'><span class='inlinedetails'>" + props[i] + ": </span>" + createHyperlinks(object[props[i]].toString()) + "</li>"));
    }
    return result;
}
const exp_match = /(\b(https?|):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig; //find https?
function createHyperlinks(content) {
    // OPTION2: SLIM ALTERNATIEF, mr voorlopig nog volledig url weergave, en $ teken loopt mis    
    let element_content = content.replace(exp_match, "<a class='url' target='_blank' title='$1' href='$1'>$1</a>");
    let new_exp_match = /(^|[^\/])(www\.[\S]+(\b|$))/gim; //find www?
    let new_content = element_content.replace(new_exp_match, '$1<a class="url" title="http://$2" target="_blank" href="http://$2">$2</a>');
    return new_content;
}

function createShortHyperlinks(content) {
    // OPTION 1
    let secondslash, thirdslash, shortURL;
    //cellval = $(this).text(); //MOET ENKEL TEKST TOT EINDE LIJN ZIJN
    cellval = content;
    secondslash = cellval.indexOf('/', cellval.indexOf('/') + 1);
    thirdslash = cellval.indexOf('/', secondslash + 1);
    if (cellval.slice(secondslash + 1, secondslash + 4) == 'www') shortURL = cellval.slice(secondslash + 5, thirdslash);
    else shortURL = cellval.slice(secondslash + 1, thirdslash);
    return "<a title='" + cellval + "' class='tableLink' href='" + cellval + "' target='_blank'>" + shortURL + "</a>"
}