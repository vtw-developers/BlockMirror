import { expect } from 'chai';
import { LocationSet } from '../slice';
import { CellSlice } from '../cellslice';
import { TestCell } from './testcell';
describe('CellSlice', function () {
    it('yields a text slice based on a set of locations', function () {
        var cellSlice = new CellSlice(new TestCell(['a = 1', 'b = 2', 'c = 3', 'd = 4', ''].join('\n'), 1), new LocationSet({ first_line: 1, first_column: 0, last_line: 1, last_column: 5 }, { first_line: 2, first_column: 4, last_line: 3, last_column: 4 }));
        expect(cellSlice.textSlice).to.equal(['a = 1', '2', 'c = '].join('\n'));
    });
    it('yields entire lines if requested', function () {
        var cellSlice = new CellSlice(new TestCell(['a = 1', 'b = 2', 'c = 3', 'd = 4', ''].join('\n'), 1), new LocationSet({ first_line: 1, first_column: 0, last_line: 1, last_column: 5 }, { first_line: 2, first_column: 4, last_line: 3, last_column: 4 }));
        expect(cellSlice.textSliceLines).to.equal(['a = 1', 'b = 2', 'c = 3'].join('\n'));
    });
});
//# sourceMappingURL=cellslice.test.js.map