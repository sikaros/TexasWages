/**
 * The main data grid: buffered rendering (default), per-column filters, grouping by
 * SOC major group with group summaries, a search box, and a CSV export button.
 * Handlers ('onSearch', 'onExportCsv', 'onOccupationSelect') resolve to the Main
 * view's controller.
 */
Ext.define('TexasWages.view.main.OccupationGrid', {
    extend: 'Ext.grid.Panel',
    xtype: 'occupationgrid',

    requires: [
        'TexasWages.store.Occupations',
        'TexasWages.util.Format',
        'Ext.grid.filters.Filters',
        'Ext.grid.feature.GroupingSummary',
        'Ext.toolbar.Toolbar',
        'Ext.form.field.Text'
    ],

    store: { type: 'occupations' },

    title: 'Texas Occupational Wages',
    columnLines: true,

    plugins: {
        gridfilters: true
    },

    features: [{
        ftype: 'groupingsummary',
        hideGroupedHeader: true,
        groupHeaderTpl: '{[values.rows[0].get("majorGroupTitle")]} ({rows.length})'
    }],

    selModel: { type: 'rowmodel', mode: 'SINGLE' },

    listeners: {
        select: 'onOccupationSelect'
    },

    dockedItems: [{
        xtype: 'toolbar',
        dock: 'top',
        items: [{
            xtype: 'textfield',
            reference: 'searchField',
            testId: 'search-field',
            emptyText: 'Search job title or SOC code…',
            width: 340,
            triggers: {
                clear: {
                    cls: 'x-form-clear-trigger',
                    handler: 'onClearSearch'
                }
            },
            listeners: {
                change: { fn: 'onSearch', buffer: 200 }
            }
        }, '->', {
            xtype: 'button',
            text: 'Export CSV',
            iconCls: 'fa-download',
            testId: 'export-csv',
            handler: 'onExportCsv'
        }]
    }],

    columns: [
        {
            text: 'Occupation', dataIndex: 'title', flex: 2, minWidth: 240,
            filter: 'string',
            summaryType: 'count',
            summaryRenderer: function (v) { return v + ' occupations'; }
        },
        { text: 'SOC', dataIndex: 'socCode', width: 92, filter: 'string' },
        {
            text: 'Employment', dataIndex: 'totalEmp', width: 120, align: 'right',
            filter: 'number',
            renderer: TexasWages.util.Format.emp,
            summaryType: 'sum',
            summaryRenderer: function (v) { return TexasWages.util.Format.emp(v); }
        },
        {
            text: 'Median (annual)', dataIndex: 'aMedian', width: 135, align: 'right',
            filter: 'number', renderer: TexasWages.util.Format.moneyAnnual
        },
        {
            text: 'Mean (annual)', dataIndex: 'aMean', width: 135, align: 'right',
            filter: 'number', renderer: TexasWages.util.Format.moneyAnnual
        },
        {
            text: '10th pct', dataIndex: 'aPct10', width: 110, align: 'right',
            hidden: true, renderer: TexasWages.util.Format.moneyAnnual
        },
        {
            text: '25th pct', dataIndex: 'aPct25', width: 110, align: 'right',
            hidden: true, renderer: TexasWages.util.Format.moneyAnnual
        },
        {
            text: '75th pct', dataIndex: 'aPct75', width: 110, align: 'right',
            hidden: true, renderer: TexasWages.util.Format.moneyAnnual
        },
        {
            text: '90th pct', dataIndex: 'aPct90', width: 110, align: 'right',
            renderer: TexasWages.util.Format.moneyAnnual
        },
        {
            text: 'Loc. Quotient', dataIndex: 'locQuotient', width: 115, align: 'right',
            filter: 'number', renderer: TexasWages.util.Format.lq
        }
    ]
});
