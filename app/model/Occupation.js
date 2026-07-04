/**
 * One OEWS occupation row (Texas). Field names mirror resources/data/schema.json.
 * All numeric wage/employment fields allow null (BLS suppression / top-coding).
 */
Ext.define('TexasWages.model.Occupation', {
    extend: 'Ext.data.Model',

    fields: [
        { name: 'socCode', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'oGroup', type: 'string' },
        { name: 'majorGroupCode', type: 'string' },
        { name: 'majorGroupTitle', type: 'string' },

        { name: 'totalEmp', type: 'int', allowNull: true },
        { name: 'jobsPer1000', type: 'number', allowNull: true },
        { name: 'locQuotient', type: 'number', allowNull: true },

        { name: 'hMean', type: 'number', allowNull: true },
        { name: 'aMean', type: 'int', allowNull: true },
        { name: 'hMedian', type: 'number', allowNull: true },
        { name: 'aMedian', type: 'int', allowNull: true },

        { name: 'hPct10', type: 'number', allowNull: true },
        { name: 'hPct25', type: 'number', allowNull: true },
        { name: 'hPct75', type: 'number', allowNull: true },
        { name: 'hPct90', type: 'number', allowNull: true },
        { name: 'aPct10', type: 'int', allowNull: true },
        { name: 'aPct25', type: 'int', allowNull: true },
        { name: 'aPct75', type: 'int', allowNull: true },
        { name: 'aPct90', type: 'int', allowNull: true },

        { name: 'topCoded', type: 'boolean' },
        { name: 'wageSuppressed', type: 'boolean' },
        { name: 'empSuppressed', type: 'boolean' }
    ]
});
