/**
 * View model for the Main view. Holds the currently selected occupation record
 * (bound by the detail panel) and the app title.
 */
Ext.define('TexasWages.view.main.MainModel', {
    extend: 'Ext.app.ViewModel',

    alias: 'viewmodel.main',

    data: {
        title: 'TexasWages — Texas Occupational Wages (BLS OEWS)',
        selectedOccupation: null
    }
});
