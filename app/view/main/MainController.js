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
