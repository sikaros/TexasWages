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
            iconCls: 'fa-map-marker'
        }
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
    ]
});
