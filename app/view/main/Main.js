/**
 * Main viewport: a border layout with the occupation grid in the center and a
 * collapsible detail panel (KPI tiles + wage-percentile chart) on the east.
 */
Ext.define('TexasWages.view.main.Main', {
    extend: 'Ext.panel.Panel',
    xtype: 'app-main',

    requires: [
        'Ext.plugin.Viewport',
        'Ext.window.MessageBox',
        'TexasWages.view.main.MainController',
        'TexasWages.view.main.MainModel',
        'TexasWages.view.main.OccupationGrid',
        'TexasWages.view.main.DetailPanel'
    ],

    controller: 'main',
    viewModel: 'main',

    layout: 'border',

    header: {
        title: {
            bind: { text: '{title}' },
            iconCls: 'x-fa fa-map-marker-alt',
            flex: 1
        },
        // The title flexes, so this vintage chip is pushed to the far right of the
        // full-width header — the always-visible "when is this data from" indicator.
        // Populated by MainController#onStoreLoad from the dataset meta.
        items: [{
            xtype: 'component',
            reference: 'vintageText',
            testId: 'data-vintage',
            style: 'margin-right:8px;font-size:12px;',
            html: ''
        }]
    },

    items: [
        {
            xtype: 'occupationgrid',
            region: 'center',
            reference: 'wageGrid',
            testId: 'wage-grid'
        },
        {
            xtype: 'occupationdetail',
            region: 'east',
            reference: 'detailPanel',
            testId: 'detail-panel',
            width: 400,
            minWidth: 320,
            collapsible: true,
            split: true
        }
    ],

    // Full-width provenance / citation footer. Populated from the dataset's `meta`
    // block once the store loads (MainController#onStoreLoad); the static text is the
    // fallback shown before load and satisfies the BLS attribution request.
    bbar: {
        style: 'background-color:#fafbfc;border-top:1px solid #dfe3e8;',
        items: [{
            xtype: 'tbtext',
            reference: 'provenanceText',
            testId: 'data-provenance',
            html: '<i class="x-fa fa-database" style="margin-right:6px;color:#637381;"></i>' +
                'Source: U.S. Bureau of Labor Statistics — Occupational Employment &amp; Wage Statistics (OEWS)'
        }, '->', {
            xtype: 'tbtext',
            html: '<a href="https://www.bls.gov/oes/" target="_blank" rel="noopener" ' +
                'style="color:#1976d2;text-decoration:none;">bls.gov/oes <i class="x-fa fa-external-link-alt" ' +
                'style="font-size:10px;"></i></a>'
        }]
    }
});
