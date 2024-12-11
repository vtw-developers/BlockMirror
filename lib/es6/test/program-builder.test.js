import { expect } from 'chai';
import { ProgramBuilder } from '../program-builder';
import { TestCell } from './testcell';
describe('program builder', function () {
    function createCell(executionEventId, text, executionCount) {
        return new TestCell(text, executionCount, executionEventId);
    }
    var programBuilder;
    beforeEach(function () {
        programBuilder = new ProgramBuilder();
    });
    it('appends cell contents in order', function () {
        programBuilder.add(createCell('id1', 'print(1)'), createCell('id2', 'print(2)'));
        var code = programBuilder.buildTo('id2').text;
        expect(code).to.equal(['print(1)', 'print(2)', ''].join('\n'));
    });
    it('builds a map from lines to cells', function () {
        var cell1 = createCell('id1', 'print(1)');
        var cell2 = createCell('id2', 'print(2)');
        programBuilder.add(cell1, cell2);
        var lineToCellMap = programBuilder.buildTo('id2').lineToCellMap;
        expect(lineToCellMap[1]).to.equal(cell1);
        expect(lineToCellMap[2]).to.equal(cell2);
    });
    it('builds a map from cells to lines', function () {
        var cell1 = createCell('id1', 'print(1)');
        var cell2 = createCell('id2', 'print(2)');
        programBuilder.add(cell1, cell2);
        var cellToLineMap = programBuilder.buildTo('id2').cellToLineMap;
        expect(cellToLineMap['id1'].items).to.deep.equal([1]);
        expect(cellToLineMap['id2'].items).to.deep.equal([2]);
    });
    it('stops after the specified cell', function () {
        programBuilder.add(createCell('id1', 'print(1)'), createCell('id2', 'print(2)'));
        var code = programBuilder.buildTo('id1').text;
        expect(code).to.equal('print(1)\n');
    });
    /* We might want the program builder to include code that was executed before a runtime
     * error, though this will probably require us to rewrite the code. */
    it('skips cells with errors', function () {
        var badCell = createCell('idE', 'print(2)');
        badCell.hasError = true;
        programBuilder.add(createCell('id1', 'print(1)'), badCell, createCell('id3', 'print(3)'));
        var code = programBuilder.buildTo('id3').text;
        expect(code).to.equal(['print(1)', 'print(3)', ''].join('\n'));
    });
    it('includes cells that end with errors', function () {
        var badCell = createCell('idE', 'print(bad_name)');
        badCell.hasError = true;
        programBuilder.add(createCell('id1', 'print(1)'), createCell('id2', 'print(2)'), badCell);
        var code = programBuilder.buildTo('idE').text;
        expect(code).to.equal(['print(1)', 'print(2)', 'print(bad_name)', ''].join('\n'));
    });
    /* Sometimes, a cell might not throw an error, but our parser might choke. This shouldn't
     * crash the entire program---just skip it if it can't parse. */
    it('skips cells that fail to parse', function () {
        var badCell = createCell('idE', 'causes_syntax_error(');
        // Hide console output from parse errors.
        var oldConsoleLog = console.log;
        console.log = function () { };
        programBuilder.add(createCell('id1', 'print(1)'), badCell, createCell('id3', 'print(3)'));
        // Restore console output.
        console.log = oldConsoleLog;
        var code = programBuilder.buildTo('id3').text;
        expect(code).to.equal(['print(1)', 'print(3)', ''].join('\n'));
    });
    it('doesn\'t skip cells with array slices', function () {
        programBuilder.add(createCell('id1', 'array[0:1]'), createCell('id2', 'print(x)'));
        var code = programBuilder.buildTo('id2').text;
        expect(code).to.equal("array[0:1]\nprint(x)\n");
    });
    it('skips cells that were executed in prior kernels', function () {
        programBuilder.add(createCell('id1', 'print(1)', 1), createCell('id2', 'print(2)', 1), createCell('id3', 'print(3)', 2), createCell('id3', 'print(4)', 1));
        var code = programBuilder.buildTo('id3').text;
        expect(code).to.equals(['print(4)', ''].join('\n'));
    });
    it('constructs a tree for the program', function () {
        programBuilder.add(createCell('id1', 'print(1)'), createCell('id2', 'print(2)'));
        var tree = programBuilder.buildTo('id2').tree;
        expect(tree.code.length).to.equal(2);
    });
    it('adjusts the node locations', function () {
        programBuilder.add(createCell('id1', 'print(1)'), createCell('id2', 'print(2)'));
        var tree = programBuilder.buildTo('id2').tree;
        expect(tree.code[0].location.first_line).to.equal(1);
        expect(tree.code[1].location.first_line).to.equal(2);
    });
    it('annotates tree nodes with cell ID info', function () {
        programBuilder.add(createCell('id1', 'print(1)'));
        var tree = programBuilder.buildTo('id1').tree;
        expect(tree.code[0].location.path).to.equal('id1');
    });
});
//# sourceMappingURL=program-builder.test.js.map