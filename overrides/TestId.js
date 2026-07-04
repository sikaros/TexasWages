/**
 * Test-hook override: any component given a `testId` config renders a stable
 * `data-testid` attribute on its element. Lets Playwright target components with
 * page.getByTestId(...) instead of Ext's churny auto-generated ids (#gridview-1071).
 *
 * Auto-required by the build (app.json "overrides") because it overrides Ext.Component,
 * which is always included.
 */
Ext.define('TexasWages.override.TestId', {
    override: 'Ext.Component',

    afterRender: function () {
        this.callParent(arguments);
        if (this.testId && this.el) {
            this.el.dom.setAttribute('data-testid', this.testId);
        }
    }
});
