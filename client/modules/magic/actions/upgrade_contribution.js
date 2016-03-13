import {_} from 'lodash';
import Runner from './runner.js';

import {magicVersions} from '../configs/magic_versions.js';
import {magicDataModels} from './tests/files/data_models/data_models.js';

export default class extends Runner {

  constructor({LocalState}) {
    super('UPGRADE_CONTRIBUTION', {LocalState});
  }

  upgrade(jsonOld, maxVersion) {

    // Initialize the upgrading state.
    this.table = undefined;
    this.rowNumber = undefined;
    this.column = undefined;

    // Check for a valid input.
    if (_.isEmpty(jsonOld)) {
      this._appendWarning('The first argument (MagIC contribution in JSON format) is empty.');
      return jsonOld;
    }

    // Check that the maximum MagIC data model version to upgrade to is valid (maxVersion is in magicVersions).
    if (maxVersion && _.indexOf(magicVersions, maxVersion) === -1) {
      let strVersions = magicVersions.map((str) => { return `"${str}"`; }).join(', ');
      this._appendError(`The second argument (maximum MagIC data model version), "${maxVersion}", is invalid. ` +
                        `Expected one of: ${strVersions}.`);
      return jsonOld;
    }

    //console.log("JSON file in parser: " + JSON.stringify(jsonOld));

    // Look for the old MagIC data model version.
    let oldVersion;
    if(!jsonOld || !jsonOld['contribution']) {
      this._appendError('Failed to find the "contribution" table.');
      return jsonOld;
    }
    if (jsonOld['contribution']) {
      if (jsonOld['contribution'].length !== 1) {
        this._appendError('The "contribution" table does not have exactly one row.');
        return jsonOld;
      }
      if (!jsonOld['contribution'][0]['magic_version']) {
        this._appendError('The "contribution" table does not include the "magic_version" column.');
        return jsonOld;
      }
      this.contributionTable = 'contribution';
      oldVersion = jsonOld['contribution'][0]['magic_version'];
    }

    // Check that the old MagIC data model version is valid (oldVersion is in magicVersions).
    if (_.indexOf(magicVersions, oldVersion) === -1) {
      const strVersions = magicVersions.map((str) => { return `"${str}"`; }).join(", ");
      this._appendError(`MagIC data model version ${oldVersion} is invalid. Expected one of: ${strVersions}.`);
      return jsonOld;
    }

    // Check if the maxVersion has been reached.
    if (oldVersion === maxVersion) return jsonOld;

    // Check that there is a newer MagIC data model to use.
    if (_.indexOf(magicVersions, oldVersion) === magicVersions.length - 1) return jsonOld;
    const newVersion = magicVersions[_.indexOf(magicVersions, oldVersion) + 1]

    const oldModel = magicDataModels[oldVersion];
    const newModel = magicDataModels[newVersion];

    const upgradeMap = this.getUpgradeMap(newModel);

    // Upgrade the contribution.
    let jsonNew = {};
    for (let table in jsonOld) {

      // Check that the old table is defined in the old data model.
      if (!oldModel['tables'][table]) {
        this._appendError(`Table "${table}" is not defined in MagIC data model version ${oldVersion}.`);
        continue;
      }

      if (!jsonNew[table]) jsonNew[table] = [];

      for (let row of jsonOld[table]) {
        let newRow = {};
        for (let column in row) {

          // Check that the old table and column are defined in the old data model.
          if (!oldModel['tables'][table]) {
            this._appendError(`Column "${column}" in table "${table}" is not defined in MagIC data model version ${oldVersion}.`);
            continue;
          }

          // Check that the old table and column are defined in the new data model.
          if (!upgradeMap[table] || !upgradeMap[table][column]) {
            this._appendWarning(`Column "${column}" in table "${table}" was deleted in MagIC data model version ${newVersion}.`);
            continue;
          }

          // Upgrade the version number
          if (table === 'contribution' && column === 'magic_version') {
            newRow[column] = newVersion;
            continue;
          }

          // TODO: this doesn't handle changes in table names properly yet
          for (let newTableColumn in upgradeMap[table][column]) {
            //if (!jsonNew[newTableColumn.table]) jsonNew[newTableColumn.table] = [];
            newRow[newTableColumn.column] = row[column];
          }

        }

        // TODO: this doesn't handle changes in table names properly yet
        jsonNew[table].push(newRow);

      }
    }

    //console.log("old: ", jsonOld);
    //console.log("new: ", jsonNew);

    // Recursively upgrade the contribution.
   return this.upgrade(jsonNew, maxVersion);

  }

  getUpgradeMap(newModel) {

    let returnUpgradeMap = {};

    for (let newTableName in newModel.tables) {//this gets the STRING name of the property into 'table'
      let newTableObject = newModel.tables[newTableName];//this on the other hand, gets the whole table object

      let columnMap =  new Map();
      for (let newColumn in newTableObject.columns) {
        {
          let newColumnsObj = newTableObject.columns;
          let prevColArray = newColumnsObj[newColumn].previous_columns;

          //TEST FOR SPLIT COLUMN
          if (prevColArray){
            let splitColNames = prevColArray[0].column;
            let prevColTable = prevColArray[0].table;
            let prevColKey = prevColArray[0].table + prevColArray[0].column;
            if (columnMap.has(prevColKey)) {// If we have seen this "previous column" before
              console.log("SPLIT of previous column detcted: " + prevColTable + "  " + splitColNames);
              let newColName1 = columnMap.get(prevColKey);
              returnUpgradeMap[newTableName] = {[splitColNames]:[{table:newTableName,column:newColName1},{table:newTableName,column:newColumn}]};
            }
            else {columnMap.set(prevColKey, newColumn);}
          }


          //TEST FOR RENAMED COLUMNS
          if (prevColArray &&
              prevColArray.length === 1 &&
              Object.keys(newColumnsObj).length === 1) {///GGG CHANG THIS CONDITION
            let previousTableName = prevColArray[0].table;
            let previousColumnName = prevColArray[0].column;
            if ((newTableName != previousTableName) || newColumn != previousColumnName) {
              console.log("RENAMED column detected in table " +newTableName);
              returnUpgradeMap[previousTableName] =
                 {
                  [previousColumnName]: [{
                    table: newTableName,
                    column: newColumn
                  }]
                };
            }
          }
          //TEST FOR MERGED COLUMNS...If there is more than one previous column, that indicates a MERGE to this version
          if (prevColArray && (prevColArray.length > 1))
          {
            console.log("MERGED column detected in table " +newTableName);
            returnUpgradeMap[newTableName]=
              {
                [prevColArray[0].column]:[{table:newTableName, column:newColumn}],
                [prevColArray[1].column]:[{table:newTableName, column:newColumn}]
              };
          }
        }
      }
    }
    return returnUpgradeMap;
  }
}
