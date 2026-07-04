/**
 * Detail side panel: header + KPI tiles + a bar chart of the selected occupation's
 * annual wage percentiles (10/25/median/75/90). Updated imperatively via
 * showOccupation(record), called by the Main controller on grid selection.
 * Suppressed (null) percentiles are omitted so the chart never errors.
 */
Ext.define('TexasWages.view.main.DetailPanel', {
    extend: 'Ext.panel.Panel',
    xtype: 'occupationdetail',

    requires: [
        'TexasWages.util.Format',
        'Ext.chart.CartesianChart',
        'Ext.chart.series.Bar',
        'Ext.chart.axis.Numeric',
        'Ext.chart.axis.Category',
        'Ext.chart.interactions.ItemHighlight'
    ],

    title: 'Occupation Detail',
    bodyPadding: 12,
    scrollable: true,
    layout: { type: 'vbox', align: 'stretch' },

    emptyHtml: '<div style="color:#919eab;padding:16px 4px;">Select an occupation to see wage details and the percentile chart.</div>',

    items: [
        {
            xtype: 'component',
            itemId: 'occHeader',
            html: '<div style="color:#919eab;padding:16px 4px;">Select an occupation to see wage details and the percentile chart.</div>'
        },
        {
            xtype: 'component',
            itemId: 'kpiBox',
            hidden: true
        },
        {
            xtype: 'cartesian',
            itemId: 'wageChart',
            reference: 'wageChart',
            testId: 'wage-chart',
            height: 280,
            hidden: true,
            insetPadding: 16,
            store: { fields: ['label', 'wage'], data: [] },
            interactions: ['itemhighlight'],
            axes: [
                { type: 'numeric', position: 'left', grid: true, minimum: 0, title: 'Annual wage ($)' },
                { type: 'category', position: 'bottom', title: 'Percentile' }
            ],
            series: [{
                type: 'bar',
                xField: 'label',
                yField: 'wage',
                label: {
                    field: 'wage',
                    display: 'insideEnd',
                    renderer: function (text) {
                        return '$' + Ext.util.Format.number(text, '0,000');
                    }
                },
                tooltip: {
                    trackMouse: true,
                    renderer: function (tooltip, record) {
                        tooltip.setHtml(record.get('label') + ' percentile: ' +
                            Ext.util.Format.currency(record.get('wage'), '$', 0));
                    }
                }
            }]
        }
    ],

    /** Update the panel for the given occupation record (or clear it when null). */
    showOccupation: function (rec) {
        var header = this.down('#occHeader'),
            kpi = this.down('#kpiBox'),
            chart = this.down('#wageChart'),
            F = TexasWages.util.Format,
            pcts, data;

        if (!rec) {
            header.setHtml(this.emptyHtml);
            kpi.hide();
            chart.hide();
            return;
        }

        header.setHtml(
            '<div style="font-size:18px;font-weight:600;color:#212b36;line-height:1.2;" data-testid="detail-title">' +
                Ext.String.htmlEncode(rec.get('title')) + '</div>' +
            '<div style="font-size:12px;color:#637381;margin-top:2px;">SOC ' + rec.get('socCode') +
                ' &middot; ' + Ext.String.htmlEncode(rec.get('majorGroupTitle')) + '</div>'
        );

        kpi.setHtml(this.buildKpis(rec, F));
        kpi.show();

        pcts = [
            { label: '10th', wage: rec.get('aPct10') },
            { label: '25th', wage: rec.get('aPct25') },
            { label: 'Median', wage: rec.get('aMedian') },
            { label: '75th', wage: rec.get('aPct75') },
            { label: '90th', wage: rec.get('aPct90') }
        ];
        data = Ext.Array.filter(pcts, function (p) {
            return p.wage !== null && p.wage !== undefined;
        });

        chart.getStore().loadData(data);
        if (data.length) {
            chart.show();
        } else {
            chart.hide();
        }
    },

    buildKpis: function (rec, F) {
        function tile(label, value, testId) {
            return '<div style="flex:1 1 45%;min-width:130px;background:#f4f6f8;border:1px solid #dfe3e8;' +
                'border-radius:6px;padding:8px 10px;box-sizing:border-box;">' +
                '<div style="font-size:10px;color:#637381;text-transform:uppercase;letter-spacing:.05em;">' + label + '</div>' +
                '<div data-testid="' + testId + '" style="font-size:17px;font-weight:600;color:#212b36;">' + value + '</div>' +
                '</div>';
        }
        return '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px;">' +
            tile('Employment', F.emp(rec.get('totalEmp')), 'kpi-emp') +
            tile('Median (annual)', F.moneyAnnual(rec.get('aMedian'), null, rec), 'kpi-median') +
            tile('Mean (annual)', F.moneyAnnual(rec.get('aMean'), null, rec), 'kpi-mean') +
            tile('Location Quotient', F.lq(rec.get('locQuotient')), 'kpi-lq') +
            '</div>';
    }
});
