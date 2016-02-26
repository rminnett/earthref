const {describe, it} = global;
import {expect} from 'chai';
import ParseContribution from '../parse_contribution';

const parseContributionWarningTest = (text, reErrorMsg) => {

  // create a mock Map instead of a Reactive Dict
  const LocalState = new Map();

  // parse the test string
  const parser = new ParseContribution({LocalState});
  parser.parse(text);

  // retrieve the spied arguments from the 1st time LocalState.set was called
  const errors = LocalState.get('PARSE_CONTRIBUTION_WARNINGS');

  // expect the parse errors to contain one error that matches the matchErrorMSG regex
  expect(errors.length).to.be.at.least(1);
  expect(errors[errors.length - 1]['message']).to.match(reErrorMsg);

};

const parseContributionErrorTest = (text, reErrorMsg) => {

  // create a mock Map instead of a Reactive Dict
  const LocalState = new Map();

  // parse the test string
  const parser = new ParseContribution({LocalState});
  parser.parse(text);

  // retrieve the spied arguments from the 1st time LocalState.set was called
  const errors = LocalState.get('PARSE_CONTRIBUTION_ERRORS');

  // expect the parse errors to contain one error that matches the matchErrorMSG regex
  expect(errors.length).to.be.at.least(1);
  expect(errors[errors.length - 1]['message']).to.match(reErrorMsg);
  
};

const parseContributionJSONTest = (text, jsonExpected) => {

  // create a mock Map instead of a Reactive Dict
  const LocalState = new Map();

  // parse the test string
  const parser = new ParseContribution({LocalState});
  const json = parser.parse(text);

  // retrieve the spied arguments from the 1st time LocalState.set was called
  const errors = LocalState.get('PARSE_CONTRIBUTION_ERRORS');

  // expect no errors and
  expect(errors.length).to.equal(0);
  expect(json).to.deep.equal(jsonExpected);

};

describe('magic.actions.parseContribution', () => {
  describe('parse', () => {
    it('should warn about parsing an empty string', () => {
      parseContributionWarningTest(null, /empty/i);
    });

    it('should reject nonsense', () => {
      parseContributionErrorTest('nonsense', /unrecognized column delimiter/i);
    });

    it('should reject nonsense with tab header', () => {
      parseContributionErrorTest('nonsense\ttable', /unrecognized column delimiter/i);
    });

    it('should reject leading space nonsense', () => {
      parseContributionErrorTest('  nonsense  \ttable\ncol1\tcol2\nstr1\t1.2', /. Expected "tab"./i);
    });

    it('should reject if table name is missing', () => {
      const noTableNames = ['tab\n', ' tab \n', ' tab \t', 'tab\t\n', 'tab\t \n'];
      for (var noTableName of noTableNames)
          parseContributionErrorTest(noTableName, /no table name following tab delimiter/i);
    });

    it('should reject repeated column names', () => {
      parseContributionErrorTest('tab\ttable\ncol1\tcol1\n', /found duplicate column names/i);
    });

    it('should warn about empty tables', () => {
      parseContributionWarningTest('tab\ttable\ncol1\tcol2\n', /no data values were found/i);
      parseContributionWarningTest('tab \t123\ncol1\tcol2\n', /no data values were found/i);
    });

    it('should keep numbers as strings', () => {
      const json = { 'table': [ { 'col1': 'str1', 'col2': '1.2' } ] };
      parseContributionJSONTest('tab\ttable\ncol1\tcol2\nstr1\t1.2', json);
    });

    it('should eliminate blank lines and leading/trailing spaces', () => {
      const withBlanks = [
        "\ntab\ttable\ncol1\tcol2\nstr1\t1.2",
        "tab\ttable\ncol1\tcol2\n\n\nstr1\t1.2",
        " tab\ttable\ncol1\tcol2\nstr1\t1.2",
        "tab  \ttable\ncol1\tcol2\nstr1\t1.2",
        "tab\t  table\ncol1\tcol2\nstr1\t1.2",
        "tab\ttable\ncol1  \tcol2\n  str1\t1.2  "
      ];
      const json = { "table": [ { "col1": "str1", "col2": "1.2" } ] };
      for (var withBlank of withBlanks)
        parseContributionJSONTest(withBlank, json);
    });

  });
});
