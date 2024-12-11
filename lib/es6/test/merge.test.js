import { expect } from 'chai';
import { SlicedExecution } from '../log-slicer';
import { LocationSet } from '../slice';
import { CellSlice } from '../cellslice';
import { TestCell } from './testcell';
describe('SlicedExecution', function () {
    function cell(executionEventId, text, executionCount, id) {
        if (executionCount === undefined)
            executionCount = 1;
        return new TestCell(text, executionCount, executionEventId, id);
    }
    function cellSlice(cell, slice) {
        return new CellSlice(cell, slice);
    }
    function location(first_line, first_column, last_line, last_column) {
        return {
            first_line: first_line,
            first_column: first_column,
            last_line: last_line,
            last_column: last_column,
        };
    }
    function slicedExecution() {
        var cellSlices = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            cellSlices[_i] = arguments[_i];
        }
        return new SlicedExecution(new Date(), cellSlices);
    }
    describe('merge', function () {
        it('unions slices with different cells', function () {
            var slice1 = slicedExecution(cellSlice(cell('1', 'a = 1', 1), new LocationSet(location(1, 0, 1, 5))));
            var slice2 = slicedExecution(cellSlice(cell('2', 'b = 2', 2), new LocationSet(location(1, 0, 1, 5))));
            var merged = slice1.merge(slice2);
            expect(merged.cellSlices[0].cell.executionEventId).to.equal('1');
            expect(merged.cellSlices[1].cell.executionEventId).to.equal('2');
        });
        it('will not include the same locations from the same cell twice', function () {
            var slice1 = slicedExecution(cellSlice(cell('1', 'a = 1'), new LocationSet(location(1, 0, 1, 5))));
            var slice2 = slicedExecution(cellSlice(cell('1', 'a = 1'), new LocationSet(location(1, 0, 1, 5))));
            var merged = slice1.merge(slice2);
            expect(merged.cellSlices.length).to.equal(1);
            expect(merged.cellSlices[0].slice.size).to.equal(1);
        });
        it('considers two cells sharing ID and execution count but differing in execution event ' +
            'ID to be different', function () {
            var slice1 = slicedExecution(cellSlice(cell('1', 'a = 1', 1, 'id1'), new LocationSet(location(1, 0, 1, 5))));
            var slice2 = slicedExecution(cellSlice(cell('2', 'a = 1', 1, 'id1'), new LocationSet(location(1, 0, 1, 5))));
            var merged = slice1.merge(slice2);
            expect(merged.cellSlices.length).to.equal(2);
        });
        it('will include complementary ranges from two slices of the same cell', function () {
            var slice1 = slicedExecution(cellSlice(cell('1', 'a = 1'), new LocationSet(location(1, 0, 1, 5))));
            var slice2 = slicedExecution(cellSlice(cell('1', 'a = 1'), new LocationSet(location(1, 0, 1, 4))));
            var merged = slice1.merge(slice2);
            expect(merged.cellSlices.length).to.equal(1);
            expect(merged.cellSlices[0].slice.size).to.equal(2);
            expect(merged.cellSlices[0].slice.items).to.deep.include(location(1, 0, 1, 5));
            expect(merged.cellSlices[0].slice.items).to.deep.include(location(1, 0, 1, 4));
        });
        it('reorders the cells in execution order', function () {
            var slice1 = slicedExecution(cellSlice(cell('2', 'a = 1', 2), new LocationSet(location(1, 0, 1, 5))));
            var slice2 = slicedExecution(cellSlice(cell('1', 'a = 1', 1), new LocationSet(location(1, 0, 1, 4))));
            var merged = slice1.merge(slice2);
            expect(merged.cellSlices[0].cell.executionCount).to.equal(1);
            expect(merged.cellSlices[1].cell.executionCount).to.equal(2);
        });
        it('can do an n-way merge with a bunch of cells', function () {
            var slice1 = slicedExecution(cellSlice(cell('1', 'a = 1'), new LocationSet(location(1, 0, 1, 5))), cellSlice(cell('2', 'b = 1'), new LocationSet(location(1, 0, 1, 5))));
            var slice2 = slicedExecution(cellSlice(cell('3', 'c = 1'), new LocationSet(location(1, 0, 1, 5))), cellSlice(cell('4', 'd = 1'), new LocationSet(location(1, 0, 1, 5))));
            var slice3 = slicedExecution(cellSlice(cell('5', 'e = 1'), new LocationSet(location(1, 0, 1, 5))), cellSlice(cell('6', 'f = 1'), new LocationSet(location(1, 0, 1, 5))));
            var merged = slice1.merge(slice2, slice3);
            expect(merged.cellSlices.length).to.equal(6);
        });
    });
});
//# sourceMappingURL=merge.test.js.map