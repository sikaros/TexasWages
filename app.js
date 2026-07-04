/*
 * This file launches the application by asking Ext JS to create
 * and launch() the Application class.
 */
Ext.application({
    extend: 'TexasWages.Application',

    name: 'TexasWages',

    requires: [
        // This will automatically load all classes in the TexasWages namespace
        // so that application classes do not need to require each other.
        'TexasWages.*'
    ],

    // The name of the initial view to create.
    mainView: 'TexasWages.view.main.Main'
});
