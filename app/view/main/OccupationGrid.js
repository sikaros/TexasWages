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
        'Ext.form.field.Text',
        'Ext.form.field.Number',
        'Ext.form.field.ComboBox'
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
        // Row 1 — free-text search + export.
        xtype: 'toolbar',
        dock: 'top',
        items: [{
            xtype: 'textfield',
            reference: 'searchField',
            testId: 'search-field',
            emptyText: 'Search job title or SOC code…',
            width: 340,
            triggers: {
                search: {
                    // Neutral trigger (no theme sprite) so the painted glyph is the only icon.
                    cls: 'tw-search-trigger',
                    weight: -1
                },
                clear: {
                    cls: 'x-form-clear-trigger',
                    handler: 'onClearSearch'
                }
            },
            listeners: {
                change: { fn: 'onSearch', buffer: 200 },
                afterrender: function (fld) {
                    // Paint a Font Awesome magnifier into the (otherwise empty) search trigger.
                    var t = fld.getTrigger('search');
                    if (t && t.el) {
                        t.el.dom.innerHTML =
                            '<i class="x-fa fa-search" style="color:#919eab;font-size:13px;"></i>';
                    }
                }
            }
        }, '->', {
            xtype: 'button',
            text: 'Export CSV',
            iconCls: 'x-fa fa-download',
            testId: 'export-csv',
            handler: 'onExportCsv'
        }]
    }, {
        // Row 2 — always-visible filter bar (the "knobs"): major group, min wage,
        // reset, and a data-vintage chip on the right. Per-column menu filters remain
        // available for power users, but these surface the common filters up front.
        xtype: 'toolbar',
        dock: 'top',
        style: 'background-color:#f4f6f8;border-top:1px solid #dfe3e8;',
        items: [{
            xtype: 'tbtext',
            html: '<i class="x-fa fa-filter" style="margin-right:6px;color:#637381;"></i>' +
                '<span style="color:#454f5b;font-weight:600;">Filters</span>'
        }, {
            xtype: 'combobox',
            reference: 'majorGroupFilter',
            testId: 'major-group-filter',
            width: 210,
            emptyText: 'All major groups',
            editable: false,
            queryMode: 'local',
            displayField: 'title',
            valueField: 'code',
            triggerAction: 'all',
            store: { fields: ['code', 'title'], data: [] },
            listeners: { change: 'onMajorGroupChange' }
        }, {
            xtype: 'numberfield',
            reference: 'minWageFilter',
            testId: 'min-wage-filter',
            width: 140,
            emptyText: 'Min median $',
            minValue: 0,
            step: 5000,
            hideTrigger: false,
            listeners: { change: { fn: 'onMinWageChange', buffer: 300 } }
        }, {
            xtype: 'button',
            text: 'Reset',
            iconCls: 'x-fa fa-undo',
            testId: 'reset-filters',
            tooltip: 'Clear search and all filters',
            handler: 'onResetFilters'
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
