import { ExecutionLogSlicer } from '../log-slicer';
import { DataflowAnalyzer } from '..';
import { expect } from 'chai';
import { TestCell } from './testcell';
function loc(line0, col0, line1, col1) {
    if (line1 === void 0) { line1 = line0 + 1; }
    if (col1 === void 0) { col1 = 0; }
    return { first_line: line0, first_column: col0, last_line: line1, last_column: col1 };
}
function makeLog(lines) {
    var cells = lines.map(function (text, i) { return new TestCell(text, i + 1); });
    var logSlicer = new ExecutionLogSlicer(new DataflowAnalyzer());
    cells.forEach(function (cell) { return logSlicer.logExecution(cell); });
    return logSlicer;
}
describe('log-slicer', function () {
    it('does the basics', function () {
        var lines = ['x=5', 'y=6', 'print(x+y)'];
        var logSlicer = makeLog(lines);
        var lastCell = logSlicer.cellExecutions[logSlicer.cellExecutions.length - 1].cell;
        var slices = logSlicer.sliceAllExecutions(lastCell.persistentId);
        expect(slices).to.exist;
        expect(slices.length).eq(1);
        var slice = slices[0];
        expect(slice).to.exist;
        expect(slice.cellSlices).to.exist;
        expect(slice.cellSlices.length).eq(3);
        slice.cellSlices.forEach(function (cs, i) {
            expect(cs).to.exist;
            expect(cs.textSliceLines).eq(lines[i]);
            expect(cs.textSlice).eq(lines[i]);
        });
    });
    it("does jim's demo", function () {
        var lines = [
            /*[1]*/ "import pandas as pd",
            /*[2]*/ "Cars = {'Brand': ['Honda Civic','Toyota Corolla','Ford Focus','Audi A4'], 'Price': [22000,25000,27000,35000]}\n" +
                "df = pd.DataFrame(Cars,columns= ['Brand', 'Price'])",
            /*[3]*/ "def check(df, size=11):\n" +
                "    print(df)",
            /*[4]*/ "print(df)",
            /*[5]*/ "x = df['Brand'].values"
        ];
        var logSlicer = makeLog(lines);
        var lastCell = logSlicer.cellExecutions[logSlicer.cellExecutions.length - 1].cell;
        var slice = logSlicer.sliceLatestExecution(lastCell.persistentId);
        expect(slice).to.exist;
        expect(slice.cellSlices).to.exist;
        [1, 2, 5].forEach(function (c, i) { return expect(slice.cellSlices[i].textSlice).eq(lines[c - 1]); });
        var cellCounts = slice.cellSlices.map(function (cell) { return cell.cell.executionCount; });
        [3, 4].forEach(function (c) { return expect(cellCounts).to.not.include(c); });
    });
    describe("getDependentCells", function () {
        it("handles simple in-order", function () {
            var lines = [
                "x = 3",
                "y = x+1"
            ];
            var logSlicer = makeLog(lines);
            var deps = logSlicer.getDependentCells(logSlicer.cellExecutions[0].cell.executionEventId);
            expect(deps).to.exist;
            expect(deps).to.have.length(1);
            expect(deps[0].text).to.equal(lines[1]);
        });
        it("handles variable redefinition", function () {
            var lines = [
                "x = 3",
                "y = x+1",
                "x = 4",
                "y = x*2",
            ];
            var logSlicer = makeLog(lines);
            var deps = logSlicer.getDependentCells(logSlicer.cellExecutions[0].cell.executionEventId);
            expect(deps).to.exist;
            expect(deps).to.have.length(1);
            expect(deps[0].text).to.equal(lines[1]);
            var deps2 = logSlicer.getDependentCells(logSlicer.cellExecutions[2].cell.executionEventId);
            expect(deps2).to.exist;
            expect(deps2).to.have.length(1);
            expect(deps2[0].text).to.equal(lines[3]);
        });
        it("handles no deps", function () {
            var lines = [
                "x = 3\nprint(x)",
                "y = 2\nprint(y)",
            ];
            var logSlicer = makeLog(lines);
            var deps = logSlicer.getDependentCells(logSlicer.cellExecutions[0].cell.executionEventId);
            expect(deps).to.exist;
            expect(deps).to.have.length(0);
        });
        it("works transitively", function () {
            var lines = [
                "x = 3",
                "y = x+1",
                "z = y-1"
            ];
            var logSlicer = makeLog(lines);
            var deps = logSlicer.getDependentCells(logSlicer.cellExecutions[0].cell.executionEventId);
            expect(deps).to.exist;
            expect(deps).to.have.length(2);
            var deplines = deps.map(function (d) { return d.text; });
            expect(deplines).includes(lines[1]);
            expect(deplines).includes(lines[2]);
        });
        it("includes all defs within cells", function () {
            var lines = [
                "x = 3\nq = 2",
                "y = x+1",
                "z = q-1"
            ];
            var logSlicer = makeLog(lines);
            var deps = logSlicer.getDependentCells(logSlicer.cellExecutions[0].cell.executionEventId);
            expect(deps).to.exist;
            expect(deps).to.have.length(2);
            var deplines = deps.map(function (d) { return d.text; });
            expect(deplines).includes(lines[1]);
            expect(deplines).includes(lines[2]);
        });
        it("handles cell re-execution", function () {
            var lines = [
                ["0", "x = 2\nprint(x)"],
                ["1", "y = x+1\nprint(y)"],
                ["2", "q = 2"],
                ["0", "x = 20\nprint(x)"]
            ];
            var cells = lines.map(function (_a, i) {
                var pid = _a[0], text = _a[1];
                return new TestCell(text, i + 1, undefined, pid);
            });
            var logSlicer = new ExecutionLogSlicer(new DataflowAnalyzer());
            cells.forEach(function (cell) { return logSlicer.logExecution(cell); });
            var rerunFirst = logSlicer.cellExecutions[3].cell.executionEventId;
            var deps = logSlicer.getDependentCells(rerunFirst);
            expect(deps).to.exist;
            expect(deps).to.have.length(1);
            expect(deps[0].text).equals(lines[1][1]);
        });
        it("handles cell re-execution no-op", function () {
            var lines = [
                ["0", "x = 2\nprint(x)"],
                ["1", "y = 3\nprint(y)"],
                ["2", "q = 2"],
                ["0", "x = 20\nprint(x)"],
            ];
            var cells = lines.map(function (_a, i) {
                var pid = _a[0], text = _a[1];
                return new TestCell(text, i + 1, undefined, pid);
            });
            var logSlicer = new ExecutionLogSlicer(new DataflowAnalyzer());
            cells.forEach(function (cell) { return logSlicer.logExecution(cell); });
            var deps = logSlicer.getDependentCells(logSlicer.cellExecutions[3].cell.executionEventId);
            expect(deps).to.exist;
            expect(deps).to.have.length(0);
        });
        it("return result in topo order", function () {
            var lines = [
                ["0", "x = 1"],
                ["0", "y = 2*x"],
                ["0", "z = x*y"],
                ["0", "x = 2"],
                ["1", "y = x*2"],
                ["2", "z = y*x"],
                ["0", "x = 3"],
            ];
            var cells = lines.map(function (_a, i) {
                var pid = _a[0], text = _a[1];
                return new TestCell(text, i + 1, undefined, pid);
            });
            var logSlicer = new ExecutionLogSlicer(new DataflowAnalyzer());
            cells.forEach(function (cell) { return logSlicer.logExecution(cell); });
            var lastEvent = logSlicer.cellExecutions[logSlicer.cellExecutions.length - 1].cell.executionEventId;
            var deps = logSlicer.getDependentCells(lastEvent);
            expect(deps).to.exist;
            expect(deps).to.have.length(2);
            expect(deps[0].text).equals('y = x*2');
            expect(deps[1].text).equals('z = y*x');
        });
        it("can be called multiple times", function () {
            var lines = [
                ["0", "x = 1"],
                ["1", "y = 2*x"],
                ["2", "z = x*y"],
            ];
            var cells = lines.map(function (_a, i) {
                var pid = _a[0], text = _a[1];
                return new TestCell(text, i + 1, undefined, pid);
            });
            var logSlicer = new ExecutionLogSlicer(new DataflowAnalyzer());
            cells.forEach(function (cell) { return logSlicer.logExecution(cell); });
            var deps = logSlicer.getDependentCells(logSlicer.cellExecutions[0].cell.executionEventId);
            expect(deps).to.exist;
            expect(deps).to.have.length(2);
            expect(deps[0].text).equals('y = 2*x');
            expect(deps[1].text).equals('z = x*y');
            var edits = [
                ["0", "x = 2"],
                ["1", "y = x*2"],
                ["2", "z = y*x"],
                ["0", "x = 3"],
            ];
            var cellEdits = edits.map(function (_a, i) {
                var pid = _a[0], text = _a[1];
                return new TestCell(text, i + 1, undefined, pid);
            });
            cellEdits.forEach(function (cell) { return logSlicer.logExecution(cell); });
            var lastEvent = logSlicer.cellExecutions[logSlicer.cellExecutions.length - 1].cell.executionEventId;
            var deps2 = logSlicer.getDependentCells(lastEvent);
            expect(deps2).to.exist;
            expect(deps2).to.have.length(2);
            expect(deps2[0].text).equals('y = x*2');
            expect(deps2[1].text).equals('z = y*x');
        });
        it("handles api calls", function () {
            var lines = [
                ["0", "from matplotlib.pyplot import scatter\nfrom sklearn.cluster import KMeans\nfrom sklearn import datasets"],
                ["1", "data = datasets.load_iris().data[:,2:4]\npetal_length, petal_width = data[:,1], data[:,0]"],
                ["2", "k=3"],
                ["3", "clusters = KMeans(n_clusters=k).fit(data).labels_"],
                ["4", "scatter(petal_length, petal_width, c=clusters)"],
                ["2", "k=4"],
            ];
            var cells = lines.map(function (_a, i) {
                var pid = _a[0], text = _a[1];
                return new TestCell(text, i + 1, undefined, pid);
            });
            var logSlicer = new ExecutionLogSlicer(new DataflowAnalyzer());
            cells.forEach(function (cell) { return logSlicer.logExecution(cell); });
            var lastEvent = logSlicer.cellExecutions[logSlicer.cellExecutions.length - 1].cell.executionEventId;
            var deps = logSlicer.getDependentCells(lastEvent);
            expect(deps).to.exist;
            expect(deps).to.have.length(2);
            var sliceText = deps.map(function (c) { return c.text; });
            expect(sliceText).to.include(lines[3][1]);
            expect(sliceText).to.include(lines[4][1]);
        });
    });
});
//# sourceMappingURL=log-slicer.test.js.map