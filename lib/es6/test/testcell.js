var TestCell = /** @class */ (function () {
    function TestCell(text, executionCount, executionEventId, persistentId, hasError) {
        if (hasError === void 0) { hasError = false; }
        this.text = text;
        this.executionCount = executionCount;
        this.hasError = hasError;
        this.executionEventId = executionEventId || genid();
        this.persistentId = persistentId || genid();
    }
    TestCell.prototype.deepCopy = function () { return this; }; // not used for testing
    return TestCell;
}());
export { TestCell };
var ID = 0;
function genid() {
    return 'id' + (ID++);
}
//# sourceMappingURL=testcell.js.map