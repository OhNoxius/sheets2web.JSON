//DON'T TOUCH
let linkMap = new Map();
let fixedtable, dfixedtable, jqfixedtable;
let fixedfooter_row;

let jason;
let SHEETS, MAINSHEET, LINKSHEET;
let MAINSHEET_keys = [], LINKSHEET_keys = []
let LINKSHEET_types = new Set();

const urldetect = ["www.", "://"];
const delims = /([:\r\n]+)|((?<!\s)\()/g///([:+\r\n]+)|((?<!\s)\()/g

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
            if (headertitle) heading_a.innerText = headertitle;
            else heading_a.innerText = datafile;
            heading_a.setAttribute("href", "");
            heading_a.setAttribute("class", "heading");
            heading.append(heading_a);
            document.getElementById("heading").append(heading);
            //NAV
            navfooter = createNavFooter(SHEETS);
            //Table Footer
            fixedfooter_row = document.createElement("tr");
            fixedfooter_row.setAttribute('id', "fixedfooterrow");
            const th = document.createElement("th");
            th.setAttribute('id', "LOOKAHERE");
            th.append(navfooter);
            fixedfooter_row.append(th);
            document.getElementById("fixedtfooter").append(fixedfooter_row);

            const url = window.location.href.substr(window.location.href.indexOf("#") + 1);
            if (window.location.href.indexOf("#") > 0) dfixedtable = makeDataTable(fixedtable, jason[url], url);
            else dfixedtable = makeDataTable(fixedtable, jason[MAINSHEET], MAINSHEET);
        }
    });
});

function makeDataTable(table, jsondata, sheet) {

    const maintableKeys = Object.keys(jsondata[0]);
    const maintable = sheet;

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

    let linktable_types = new Set();
    jason[linktable].forEach(x => linktable_types.add(x[typeheader]));
    linktable_types.delete(null);
    linktable_types.delete(undefined);

    //prepare HTML
    const header_row = document.createElement("tr");
    table.getElementsByTagName("thead")[0].append(header_row);
    const footer_row = document.createElement("tr");
    table.getElementsByTagName("tfoot")[0].prepend(footer_row);

    //FORMAT JSON DATA for use in DataTables
    let startIndex = 0, visIndex = 0;;
    //EXTRA: linkcolumn
    if (linktable) {
        DTcolumn = {
            "title": linktable,
            "className": 'linkcolumn',
            "orderable": false,
            "defaultContent": '',
            "data": null
        };
        header_row.prepend(document.createElement("th"));
        columns.push(DTcolumn);//columns.unshift(DTcolumn);
        startIndex += 1;
        visIndex += 1;
    }
    maintableKeys.forEach(function (key, index, arr) {
        //1. datatables column element
        let keyname = key.replace(/\./g, '\\\\.');
        //if (Array.isArray(jsondata[0][key])) keyname += "[; ]"; //BREAKS .render for arrays !!
        //BASIC TEMPLATE
        DTcolumn = {
            //"title": el,
            "data": keyname,
            "defaultContent": ''
        };
        //create <span> only in columns which have separte sheet
        if (SHEETS.includes(key)) {
            //createdCell
            DTcolumn.createdCell = function (td, cellData, rowData, rowIndex, colIndex) {
                $(td).find('span.linktip').tooltipster({
                    functionBefore: function (instance, helper) {
                        const textContent = helper.origin.textContent;
                        const firstkey = Object.keys(jason[key][0])[0];
                        const query = jason[key].filter(x => x[firstkey] == textContent);
                        if (query.length > 0) instance.content(formatTooltip(query[0]));
                    },
                    interactive: true
                });
            };
            //render
            if (Array.isArray(jsondata[0][key])) {
                DTcolumn.render = function (data, type, row, meta) {
                    let result = "";
                    let i = 0, len = data.length;
                    //SPLIT UP MORE? ":" and "\n" and brackets without space...
                    while (i < len) {
                        result += '<span class="linktip">' + data[i] + '</span>' + "; ";
                        i++;
                    }
                    return result
                }
            }
            else DTcolumn.render = function (data, type, row, meta) {
                if (data) return '<span class="linktip">' + data + '</span>';
            }
        }
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
                    //$(cell).tooltipster();
                };
                DTcolumn.cellIndex = startIndex + index;
                visIndex += 1;
            }
        }
        //merger columns
        else if (key.startsWith(".") || key.startsWith("-")) {
            DTcolumn.className = "merger";
            DTcolumn.visible = false;
            const maincolumn = columns[columns.length - 1];
            const merger = { "indexVis": maincolumn.cellIndex, "con": maincolumn.data, "cat": key, "type": key[0] };
            mergecolumns.push(merger);
        }
        //namespace column
        else if (arr.includes(key.substr(0, key.indexOf(":")))) {
            const maincolumn = columns.find(x => x.data == key.substr(0, key.indexOf(":")));
            DTcolumn.className = "namespace";
            DTcolumn.visible = false;
            const merger = { "indexVis": maincolumn.cellIndex, "con": maincolumn.data, "cat": key, "type": "namespace" };
            mergecolumns.push(merger);
        }
        //child rows
        else if (key.startsWith("CE_")) {
            DTcolumn.className = "childrow";
            DTcolumn.visible = false;
            childRowsHeaders.push(key);
        }
        else {
            DTcolumn.cellIndex = startIndex + index;
            visIndex += 1;
        }
        columns.push(DTcolumn);

        //2. HTML
        const th = document.createElement("th");
        th.append(document.createTextNode(key));
        header_row.append(th);
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

    //console.log(columns);
    if (visIndex > 8) fixedtable.classList.add("compact");

    //DATATABLE    
    const dTable = $(table).DataTable({
        "data": jsondata,
        "fixedHeader": fixedHeader,
        "processing": true,
        "paging": false,
        //"autoWidth": false,
        "order": order,
        "orderCellsTop": true,
        "deferRender": true,
        "columns": columns,
        "createdRow": function (row, data, dataIndex, cells) {
            let linkedItems = [];

            //CONCAT COLUMNS
            mergecolumns.forEach(function (mergecolumn, i) {
                if (data[mergecolumn.cat]) {
                    const mergeDOM = document.createElement("p");
                    mergeDOM.classList.add("subdetails");

                    if (["www.", "://"].some(v => data[mergecolumn.cat].toString().includes(v))) mergeDOM.innerHTML = createShortHyperlinks(data[mergecolumn.cat]);
                    else mergeDOM.innerText = data[mergecolumn.cat];
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
                if (linkedItems.length > 0) {
                    if (linktable_types.size > 0) {
                        const cell = row.getElementsByClassName("linkcolumn")[0];
                        let innerhtml = "";
                        linktable_types.forEach(type => {
                            const filteredtype = linkedItems.filter(l => l[typeheader] == type);
                            if (filteredtype.length > 0) innerhtml += '<div class="nowrap typeicon ' + type + '">' + type + ':<span class="cssnumbers">' + filteredtype.length + '</span></div>';
                        });
                        cell.innerHTML = innerhtml;
                    }
                    else $(row).children("td.linkcolumn").text(linkedItems.length);
                }
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

                        if (linktable_types.size == 0) linktable_types.add("");
                        //console.log(linktable_types);
                        linktable_types.forEach(function (value, index, array) {
                            $('<div class="nowrap"><input type="checkbox" id="' + jqth.innerText + value + '" name="' + jqth.innerText + '" value="' + value + '" class="headercheckbox" />' +
                                '<label for="' + jqth.innerText + value + '">' + value + '</label></div>')
                                .appendTo(jqthisfilter);
                        });
                        jqthisfilter.find('input:checkbox').on('change', function (e) {
                            //build a regex filter string with an or(|) condition
                            let checkboxes = jqthisfilter.find('input:checkbox:checked').map(function () {
                                return this.value;
                            }).get().join('|');
                            //filter in column 1, with an regex, no smart filtering, not case sensitive
                            column.search(checkboxes, true, false, false).draw(false);
                        });
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

                        const DTcolumnArray = column.data().unique().toArray();
                        //console.log(DTcolumnArray);
                        let ARR;
                        if (Array.isArray(DTcolumnArray[0])) ARR = DTcolumnArray.flat().sort();
                        else ARR = DTcolumnArray.sort();

                        //* ONLY WHEN DATA IS NOT FULLY SPLIT inside json *//
                        ARR = ARR.join(delimiter).replace(delims, delimiter).split(delimiter);
                        let SET = new Set();
                        ARR.forEach((o, i, a) => SET.add(a[i].trim()));
                        ARR = [...SET].sort();
                        //* ONLY WHEN DATA IS NOT FULLY SPLIT inside json *//

                        //OPTION 1: HTML5 datalists
                        let datalist = $('<datalist id="' + jqth.innerText + '-list"></datalist>').insertAfter($(input));
                        ARR.forEach(function (val) {
                            datalist.append('<option value="' + val + '" />')
                        });
                    }
                });
            }
        }
    });

    dTable.on('draw', function () {
        console.log('redraw occurred at: ' + new Date().getTime());
        $(table).find(".tooltipstered").tooltipster('enable');
    });
    // dTable.on('destroy', function () {
    //     console.log('destroy occurred at: ' + new Date().getTime());
    //     //table = document.getElementById(tableid);
    //     //createTooltips(table);
    // });

    return dTable;
}

function formatChildRows(h, d) {
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
    const cellval = content;
    const secondslash = cellval.indexOf('/', cellval.indexOf('/') + 1);
    const thirdslash = cellval.indexOf('/', secondslash + 1);
    if (cellval.slice(secondslash + 1, secondslash + 4) == 'www') shortURL = cellval.slice(secondslash + 5, thirdslash);
    else shortURL = cellval.slice(secondslash + 1, thirdslash);
    return "<a title='" + cellval + "' class='tableLink' href='" + cellval + "' target='_blank'>" + shortURL + "</a>"
}