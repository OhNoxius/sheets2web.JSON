//DON'T TOUCH
let linkMap = new Map();
let fixedtable, dfixedtable, jqfixedtable;
let fixedfooter_row;

let jason;
let SHEETS, MAINSHEET, LINKSHEET;
let MAINSHEET_keys = [], LINKSHEET_keys = [];

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
        const th = document.createElement("th");
        header_row.prepend(th);
        columns.push(DTcolumn);//columns.unshift(DTcolumn);
        startIndex += 1;
    }
    maintableKeys.forEach(function (key, index, arr) {
        //1. datatables column element
        let keyname = key.replace(/\./g, '\\\\.');
        if (Array.isArray(jsondata[0][key])) keyname += "[; ]";

        DTcolumn = {
            //"title": el,
            "data": keyname, // still doesn't work, should work...
            "visible": true,
            // "createdCell": function (td, cellData, rowData, rowIndex, colIndex) {
            //     if (rowIndex < 2) console.log(colIndex + ": " + cellData);
            // }
        };
        //First element: id	(NOT ALWAYS?)					
        if (Object.is(0, index) && maintable != LINKSHEET) {
            DTcolumn.title = "";
            DTcolumn.className = "IDcolumn";
            DTcolumn.orderable = false;
            DTcolumn.data = null;
            DTcolumn.defaultContent = '';
            DTcolumn.cellIndex = startIndex + index;
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
        else if (maintableKeys.includes(key.substr(0, key.indexOf(":")))) {
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

    //console.log(columns);

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

            //CONCAT COLUMNS
            mergecolumns.forEach(function (mergecolumn, i) {
                const mergeDOM = document.createElement("p");
                mergeDOM.classList.add("subdetails");
                mergeDOM.innerText = data[mergecolumn.cat];
                cells[mergecolumn.indexVis].append(mergeDOM);
            });

            let linkedItems = [];
            //html attributes
            const rowid = maintable.replace(/\s+/g, '') + ":" + dataIndex;
            if (maintable == LINKSHEET) {
                row.setAttribute("summary", data[MAINSHEET] + LINKSHEET);
                linkedItems = jason[MAINSHEET].filter(x => data[MAINSHEET]?.split("\n").includes(x[MAINSHEET_keys[0]]));
            }
            else {
                row.setAttribute("summary", data[maintableKeys[0]]);
                linkedItems = jason[linktable].filter(x => x[maintable]?.includes(data[maintableKeys[0]]));
            }
            row.setAttribute("id", rowid);

            const childrowsVis = childRowsHeaders.reduce((acc, value, index, array) => acc + data[value]?.length, "");

            if (childrowsVis > 0 || linkedItems.length > 0) {
                $(row).children("td.IDcolumn").addClass('details-control');
                let linkTableDOM = "", childrowsDOM = "";
                if (childrowsVis > 0) {
                    let details = "", childrowTable = "";
                    childRowsHeaders.forEach(x => details += formatChildRows(x, data[x]));
                    if (details != "") childrowTable = '<table class="childrowtable">' + details + '</table>';
                    childrowsDOM = document.createElement('div');
                    childrowsDOM.innerHTML = childrowTable;
                }
                if (linkedItems.length > 0) {
                    $(row).children("td.linkcolumn").text(linkedItems.length);
                    linkTableDOM = document.createElement('div');
                    linkTableDOM.innerHTML = '<table id="' + rowid + "." + linktable + '" class="linktable">' +
                        '<thead></thead>' +
                        '<tbody></tbody>' +
                        '<tfoot></tfoot>' +
                        '</table>';
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
                        dRow.child([linkTableDOM, childrowsDOM], "child").show();
                        makeDataTable(jqtr.next('tr').find('table.linktable')[0], linkedItems, linktable);
                        jqtr.addClass('shown');
                    }
                });
            }
        },
        "initComplete": function () {
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
                    else if (jqth.classList.contains("linkedcolumn")) {
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

                if ($.fn.dataTable.isDataTable(fixedtable)) {
                    dfixedtable.clear();
                    dfixedtable.destroy();
                }

                document.getElementById("fixedtheader").innerHTML = "";
                document.getElementById("fixedtbody").innerHTML = "";
                document.getElementById("fixedtfooter").querySelectorAll("tr:not(#fixedfooterrow)").forEach(tr => tr.remove());

                dfixedtable = makeDataTable(fixedtable, jason[sheet], sheet);
            }, false);
            tab_a.innerText = sheet;
            tab_li.append(tab_a);
        }
    });
    navfooter.append(tabs_ul);
    return navfooter;
}

function formatTooltip(name, value) {
    return ("<li style='list-style-type:none;'><span class='inline description'>" + name + ": </span>" + createHyperlinks(value) + "</li>")
}

function createHyperlinks(content) {
    // OPTION2: SLIM ALTERNATIEF, mr voorlopig nog volledig url weergave, en $ teken loopt mis
    let exp_match = /(\b(https?|):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig; //find https?
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