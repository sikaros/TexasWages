/**
 * Loads the static Texas OEWS dataset (resources/data/tx_oews.json) produced by
 * tools/convert_oews.py. Grouped by SOC major group for the grid's grouping feature.
 */
Ext.define('TexasWages.store.Occupations', {
    extend: 'Ext.data.Store',
    alias: 'store.occupations',

    requires: ['TexasWages.model.Occupation'],

    model: 'TexasWages.model.Occupation',

    autoLoad: true,

    proxy: {
        type: 'ajax',
        url: 'resources/data/tx_oews.json',
        reader: {
            type: 'json',
            rootProperty: 'rows'
        }
    },

    grouper: { property: 'majorGroupCode' },

    sorters: [
        { property: 'majorGroupCode', direction: 'ASC' },
        { property: 'title', direction: 'ASC' }
    ]
});
