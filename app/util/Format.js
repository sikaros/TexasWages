/**
 * Shared display formatters for OEWS wage/employment values.
 * Handles BLS suppression: null renders as an em-dash, and top-coded wages
 * (BLS "#": >= $115.00/hr or $239,200/yr) render as a ">=" ceiling.
 *
 * Methods are scope-independent (no use of `this`) so they can be passed directly
 * as grid column renderers, which Ext invokes with the column as scope.
 */
Ext.define('TexasWages.util.Format', {
    singleton: true,
    alternateClassName: 'TWFormat',

    requires: ['Ext.util.Format'],

    emp: function (v) {
        return (v === null || v === undefined) ? '—' : Ext.util.Format.number(v, '0,000');
    },

    moneyAnnual: function (v, meta, rec) {
        if (v === null || v === undefined) {
            return (rec && rec.get && rec.get('topCoded')) ? '≥ $239,200' : '—';
        }
        return Ext.util.Format.currency(v, '$', 0);
    },

    moneyHourly: function (v, meta, rec) {
        if (v === null || v === undefined) {
            return (rec && rec.get && rec.get('topCoded')) ? '≥ $115.00' : '—';
        }
        return Ext.util.Format.currency(v, '$', 2);
    },

    lq: function (v) {
        return (v === null || v === undefined) ? '—' : Ext.util.Format.number(v, '0.00');
    }
});
