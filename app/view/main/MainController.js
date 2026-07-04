/**
 * Controller for the Main view: search filtering, row selection -> detail panel,
 * and client-side CSV export (the Ext Exporter package is commercial-only).
 */
Ext.define('TexasWages.view.main.MainController', {
    extend: 'Ext.app.ViewController',

    alias: 'controller.main',

    // Columns exported to CSV: [field, header]
    csvColumns: [
        ['socCode', 'SOC Code'],
        ['title', 'Occupation'],
        ['majorGroupTitle', 'Major Group'],
        ['totalEmp', 'Employment'],
        ['aMedian', 'Median Annual'],
        ['aMean', 'Mean Annual'],
        ['aPct10', '10th Pct Annual'],
        ['aPct25', '25th Pct Annual'],
        ['aPct75', '75th Pct Annual'],
        ['aPct90', '90th Pct Annual'],
        ['locQuotient', 'Location Quotient']
    ],

    /**
     * Wire the store load once the view (and its store) exist, so we can populate the
     * major-group dropdown and the data-vintage / provenance UI from the dataset `meta`.
     */
    init: function () {
        var store = this.lookupReference('wageGrid').getStore();
        store.on('load', this.onStoreLoad, this);
        if (store.isLoaded()) {
            this.onStoreLoad(store);
        }
    },

    /**
     * After data loads: (1) fill the Major Group combo with the distinct groups present,
     * (2) stamp the data vintage into the filter-bar chip + grid title, and (3) fill the
     * bottom provenance bar — all driven by the JSON `meta` block (accurate for real data).
     */
    onStoreLoad: function (store) {
        var reader = store.getProxy().getReader(),
            meta = (reader && reader.metaData) || {},
            groups = [],
            seen = {};

        store.each(function (rec) {
            var code = rec.get('majorGroupCode');
            if (code && !seen[code]) {
                seen[code] = true;
                groups.push({ code: code, title: rec.get('majorGroupTitle') });
            }
        });
        groups.sort(function (a, b) { return a.code < b.code ? -1 : (a.code > b.code ? 1 : 0); });
        this.lookupReference('majorGroupFilter').getStore().loadData(groups);

        var vintage = meta.dataYear || '',
            area = meta.area || 'Texas',
            count = store.getTotalCount() || store.getCount();

        if (vintage) {
            // Vintage chip lives in the app header (full-width, always visible) — light
            // text for the blue header bar.
            this.lookupReference('vintageText').setHtml(
                '<span style="color:#dbe8f4;">Data:</span> ' +
                '<span style="color:#ffffff;font-weight:600;">BLS OEWS · ' + Ext.String.htmlEncode(vintage) + '</span>' +
                '<span style="color:#c3d8ec;"> · ' + count + ' occupations</span>'
            );
            this.lookupReference('wageGrid').setTitle('Texas Occupational Wages · ' + vintage);
        }

        // Clean, fixed citation label (the raw meta.source can be verbose); the vintage
        // + area come from the data so this stays accurate across dataset refreshes.
        this.lookupReference('provenanceText').setHtml(
            '<i class="x-fa fa-database" style="margin-right:6px;color:#637381;"></i>' +
            'Source: U.S. Bureau of Labor Statistics — Occupational Employment &amp; Wage Statistics (OEWS)' +
            (vintage ? ' · ' + Ext.String.htmlEncode(vintage) : '') +
            ' · ' + Ext.String.htmlEncode(area) + ' statewide'
        );
    },

    /**
     * Live search across occupation title OR SOC code. Uses a dedicated filter id
     * so it coexists with the per-column gridfilters.
     */
    onSearch: function (field, value) {
        var store = this.lookupReference('wageGrid').getStore(),
            filters = store.getFilters(),
            term = (value || '').trim().toLowerCase(),
            existing = filters.getByKey('searchTerm');

        if (existing) {
            filters.remove(existing);
        }
        if (term) {
            filters.add({
                id: 'searchTerm',
                filterFn: function (rec) {
                    return rec.get('title').toLowerCase().indexOf(term) !== -1 ||
                           rec.get('socCode').toLowerCase().indexOf(term) !== -1;
                }
            });
        }
    },

    onClearSearch: function () {
        var field = this.lookupReference('searchField');
        if (field) {
            field.setValue('');   // fires change -> onSearch('') -> removes the filter
        }
    },

    /** Replace a keyed store filter, or remove it when `filter` is null. */
    setKeyedFilter: function (id, filter) {
        var filters = this.lookupReference('wageGrid').getStore().getFilters(),
            existing = filters.getByKey(id);
        if (existing) {
            filters.remove(existing);
        }
        if (filter) {
            filters.add(Ext.apply({ id: id }, filter));
        }
    },

    /** Filter to a single SOC major group (or all groups when cleared). */
    onMajorGroupChange: function (combo, value) {
        this.setKeyedFilter('majorGroup', value ? {
            filterFn: function (rec) { return rec.get('majorGroupCode') === value; }
        } : null);
    },

    /** Keep only occupations whose median annual wage is at least the entered amount. */
    onMinWageChange: function (field, value) {
        var min = Ext.isNumber(value) ? value : null;
        this.setKeyedFilter('minWage', (min !== null && min > 0) ? {
            filterFn: function (rec) {
                var w = rec.get('aMedian');
                return w !== null && w !== undefined && w >= min;
            }
        } : null);
    },

    /** Clear the search box, both filter-bar knobs, and any per-column menu filters. */
    onResetFilters: function () {
        var grid = this.lookupReference('wageGrid'),
            store = grid.getStore(),
            gridfilters = grid.getPlugin('gridfilters');

        // Reset the visible controls (their change handlers drop the keyed filters).
        this.lookupReference('searchField').setValue('');
        this.lookupReference('majorGroupFilter').setValue(null);
        this.lookupReference('minWageFilter').setValue(null);

        // Clear per-column menu filters, then belt-and-suspenders remove our keyed ones.
        if (gridfilters) {
            gridfilters.clearFilters();
        }
        ['searchTerm', 'majorGroup', 'minWage'].forEach(function (id) {
            var f = store.getFilters().getByKey(id);
            if (f) { store.getFilters().remove(f); }
        });
    },

    onOccupationSelect: function (grid, record) {
        this.getViewModel().set('selectedOccupation', record);
        var detail = this.lookupReference('detailPanel');
        if (detail) {
            detail.showOccupation(record);
        }
    },

    onExportCsv: function () {
        var store = this.lookupReference('wageGrid').getStore(),
            cols = this.csvColumns,
            lines = [],
            csv, blob, url, link;

        function esc(v) {
            if (v === null || v === undefined) { v = ''; }
            v = String(v);
            if (v.indexOf(',') !== -1 || v.indexOf('"') !== -1 || v.indexOf('\n') !== -1) {
                v = '"' + v.replace(/"/g, '""') + '"';
            }
            return v;
        }

        lines.push(cols.map(function (c) { return esc(c[1]); }).join(','));

        store.each(function (rec) {
            lines.push(cols.map(function (c) { return esc(rec.get(c[0])); }).join(','));
        });

        csv = lines.join('\r\n');
        blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        url = window.URL.createObjectURL(blob);
        link = document.createElement('a');
        link.href = url;
        link.download = 'texas_wages.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
});
